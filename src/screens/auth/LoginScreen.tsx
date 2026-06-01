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
      const { userId, gender } = await login(phone, password);
      // coupleId 由 user 文档 watch 自动推送
      setAuth(userId, gender);
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
