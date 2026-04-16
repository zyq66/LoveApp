// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, SafeAreaView,
} from 'react-native';
import { getDoc, doc } from 'firebase/firestore';
import { useAuth } from '../store/AuthContext';
import {
  getAnniversaries, addAnniversary, deleteAnniversary, Anniversary,
} from '../services/anniversaries';
import { AnniversaryTag } from '../components/AnniversaryTag';
import { db } from '../config/firebase';
import { colors, spacing } from '../theme';

export function HomeScreen() {
  const { userId, coupleId } = useAuth();
  const [daysTogether, setDaysTogether] = useState(0);
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);

  useEffect(() => {
    if (!coupleId) return;

    getDoc(doc(db, 'couples', coupleId)).then(snap => {
      if (snap.exists()) {
        const days = Math.floor((Date.now() - snap.data().startDate) / 86400000);
        setDaysTogether(Math.max(0, days));
      }
    });

    getAnniversaries(coupleId).then(setAnniversaries);
  }, [coupleId]);

  async function handleAddAnniversary() {
    Alert.prompt(
      '添加纪念日',
      '输入名称（如：生日、第一次约会）',
      async (name) => {
        if (!name || !coupleId) return;
        // Default: 30 days from now as placeholder; user can manage dates in More screen later
        await addAnniversary(coupleId, name, Date.now() + 86400000 * 30);
        const updated = await getAnniversaries(coupleId);
        setAnniversaries(updated);
      },
    );
  }

  async function handleDeleteAnniversary(itemId: string) {
    if (!coupleId) return;
    Alert.alert('删除纪念日', '确定要删除这个纪念日吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: async () => {
          await deleteAnniversary(coupleId, itemId);
          setAnniversaries(prev => prev.filter(a => a.id !== itemId));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Avatars + heart */}
        <View style={styles.avatarRow}>
          <View style={styles.avatar} />
          <Text style={styles.heart}>♥</Text>
          <View style={[styles.avatar, styles.avatarRight]} />
        </View>

        {/* Days counter */}
        <Text style={styles.days}>{daysTogether}</Text>
        <Text style={styles.daysLabel}>DAYS TOGETHER</Text>

        {/* Anniversary tags */}
        <View style={styles.tags}>
          {anniversaries.map(a => (
            <TouchableOpacity key={a.id} onLongPress={() => handleDeleteAnniversary(a.id)}>
              <AnniversaryTag name={a.name} date={a.date} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addBtn} onPress={handleAddAnniversary}>
            <Text style={styles.addBtnText}>＋ 添加纪念日</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#c084fc' },
  avatarRight: { backgroundColor: '#818cf8' },
  heart: {
    fontSize: 28,
    color: colors.green,
    textShadowColor: 'rgba(74,222,128,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  days: { fontSize: 72, fontWeight: '800', color: colors.white, letterSpacing: -2 },
  daysLabel: { fontSize: 11, color: colors.whiteSecondary, letterSpacing: 4, marginBottom: spacing.lg },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: spacing.md },
  addBtn: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.whiteBorder,
    borderStyle: 'dashed',
  },
  addBtnText: { color: colors.whiteSecondary, fontSize: 12 },
});
