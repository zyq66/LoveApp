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
      navigation.navigate('CoupleCode', { userId, coupleCode });
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
      <TouchableOpacity onPress={() => navigation.replace('Login')}>
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
