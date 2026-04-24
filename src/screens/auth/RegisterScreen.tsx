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
      const { userId } = await register(phone, password, gender);
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

      {/* 性别选择 */}
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
