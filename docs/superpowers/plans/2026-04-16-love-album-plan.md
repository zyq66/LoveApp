# 恋爱纪念册 App 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 React Native + Expo + Firestore 构建情侣纪念册 App，MVP 先跑通登录/配对/首页，打包 APK 装机验证后再迭代。

**Architecture:** 手机号注册直接写 Firestore，情侣码同时用于配对和登录验证。Expo Managed Workflow，状态用 React Context 管理，导航用 React Navigation。

**Tech Stack:** React Native, Expo SDK, Firebase Firestore, Firebase Storage, react-native-amap3d, Expo EAS Build, React Navigation v6, TypeScript

**Repo:** `/Users/edy/Desktop/LoveApp`

---

## 文件结构

```
love-album/
├── app.json
├── eas.json
├── App.tsx
├── src/
│   ├── config/firebase.ts
│   ├── store/AuthContext.tsx
│   ├── theme.ts
│   ├── screens/
│   │   ├── auth/RegisterScreen.tsx
│   │   ├── auth/LoginScreen.tsx
│   │   ├── auth/CoupleCodeScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── AlbumScreen.tsx
│   │   ├── LetterScreen.tsx
│   │   ├── MapScreen.tsx
│   │   └── MoreScreen.tsx
│   ├── components/
│   │   ├── BottomTabBar.tsx
│   │   ├── AnniversaryTag.tsx
│   │   ├── PhotoGrid.tsx
│   │   ├── PhotoTimeline.tsx
│   │   └── MapMarker.tsx
│   └── services/
│       ├── auth.ts
│       ├── album.ts
│       ├── letters.ts
│       ├── places.ts
│       └── anniversaries.ts
```

---

### Task 1: 初始化项目 + Firebase 连接 + 主题

**Files:**
- Create: `app.json` (by expo init)
- Create: `src/config/firebase.ts`
- Create: `src/theme.ts`

- [ ] 在 `/Users/edy/Desktop/LoveApp` 初始化 Expo 项目

```bash
cd /Users/edy/Desktop/LoveApp
npx create-expo-app . --template blank-typescript
```

- [ ] 安装所有依赖

```bash
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install firebase
npx expo install expo-image-picker expo-notifications
npm install nanoid
```

- [ ] 在 Firebase 控制台创建项目，启用 Firestore 和 Storage，将配置写入 `src/config/firebase.ts`

```typescript
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

- [ ] 写 `src/theme.ts`

```typescript
// src/theme.ts
export const colors = {
  bg: '#1a1a2e',
  bgLight: '#16213e',
  green: '#4ade80',
  greenDim: 'rgba(74,222,128,0.12)',
  greenBorder: 'rgba(74,222,128,0.3)',
  white: '#ffffff',
  whiteSecondary: 'rgba(255,255,255,0.4)',
  whiteDim: 'rgba(255,255,255,0.07)',
  whiteBorder: 'rgba(255,255,255,0.12)',
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
};
```

- [ ] 启动验证无报错

```bash
npx expo start
```

- [ ] Commit

```bash
git add .
git commit -m "feat: init expo project + firebase config + theme"
```

---

### Task 2: Auth Context + 注册/登录/配对 Service

**Files:**
- Create: `src/store/AuthContext.tsx`
- Create: `src/services/auth.ts`

- [ ] 写 `src/services/auth.ts`

```typescript
// src/services/auth.ts
import { db } from '../config/firebase';
import {
  collection, doc, setDoc, getDocs, getDoc,
  query, where, updateDoc
} from 'firebase/firestore';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function register(phone: string): Promise<{ userId: string; coupleCode: string }> {
  const q = query(collection(db, 'users'), where('phone', '==', phone));
  const snap = await getDocs(q);
  if (!snap.empty) throw new Error('该手机号已注册，请直接登录');

  const userId = generateId();
  const coupleId = generateId();
  const code = generateCode();

  await setDoc(doc(db, 'users', userId), {
    phone, nickname: '', avatarUrl: '', coupleId, createdAt: Date.now(),
  });
  await setDoc(doc(db, 'couples', coupleId), {
    code, status: 'pending', user1: userId, user2: '', startDate: Date.now(),
  });
  return { userId, coupleCode: code };
}

export async function login(phone: string, code: string): Promise<{ userId: string; coupleId: string }> {
  const q = query(collection(db, 'users'), where('phone', '==', phone));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('手机号未注册');

  const userDoc = snap.docs[0];
  const { coupleId } = userDoc.data() as { coupleId: string };
  const coupleSnap = await getDoc(doc(db, 'couples', coupleId));

  if (!coupleSnap.exists()) throw new Error('账号数据异常');
  if (coupleSnap.data().code !== code) throw new Error('情侣码错误');

  return { userId: userDoc.id, coupleId };
}

export async function pairCouple(myUserId: string, partnerCode: string): Promise<string> {
  const q = query(
    collection(db, 'couples'),
    where('code', '==', partnerCode),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('情侣码无效或已使用');

  const coupleDoc = snap.docs[0];
  if (coupleDoc.data().user1 === myUserId) throw new Error('不能和自己配对');

  const coupleId = coupleDoc.id;
  await updateDoc(doc(db, 'couples', coupleId), { user2: myUserId, status: 'active' });
  await updateDoc(doc(db, 'users', myUserId), { coupleId });
  return coupleId;
}
```

- [ ] 写 `src/store/AuthContext.tsx`

```typescript
// src/store/AuthContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface AuthState {
  userId: string | null;
  coupleId: string | null;
  setAuth: (userId: string, coupleId: string) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);

  const setAuth = (uid: string, cid: string) => {
    setUserId(uid);
    setCoupleId(cid);
  };
  const clearAuth = () => {
    setUserId(null);
    setCoupleId(null);
  };

  return (
    <AuthContext.Provider value={{ userId, coupleId, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] Commit

```bash
git add src/services/auth.ts src/store/AuthContext.tsx
git commit -m "feat: auth service + context (register/login/pair)"
```

---

### Task 3: 注册/登录/情侣码 三个 Screen + 导航根节点

**Files:**
- Create: `src/screens/auth/RegisterScreen.tsx`
- Create: `src/screens/auth/LoginScreen.tsx`
- Create: `src/screens/auth/CoupleCodeScreen.tsx`
- Modify: `App.tsx`

- [ ] 写 `src/screens/auth/RegisterScreen.tsx`

```typescript
// src/screens/auth/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../../theme';
import { register } from '../../services/auth';

export function RegisterScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (phone.length < 11) return Alert.alert('请输入正确的手机号');
    setLoading(true);
    try {
      const { userId, coupleCode } = await register(phone);
      navigation.navigate('CoupleCode', { userId, coupleCode, isNew: true });
    } catch (e: any) {
      Alert.alert('注册失败', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>创建账号</Text>
      <TextInput
        style={styles.input}
        placeholder="手机号"
        placeholderTextColor={colors.whiteSecondary}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={11}
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>注册</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>已有账号？去登录</Text>
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

- [ ] 写 `src/screens/auth/LoginScreen.tsx`（手机号 + 情侣码两个输入框，调用 `login()`，成功后 `setAuth` 进主页）

```typescript
// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../../theme';
import { login } from '../../services/auth';
import { useAuth } from '../../store/AuthContext';

export function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();

  async function handleLogin() {
    if (!phone || !code) return Alert.alert('请填写手机号和情侣码');
    setLoading(true);
    try {
      const { userId, coupleId } = await login(phone, code.toUpperCase());
      setAuth(userId, coupleId);
    } catch (e: any) {
      Alert.alert('登录失败', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>欢迎回来</Text>
      <TextInput style={styles.input} placeholder="手机号" placeholderTextColor={colors.whiteSecondary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={11} />
      <TextInput style={styles.input} placeholder="情侣码" placeholderTextColor={colors.whiteSecondary} value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={6} />
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

- [ ] 写 `src/screens/auth/CoupleCodeScreen.tsx`（展示自己的码 + 输入对方的码，调用 `pairCouple()`）

```typescript
// src/screens/auth/CoupleCodeScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Clipboard, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../../theme';
import { pairCouple } from '../../services/auth';
import { useAuth } from '../../store/AuthContext';

export function CoupleCodeScreen({ route, navigation }: any) {
  const { userId, coupleCode, coupleId: existingCoupleId } = route.params;
  const [partnerCode, setPartnerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();

  async function handlePair() {
    if (partnerCode.length < 6) return Alert.alert('请输入对方的6位情侣码');
    setLoading(true);
    try {
      const newCoupleId = await pairCouple(userId, partnerCode.toUpperCase());
      setAuth(userId, newCoupleId);
    } catch (e: any) {
      Alert.alert('配对失败', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>情侣码配对</Text>
      <Text style={styles.label}>你的情侣码（发给对方）</Text>
      <TouchableOpacity style={styles.codeBox} onPress={() => { Clipboard.setString(coupleCode); Alert.alert('已复制'); }}>
        <Text style={styles.code}>{coupleCode}</Text>
        <Text style={styles.copyHint}>点击复制</Text>
      </TouchableOpacity>
      <Text style={styles.label}>输入对方的情侣码</Text>
      <TextInput style={styles.input} placeholder="6位情侣码" placeholderTextColor={colors.whiteSecondary} value={partnerCode} onChangeText={setPartnerCode} autoCapitalize="characters" maxLength={6} />
      <TouchableOpacity style={styles.button} onPress={handlePair} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>配对</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: colors.white, marginBottom: spacing.lg },
  label: { color: colors.whiteSecondary, marginBottom: spacing.sm },
  codeBox: { backgroundColor: colors.greenDim, borderWidth: 1, borderColor: colors.greenBorder, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginBottom: spacing.lg },
  code: { fontSize: 32, fontWeight: '700', color: colors.green, letterSpacing: 6 },
  copyHint: { fontSize: 11, color: colors.whiteSecondary, marginTop: 4 },
  input: { backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder, borderRadius: 12, padding: spacing.md, color: colors.white, fontSize: 16, marginBottom: spacing.md },
  button: { backgroundColor: colors.green, borderRadius: 12, padding: spacing.md, alignItems: 'center' },
  buttonText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
});
```

- [ ] 写 `App.tsx`（Auth Stack / Main Stack 根据 userId 切换）

```typescript
// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { CoupleCodeScreen } from './src/screens/auth/CoupleCodeScreen';
import { HomeScreen } from './src/screens/HomeScreen';

const Stack = createStackNavigator();

function RootNavigator() {
  const { userId } = useAuth();
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userId ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <>
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="CoupleCode" component={CoupleCodeScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
```

- [ ] 启动验证注册/登录/配对流程可走通

```bash
npx expo start
```

- [ ] Commit

```bash
git add .
git commit -m "feat: auth screens + navigation root"
```

---

### Task 4: 首页倒计时 + 纪念日

**Files:**
- Create: `src/services/anniversaries.ts`
- Create: `src/components/AnniversaryTag.tsx`
- Create: `src/screens/HomeScreen.tsx`

- [ ] 写 `src/services/anniversaries.ts`

```typescript
// src/services/anniversaries.ts
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

export interface Anniversary {
  id: string;
  name: string;
  date: number;
}

export async function getAnniversaries(coupleId: string): Promise<Anniversary[]> {
  const q = query(collection(db, `anniversaries/${coupleId}/items`), orderBy('date', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Anniversary));
}

export async function addAnniversary(coupleId: string, name: string, date: number): Promise<void> {
  await addDoc(collection(db, `anniversaries/${coupleId}/items`), { name, date, createdAt: Date.now() });
}

export async function deleteAnniversary(coupleId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, `anniversaries/${coupleId}/items/${itemId}`));
}
```

- [ ] 写 `src/components/AnniversaryTag.tsx`

```typescript
// src/components/AnniversaryTag.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  name: string;
  date: number; // timestamp ms，下一个周期的日期
}

export function AnniversaryTag({ name, date }: Props) {
  const daysLeft = Math.ceil((date - Date.now()) / 86400000);
  const soon = daysLeft >= 0 && daysLeft <= 7;

  return (
    <View style={[styles.tag, soon ? styles.green : styles.gray]}>
      <Text style={[styles.text, { color: soon ? colors.green : colors.whiteSecondary }]}>
        {name}
        {'  '}
        {daysLeft > 0 ? `${daysLeft} 天后` : daysLeft === 0 ? '就是今天 🎉' : `${Math.abs(daysLeft)} 天前`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginRight: 8, marginBottom: 8, borderWidth: 1 },
  green: { backgroundColor: colors.greenDim, borderColor: colors.greenBorder },
  gray: { backgroundColor: colors.whiteDim, borderColor: colors.whiteBorder },
  text: { fontSize: 12 },
});
```

- [ ] 写 `src/screens/HomeScreen.tsx`

```typescript
// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../store/AuthContext';
import { getAnniversaries, addAnniversary, deleteAnniversary, Anniversary } from '../services/anniversaries';
import { AnniversaryTag } from '../components/AnniversaryTag';
import { colors, spacing } from '../theme';
import { db } from '../config/firebase';
import { getDoc, doc } from 'firebase/firestore';

export function HomeScreen() {
  const { userId, coupleId } = useAuth();
  const [daysTogether, setDaysTogether] = useState(0);
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);

  useEffect(() => {
    if (!coupleId) return;
    // 获取在一起天数
    getDoc(doc(db, 'couples', coupleId)).then(snap => {
      if (snap.exists()) {
        const days = Math.floor((Date.now() - snap.data().startDate) / 86400000);
        setDaysTogether(days);
      }
    });
    // 获取纪念日
    getAnniversaries(coupleId).then(setAnniversaries);
  }, [coupleId]);

  function handleAddAnniversary() {
    Alert.prompt('添加纪念日', '输入名称（如：生日、第一次约会）', async (name) => {
      if (!name || !coupleId) return;
      // 简单示例：取今年该日期，实际可接入日期选择器
      await addAnniversary(coupleId, name, Date.now() + 86400000 * 30);
      const updated = await getAnniversaries(coupleId);
      setAnniversaries(updated);
    });
  }

  return (
    <View style={styles.container}>
      {/* 头像 + 心形 */}
      <View style={styles.avatarRow}>
        <View style={styles.avatar} />
        <Text style={styles.heart}>♥</Text>
        <View style={[styles.avatar, styles.avatarRight]} />
      </View>

      {/* 天数 */}
      <Text style={styles.days}>{daysTogether}</Text>
      <Text style={styles.daysLabel}>DAYS TOGETHER</Text>

      {/* 纪念日标签 */}
      <View style={styles.tags}>
        {anniversaries.map(a => (
          <AnniversaryTag key={a.id} name={a.name} date={a.date} />
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={handleAddAnniversary}>
          <Text style={styles.addBtnText}>＋ 添加纪念日</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#c084fc' },
  avatarRight: { backgroundColor: '#818cf8' },
  heart: { fontSize: 28, color: colors.green, textShadowColor: 'rgba(74,222,128,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  days: { fontSize: 72, fontWeight: '800', color: colors.white, letterSpacing: -2 },
  daysLabel: { fontSize: 11, color: colors.whiteSecondary, letterSpacing: 4, marginBottom: spacing.lg },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  addBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.whiteBorder, borderStyle: 'dashed' },
  addBtnText: { color: colors.whiteSecondary, fontSize: 12 },
});
```

- [ ] Commit

```bash
git add .
git commit -m "feat: home screen with countdown + anniversary tags"
```

---

### Task 5: 自定义底部导航 + EAS Build 打包

**Files:**
- Create: `src/components/BottomTabBar.tsx`
- Create: `eas.json`
- Modify: `App.tsx`

- [ ] 安装 bottom tabs

```bash
npx expo install @react-navigation/bottom-tabs
```

- [ ] 写 `src/components/BottomTabBar.tsx`

```typescript
// src/components/BottomTabBar.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

const TABS = [
  { key: 'Home', label: '首页', icon: '🏠' },
  { key: 'Album', label: '相册', icon: '📷' },
  { key: 'Letter', label: '情书', icon: '💌', fab: true },
  { key: 'Map', label: '足迹', icon: '🗺️' },
  { key: 'More', label: '更多', icon: '⋯' },
];

export function BottomTabBar({ state, navigation }: any) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        if (tab.fab) {
          return (
            <TouchableOpacity key={tab.key} style={styles.fabWrap} onPress={() => navigation.navigate(tab.key)}>
              <View style={styles.fab}>
                <Text style={styles.fabIcon}>{tab.icon}</Text>
              </View>
              <Text style={[styles.fabLabel, { color: colors.green }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity key={tab.key} style={styles.tab} onPress={() => navigation.navigate(tab.key)}>
            <Text style={[styles.icon, { opacity: focused ? 1 : 0.45 }]}>{tab.icon}</Text>
            <Text style={[styles.label, { color: focused ? colors.green : colors.whiteSecondary }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: 'rgba(10,10,20,0.97)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingBottom: 16, paddingTop: 8, alignItems: 'flex-end' },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  icon: { fontSize: 20 },
  label: { fontSize: 10 },
  fabWrap: { flex: 1, alignItems: 'center', marginTop: -18 },
  fab: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', shadowColor: colors.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  fabIcon: { fontSize: 22 },
  fabLabel: { fontSize: 10, marginTop: 4 },
});
```

- [ ] 在 `App.tsx` 将主导航改为 Bottom Tabs，使用 `tabBar` prop 注入 `BottomTabBar`，并添加占位 Screen（Album/Letter/Map/More 先用空 View）

- [ ] 写 `eas.json`

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    }
  }
}
```

- [ ] 安装 EAS CLI 并配置

```bash
npm install -g eas-cli
eas login
eas build:configure
```

- [ ] 打包 APK

```bash
eas build -p android --profile preview
```

- [ ] 下载 APK 安装到手机，验证登录/配对/首页流程 ✓

- [ ] Commit

```bash
git add .
git commit -m "feat: custom bottom tab bar + eas build config"
```

---

### Task 6: 共同相册

**Files:**
- Create: `src/services/album.ts`
- Create: `src/components/PhotoTimeline.tsx`
- Create: `src/components/PhotoGrid.tsx`
- Create: `src/screens/AlbumScreen.tsx`

- [ ] 写 `src/services/album.ts`

```typescript
// src/services/album.ts
import { db, storage } from '../config/firebase';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface Photo {
  id: string;
  url: string;
  caption: string;
  date: number;
  uploadedBy: string;
}

export async function uploadPhoto(coupleId: string, userId: string, uri: string, caption: string): Promise<void> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileName = `${coupleId}/${Date.now()}.jpg`;
  const storageRef = ref(storage, fileName);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  await addDoc(collection(db, `albums/${coupleId}/photos`), {
    url, caption, date: Date.now(), uploadedBy: userId,
  });
}

export function listenPhotos(coupleId: string, callback: (photos: Photo[]) => void) {
  const q = query(collection(db, `albums/${coupleId}/photos`), orderBy('date', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Photo)));
  });
}
```

- [ ] 写时间轴组件 `src/components/PhotoTimeline.tsx`（按月分组，绿点标最新，显示上传者）
- [ ] 写瀑布流组件 `src/components/PhotoGrid.tsx`（两列不等高，用 `FlatList` 双列实现）
- [ ] 写 `src/screens/AlbumScreen.tsx`（顶部切换按钮，右下角 `+` 调 `expo-image-picker` 上传）
- [ ] Commit

```bash
git commit -m "feat: shared album with timeline/grid toggle"
```

---

### Task 7: 足迹地图（高德）

**Files:**
- Create: `src/services/places.ts`
- Create: `src/components/MapMarker.tsx`
- Create: `src/screens/MapScreen.tsx`

- [ ] 安装高德地图

```bash
npx expo install react-native-amap3d
```

- [ ] 在[高德开放平台](https://lbs.amap.com/)注册并申请 Android API Key，添加到 `app.json`

```json
{
  "android": {
    "config": {
      "googleMaps": { "apiKey": "YOUR_AMAP_ANDROID_KEY" }
    }
  }
}
```

- [ ] 写 `src/services/places.ts`

```typescript
// src/services/places.ts
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  date: number;
  photoUrl: string;
  note: string;
  addedBy: string;
}

export async function getPlaces(coupleId: string): Promise<Place[]> {
  const q = query(collection(db, `places/${coupleId}/locations`), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Place));
}

export async function addPlace(coupleId: string, userId: string, data: Omit<Place, 'id' | 'addedBy'>): Promise<void> {
  await addDoc(collection(db, `places/${coupleId}/locations`), { ...data, addedBy: userId, date: Date.now() });
}

export async function deletePlace(coupleId: string, placeId: string): Promise<void> {
  await deleteDoc(doc(db, `places/${coupleId}/locations/${placeId}`));
}
```

- [ ] 写 `src/components/MapMarker.tsx`（抹茶绿心形）
- [ ] 写 `src/screens/MapScreen.tsx`（高德地图 + 标记 + 点击弹卡片 + 长按选点 + 右下角添加按钮）
- [ ] Commit

```bash
git commit -m "feat: footprint map with amap + green heart markers"
```

---

### Task 8: 情书 & 心情

**Files:**
- Create: `src/services/letters.ts`
- Create: `src/screens/LetterScreen.tsx`

- [ ] 写 `src/services/letters.ts`

```typescript
// src/services/letters.ts
import { db } from '../config/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, where, getDocs } from 'firebase/firestore';

export interface Letter {
  id: string;
  from: string;
  content: string;
  mood: string;
  createdAt: number;
  read: boolean;
}

export async function sendLetter(coupleId: string, userId: string, content: string, mood: string): Promise<void> {
  await addDoc(collection(db, `letters/${coupleId}/messages`), {
    from: userId, content, mood, createdAt: Date.now(), read: false,
  });
}

export function listenLetters(coupleId: string, callback: (letters: Letter[]) => void) {
  const q = query(collection(db, `letters/${coupleId}/messages`), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Letter)));
  });
}

export async function markRead(coupleId: string, letterId: string): Promise<void> {
  await updateDoc(doc(db, `letters/${coupleId}/messages/${letterId}`), { read: true });
}
```

- [ ] 写 `src/screens/LetterScreen.tsx`（气泡聊天样式，顶部显示对方今日心情，底部输入框 + 心情选择器）
- [ ] Commit

```bash
git commit -m "feat: love letters with mood emoji"
```

---

### Task 9: 推送通知 + 更多页

**Files:**
- Create: `src/screens/MoreScreen.tsx`
- Modify: `src/screens/HomeScreen.tsx`

- [ ] 写 `src/screens/MoreScreen.tsx`（改昵称/头像、纪念日管理、解绑情侣二次确认）
- [ ] 在 HomeScreen 注册本地推送：检查未来 7 天内的纪念日，提前 1 天推送

```typescript
import * as Notifications from 'expo-notifications';

async function scheduleAnniversaryNotifications(anniversaries: Anniversary[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const a of anniversaries) {
    const triggerDate = new Date(a.date - 86400000); // 提前1天
    if (triggerDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: { title: '明天是纪念日 🎉', body: `明天是 ${a.name}，别忘了！` },
        trigger: { date: triggerDate },
      });
    }
  }
}
```

- [ ] 最终打包

```bash
eas build -p android --profile preview
```

- [ ] Commit

```bash
git commit -m "feat: more screen + push notifications for anniversaries"
```

---

## 补充：Firebase Firestore 安全规则

在 Firebase 控制台 → Firestore → 规则，替换为：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if true; // 简化版，生产环境需收紧
    }
    match /couples/{coupleId} {
      allow read, write: if true;
    }
    match /anniversaries/{coupleId}/items/{itemId} {
      allow read, write: if true;
    }
    match /albums/{coupleId}/photos/{photoId} {
      allow read, write: if true;
    }
    match /places/{coupleId}/locations/{placeId} {
      allow read, write: if true;
    }
    match /letters/{coupleId}/messages/{msgId} {
      allow read, write: if true;
    }
  }
}
```
