# Auth & Pairing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将登录和配对解耦——登录改为手机号+密码，配对码简化为 4 位数字，未配对用户可直接进入 App 并在首页完成配对。

**Architecture:** `auth.ts` 新增 password 字段，`generateCode` 改为 4 位数字；`App.tsx` 去掉强跳 CoupleCodeScreen 逻辑；`HomeScreen` 增加未配对时的配对卡片；`CoupleCodeScreen` 删除。登录/注册屏幕只改输入框字段。

**Tech Stack:** React Native, TypeScript, 腾讯云 CloudBase JS SDK, AsyncStorage (via AuthContext)

---

### Task 1: 更新 auth.ts — 密码登录 + 4 位配对码

**Files:**
- Modify: `src/services/auth.ts`

- [ ] **Step 1: 完整替换 `src/services/auth.ts`**

```typescript
// src/services/auth.ts
import { db, authReady } from '../config/cloudbase';

function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function register(
  phone: string,
  password: string,
  gender: 'male' | 'female',
): Promise<{ userId: string; coupleCode: string }> {
  await authReady;

  const existing = await db.collection('users').where({ phone }).get();
  if (((existing.data as any[]) ?? []).length > 0) throw new Error('该手机号已注册，请直接登录');

  const code = generateCode();

  const coupleResult: any = await db.collection('couples').add({
    code, status: 'pending', user1: '', user2: '', startDate: Date.now(),
  });
  const coupleId: string = coupleResult.docId ?? coupleResult.id ?? coupleResult._id;

  const userResult: any = await db.collection('users').add({
    phone, password, nickname: '', avatarUrl: '', coupleId: '', code, gender, createdAt: Date.now(),
  });
  const userId: string = userResult.docId ?? userResult.id ?? userResult._id;

  await db.collection('couples').doc(coupleId).update({ user1: userId });

  return { userId, coupleCode: code };
}

export async function login(
  phone: string,
  password: string,
): Promise<{ userId: string; coupleId: string; gender: 'male' | 'female' }> {
  await authReady;

  const res = await db.collection('users').where({ phone }).get();
  const users = (res.data as any[]) ?? [];
  if (users.length === 0) throw new Error('手机号未注册');

  const user = users[0];
  if (!user.password) throw new Error('账号数据异常，请重新注册');
  if (user.password !== password) throw new Error('密码错误');

  return { userId: user._id, coupleId: user.coupleId ?? '', gender: user.gender ?? 'male' };
}

export async function unbindCouple(userId: string, coupleId: string): Promise<void> {
  await authReady;

  const res: any = await db.collection('couples').doc(coupleId).get();
  const coupleData = (res.data as any[])?.[0];
  if (coupleData) {
    if (coupleData.user1 === userId) {
      await db.collection('couples').doc(coupleId).update({ user1: '', status: 'pending' });
    } else {
      await db.collection('couples').doc(coupleId).update({ user2: '', status: 'pending' });
    }
  }

  const newCode = generateCode();
  const newCoupleResult: any = await db.collection('couples').add({
    code: newCode, status: 'pending', user1: userId, user2: '', startDate: Date.now(),
  });
  const newCoupleId: string = newCoupleResult.docId ?? newCoupleResult.id ?? newCoupleResult._id;

  await db.collection('users').doc(userId).update({ coupleId: newCoupleId, code: newCode });
}

export async function pairCouple(myUserId: string, partnerCode: string): Promise<string> {
  await authReady;

  const res = await db.collection('couples').where({ code: partnerCode, status: 'pending' }).get();
  const couples = (res.data as any[]) ?? [];
  if (couples.length === 0) throw new Error('配对码无效或已使用');

  const coupleDoc = couples[0];
  if (coupleDoc.user1 === myUserId) throw new Error('不能和自己配对');

  const coupleId = coupleDoc._id;
  await db.collection('couples').doc(coupleId).update({ user2: myUserId, status: 'active' });
  await db.collection('users').doc(myUserId).update({ coupleId });
  return coupleId;
}
```

> 关键变更：
> - `generateCode()` 改为 4 位数字（1000–9999）
> - `register()` 新增 `password` 参数，注册时 `coupleId` 初始存为空字符串 `''`（配对后再更新）
> - `login()` 改用 `password` 验证，旧账号无 password 字段时报错提示重新注册
> - `pairCouple()` 错误提示文字微调（「情侣码」→「配对码」）

- [ ] **Step 2: 提交**

```bash
git add src/services/auth.ts
git commit -m "feat: auth — password login, 4-digit pairing code"
```

---

### Task 2: 更新 RegisterScreen — 新增密码输入框

**Files:**
- Modify: `src/screens/auth/RegisterScreen.tsx`

- [ ] **Step 1: 完整替换 `src/screens/auth/RegisterScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../../theme';
import { register } from '../../services/auth';
import { useAuth } from '../../store/AuthContext';

export function RegisterScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();

  async function handleRegister() {
    if (phone.length < 11) return Alert.alert('请输入正确的手机号');
    if (password.length < 6) return Alert.alert('密码至少 6 位');
    setLoading(true);
    try {
      const { userId, coupleCode } = await register(phone, password, gender);
      // 注册后直接进入主页（coupleId 为空，首页显示配对卡片）
      setAuth(userId, '', gender);
    } catch (e: any) {
      Alert.alert('注册失败', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>创建账号</Text>

      <Text style={styles.label}>我是</Text>
      <View style={styles.genderRow}>
        <TouchableOpacity
          style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
          onPress={() => setGender('male')}
        >
          <Text style={styles.genderEmoji}>👦</Text>
          <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>男生</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderBtn, gender === 'female' && styles.genderBtnActiveFemale]}
          onPress={() => setGender('female')}
        >
          <Text style={styles.genderEmoji}>👧</Text>
          <Text style={[styles.genderText, gender === 'female' && styles.genderTextActiveFemale]}>女生</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>手机号</Text>
      <TextInput
        style={styles.input}
        placeholder="手机号"
        placeholderTextColor={colors.whiteSecondary}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={11}
      />

      <Text style={styles.label}>密码</Text>
      <TextInput
        style={styles.input}
        placeholder="密码（至少 6 位）"
        placeholderTextColor={colors.whiteSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        maxLength={20}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>注册</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.replace('Login')}>
        <Text style={styles.link}>已有账号？去登录</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: colors.white, marginBottom: spacing.lg },
  label: { fontSize: 13, color: colors.whiteSecondary, marginBottom: spacing.sm },

  genderRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.lg },
  genderBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.whiteBorder,
    backgroundColor: colors.whiteDim, gap: 4,
  },
  genderBtnActive: {
    borderColor: colors.greenBorder, backgroundColor: colors.greenDim,
  },
  genderBtnActiveFemale: {
    borderColor: '#f9a8d4', backgroundColor: 'rgba(249,168,212,0.12)',
  },
  genderEmoji: { fontSize: 28 },
  genderText: { fontSize: 15, color: colors.whiteSecondary, fontWeight: '600' },
  genderTextActive: { color: colors.green },
  genderTextActiveFemale: { color: '#f9a8d4' },

  input: {
    backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder,
    borderRadius: 12, padding: spacing.md, color: colors.white, fontSize: 16, marginBottom: spacing.md,
  },
  button: { backgroundColor: colors.green, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  buttonText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  link: { color: colors.whiteSecondary, textAlign: 'center', marginTop: spacing.sm },
});
```

- [ ] **Step 2: 提交**

```bash
git add src/screens/auth/RegisterScreen.tsx
git commit -m "feat: register — add password field, enter app unpaired"
```

---

### Task 3: 更新 LoginScreen — 情侣码改为密码

**Files:**
- Modify: `src/screens/auth/LoginScreen.tsx`

- [ ] **Step 1: 完整替换 `src/screens/auth/LoginScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../../theme';
import { login } from '../../services/auth';
import { useAuth } from '../../store/AuthContext';

export function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();

  async function handleLogin() {
    if (!phone || !password) return Alert.alert('请填写手机号和密码');
    setLoading(true);
    try {
      const { userId, coupleId, gender } = await login(phone, password);
      setAuth(userId, coupleId, gender);
    } catch (e: any) {
      Alert.alert('登录失败', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>欢迎回来</Text>
      <TextInput
        style={styles.input}
        placeholder="手机号"
        placeholderTextColor={colors.whiteSecondary}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={11}
      />
      <TextInput
        style={styles.input}
        placeholder="密码"
        placeholderTextColor={colors.whiteSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        maxLength={20}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>登录</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>没有账号？去注册</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: colors.white, marginBottom: spacing.lg },
  input: { backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder, borderRadius: 12, padding: spacing.md, color: colors.white, fontSize: 16, marginBottom: spacing.md },
  button: { backgroundColor: colors.green, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  buttonText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  link: { color: colors.whiteSecondary, textAlign: 'center', marginTop: spacing.sm },
});
```

- [ ] **Step 2: 提交**

```bash
git add src/screens/auth/LoginScreen.tsx
git commit -m "feat: login — replace couple code with password"
```

---

### Task 4: 更新 App.tsx — 移除强跳 CoupleCodeScreen，删除其导入

**Files:**
- Modify: `App.tsx`
- Delete: `src/screens/auth/CoupleCodeScreen.tsx`

- [ ] **Step 1: 完整替换 `App.tsx`**

```typescript
// App.tsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { LetterScreen } from './src/screens/LetterScreen';
import { MomentsScreen } from './src/screens/MomentsScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { BottomTabBar } from './src/components/BottomTabBar';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Album" component={AlbumScreen} />
      <Tab.Screen name="Letter" component={LetterScreen} />
      <Tab.Screen name="Moments" component={MomentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { userId, loading } = useAuth();

  return (
    <NavigationContainer>
      {loading ? (
        <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.green} size="large" />
        </View>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {userId ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: 删除 CoupleCodeScreen**

```bash
rm src/screens/auth/CoupleCodeScreen.tsx
```

- [ ] **Step 3: 提交**

```bash
git add App.tsx
git rm src/screens/auth/CoupleCodeScreen.tsx
git commit -m "feat: nav — userId alone enters MainTabs, remove CoupleCodeScreen"
```

---

### Task 5: 更新 HomeScreen — 未配对状态显示配对卡片

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

配对卡片在 `coupleId` 为空时替代正常内容，完成配对后自动消失。

- [ ] **Step 1: 在现有 import 中追加 `* as Clipboard`**

在文件顶部 import 区域，找到：
```typescript
import { db } from '../config/cloudbase';
```
在其后追加：
```typescript
import * as Clipboard from 'expo-clipboard';
import { pairCouple } from '../services/auth';
```

- [ ] **Step 2: 在 `HomeScreen` 函数体内追加配对相关 state**

紧接在 `const { userId, coupleId } = useAuth();` 一行后追加：

```typescript
  const { userId, coupleId, gender, setAuth } = useAuth();
  const [myCode, setMyCode] = useState('');
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [pairLoading, setPairLoading] = useState(false);
```

> 注意：原有的 `const { userId, coupleId } = useAuth();` 那行需要替换成上面这行（加入 `gender` 和 `setAuth`）。

- [ ] **Step 3: 在 `HomeScreen` 函数体内追加：拉取自己配对码 + 配对 handler**

紧接在 Step 2 添加的 state 之后追加：

```typescript
  useEffect(() => {
    if (coupleId || !userId) return;
    db.collection('users').doc(userId).get().then((res: any) => {
      const user = (res.data as any[])?.[0];
      if (user?.code) setMyCode(user.code);
    });
  }, [coupleId, userId]);

  async function handlePair() {
    if (partnerCodeInput.length < 4 || !userId) return;
    setPairLoading(true);
    try {
      const newCoupleId = await pairCouple(userId, partnerCodeInput);
      setAuth(userId, newCoupleId, gender ?? 'male');
    } catch (e: any) {
      Alert.alert('配对失败', e.message);
    } finally {
      setPairLoading(false);
    }
  }
```

- [ ] **Step 4: 在 return 的 `<ScrollView>` 内，`{/* ── Hero Section ── */}` 之前插入配对卡片**

找到：
```tsx
        {/* ── Hero Section ── */}
```
在其正上方插入：

```tsx
        {/* ── Pairing Card (shown when not yet paired) ── */}
        {!coupleId && (
          <View style={styles.pairCard}>
            <Text style={styles.pairTitle}>💑 还未配对</Text>

            <Text style={styles.pairLabel}>你的配对码</Text>
            <TouchableOpacity
              style={styles.pairCodeBox}
              onPress={async () => {
                await Clipboard.setStringAsync(myCode);
                Alert.alert('已复制');
              }}
            >
              <Text style={styles.pairCode}>
                {myCode ? myCode.split('').join('  ') : '—'}
              </Text>
              <Text style={styles.pairCopyHint}>点击复制</Text>
            </TouchableOpacity>

            <Text style={styles.pairLabel}>输入对方的 4 位配对码</Text>
            <View style={styles.pairInputRow}>
              <TextInput
                style={styles.pairInput}
                placeholder="_ _ _ _"
                placeholderTextColor={colors.whiteSecondary}
                value={partnerCodeInput}
                onChangeText={setPartnerCodeInput}
                keyboardType="number-pad"
                maxLength={4}
              />
              <TouchableOpacity style={styles.pairBtn} onPress={handlePair} disabled={pairLoading}>
                {pairLoading
                  ? <ActivityIndicator color={colors.bg} size="small" />
                  : <Text style={styles.pairBtnText}>配对</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
```

- [ ] **Step 5: 追加配对卡片样式到 StyleSheet**

在 `styles` 对象最后一个属性（`wishText`）之后、`});` 结束括号之前追加：

```typescript
  // ── Pairing card ──
  pairCard: {
    margin: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.bgLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    padding: spacing.lg,
    gap: 4,
  },
  pairTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.md,
  },
  pairLabel: {
    fontSize: 12,
    color: colors.whiteSecondary,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  pairCodeBox: {
    backgroundColor: colors.greenDim,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pairCode: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.green,
    letterSpacing: 4,
  },
  pairCopyHint: {
    fontSize: 11,
    color: colors.whiteSecondary,
    marginTop: 4,
  },
  pairInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  pairInput: {
    flex: 1,
    backgroundColor: colors.whiteDim,
    borderWidth: 1,
    borderColor: colors.whiteBorder,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 6,
  },
  pairBtn: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    height: 52,
  },
  pairBtnText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 16,
  },
```

- [ ] **Step 6: 提交**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: home — show pairing card when coupleId is empty"
```

---

### Task 6: 手动验证

- [ ] 启动 App：`npx expo start`
- [ ] 注册新账号，确认输入手机号 + 密码 + 性别后直接进入主页（不再跳配对码页）
- [ ] 确认首页显示「💑 还未配对」配对卡片，自己的 4 位数字码可见可复制
- [ ] 另一台设备（或模拟器）注册另一个账号，互填对方 4 位码，确认配对成功、卡片消失、正常首页渲染
- [ ] 退出登录后重新登录（手机号 + 密码），确认 coupleId 已恢复、正常进入主页
- [ ] 登录旧账号（若有），确认提示「账号数据异常，请重新注册」

- [ ] **最终提交（如有遗漏改动）**

```bash
git add -A
git commit -m "feat: auth & pairing redesign complete"
```
