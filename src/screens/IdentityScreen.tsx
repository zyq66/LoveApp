import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../store/AuthContext';
import {
  IdentityOption,
  identityDisplayName,
  listIdentityOptions,
} from '../services/identity';
import { colors, spacing } from '../theme';

export function IdentityScreen() {
  const { selectIdentity } = useAuth();
  const [identities, setIdentities] = useState<IdentityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await listIdentityOptions();
      setIdentities(result);
      if (result.length < 2) setError('还没有找到完整的双人空间，请检查 CloudBase 数据。');
    } catch (e: any) {
      setError(e?.message || '暂时连接不到我们的空间');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function choose(identity: IdentityOption) {
    setSelecting(identity.id);
    try {
      await selectIdentity(identity);
    } finally {
      setSelecting('');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>LOVELETTER</Text>
        <Text style={styles.title}>欢迎回到{`\n`}我们的小世界</Text>
        <Text style={styles.subtitle}>第一次只需要告诉我，你是谁。</Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.rose} size="large" />
            <Text style={styles.loadingText}>正在找到你们…</Text>
          </View>
        ) : (
          <View style={styles.cards}>
            {identities.map((identity, index) => {
              const name = identityDisplayName(identity, index);
              return (
                <TouchableOpacity
                  key={identity.id}
                  style={styles.identityCard}
                  activeOpacity={0.78}
                  disabled={!!selecting}
                  onPress={() => choose(identity)}
                >
                  {identity.avatarUrl ? (
                    <Image source={{ uri: identity.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarEmoji}>{identity.gender === 'female' ? '🌷' : '🌙'}</Text>
                    </View>
                  )}
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardHint}>我是</Text>
                    <Text style={styles.cardName}>{name}</Text>
                  </View>
                  {selecting === identity.id
                    ? <ActivityIndicator color={colors.rose} />
                    : <Text style={styles.arrow}>›</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!!error && (
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.error}>{error}</Text>
            <Text style={styles.retryText}>重新连接</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footer}>没有账号，也不用记住密码。这里只有你们两个人。</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 72 },
  glowOne: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(255,143,171,0.13)', top: -100, right: -100,
  },
  glowTwo: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(139,92,246,0.10)', bottom: -70, left: -100,
  },
  eyebrow: { color: colors.rose, letterSpacing: 4, fontSize: 11, fontWeight: '800' },
  title: { color: colors.white, fontSize: 34, lineHeight: 44, fontWeight: '800', marginTop: 14 },
  subtitle: { color: colors.whiteSecondary, fontSize: 15, marginTop: 12, marginBottom: 42 },
  loading: { alignItems: 'center', paddingTop: 42, gap: 14 },
  loadingText: { color: colors.whiteSecondary, fontSize: 13 },
  cards: { gap: 14 },
  identityCard: {
    flexDirection: 'row', alignItems: 'center', minHeight: 92,
    backgroundColor: 'rgba(255,255,255,0.055)', borderRadius: 24,
    borderWidth: 1, borderColor: colors.whiteBorder, padding: 14,
  },
  avatar: { width: 64, height: 64, borderRadius: 22 },
  avatarPlaceholder: {
    width: 64, height: 64, borderRadius: 22, backgroundColor: colors.roseDim,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.roseBorder,
  },
  avatarEmoji: { fontSize: 28 },
  cardCopy: { flex: 1, marginLeft: 16 },
  cardHint: { color: colors.whiteSecondary, fontSize: 12 },
  cardName: { color: colors.white, fontSize: 20, fontWeight: '700', marginTop: 3 },
  arrow: { color: colors.roseSoft, fontSize: 34, paddingHorizontal: 8 },
  retry: { alignItems: 'center', marginTop: 22 },
  error: { color: '#fda4af', fontSize: 13, textAlign: 'center' },
  retryText: { color: colors.rose, fontSize: 13, fontWeight: '700', marginTop: 10 },
  footer: {
    position: 'absolute', bottom: 28, left: spacing.lg, right: spacing.lg,
    color: 'rgba(255,255,255,0.26)', fontSize: 11, textAlign: 'center', lineHeight: 17,
  },
});
