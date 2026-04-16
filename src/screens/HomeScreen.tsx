// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, SafeAreaView,
  Modal, TextInput,
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
  const [modalVisible, setModalVisible] = useState(false);
  const [inputName, setInputName] = useState('');

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

  async function handleConfirmAdd() {
    if (!inputName.trim() || !coupleId) return;
    await addAnniversary(coupleId, inputName.trim(), Date.now() + 86400000 * 30);
    const updated = await getAnniversaries(coupleId);
    setAnniversaries(updated);
    setInputName('');
    setModalVisible(false);
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
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>＋ 添加纪念日</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add anniversary modal (cross-platform, works on Android) */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>添加纪念日</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="名称（如：生日、第一次约会）"
              placeholderTextColor={colors.whiteSecondary}
              value={inputName}
              onChangeText={setInputName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => { setModalVisible(false); setInputName(''); }}>
                <Text style={styles.modalCancel}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleConfirmAdd}>
                <Text style={styles.modalConfirmText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#16213e', borderRadius: 16, padding: spacing.lg, width: '85%', borderWidth: 1, borderColor: colors.whiteBorder },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: spacing.md },
  modalInput: { backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder, borderRadius: 10, padding: spacing.md, color: colors.white, fontSize: 15, marginBottom: spacing.md },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { color: colors.whiteSecondary, fontSize: 15, padding: spacing.sm },
  modalConfirm: { backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalConfirmText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
});
