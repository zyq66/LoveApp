// src/screens/MoreScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, Modal, TextInput, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../store/AuthContext';
import { db } from '../config/firebase';
import {
  getAnniversaries, addAnniversary, deleteAnniversary, Anniversary,
} from '../services/anniversaries';
import { DatePicker } from '../components/DatePicker';
import { colors, spacing } from '../theme';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/daxodeygk/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'lovedataPic';

function formatDisplayDate(ms: number): string {
  if (!ms) return '未设置';
  const d = new Date(ms);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}


export function MoreScreen() {
  const { userId, coupleId, clearAuth } = useAuth();

  // Profile
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [currentNickname, setCurrentNickname] = useState('');

  // Together date
  const [startDate, setStartDate] = useState(0);
  const [showStartPicker, setShowStartPicker] = useState(false);

  // Anniversaries
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [annModal, setAnnModal] = useState(false);
  const [annName, setAnnName] = useState('');
  const [annPickerDate, setAnnPickerDate] = useState(new Date());
  const [showAnnPicker, setShowAnnPicker] = useState(false);

  // Nickname modal
  const [nicknameModal, setNicknameModal] = useState(false);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, 'users', userId)).then(snap => {
      if (snap.exists()) {
        setAvatarUrl(snap.data().avatarUrl || '');
        setCurrentNickname(snap.data().nickname || '');
      }
    });
  }, [userId]);

  useEffect(() => {
    if (!coupleId) return;
    getDoc(doc(db, 'couples', coupleId)).then(snap => {
      if (snap.exists()) setStartDate(snap.data().startDate || 0);
    });
    getAnniversaries(coupleId).then(setAnniversaries);
  }, [coupleId]);

  // ── Avatar ──────────────────────────────────────────────
  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('需要相册权限', '请在设置中允许访问相册'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setAvatarUploading(true);
    try {
      const uri = result.assets[0].uri;
      const formData = new FormData();
      formData.append('file', { uri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
      const data = await res.json();
      await updateDoc(doc(db, 'users', userId!), { avatarUrl: data.secure_url });
      setAvatarUrl(data.secure_url);
      Alert.alert('头像已更新');
    } catch (e: any) {
      Alert.alert('上传失败', e.message);
    } finally {
      setAvatarUploading(false);
    }
  }

  // ── Nickname ─────────────────────────────────────────────
  async function handleSaveNickname() {
    if (!userId || !nickname.trim()) return;
    const trimmed = nickname.trim();
    await updateDoc(doc(db, 'users', userId), { nickname: trimmed });
    setCurrentNickname(trimmed);
    setNicknameModal(false);
    setNickname('');
  }

  // ── Together date ─────────────────────────────────────────
  async function handleStartDateChange(date: Date) {
    setShowStartPicker(false);
    if (!coupleId) return;
    const ts = date.getTime();
    await updateDoc(doc(db, 'couples', coupleId), { startDate: ts });
    setStartDate(ts);
  }

  // ── Anniversaries ─────────────────────────────────────────
  async function handleAddAnniversary() {
    if (!annName.trim() || !coupleId) return;
    // Use selected date's month+day, adjust year so it's upcoming
    const picked = new Date(annPickerDate);
    const now = new Date();
    picked.setFullYear(now.getFullYear());
    if (picked.getTime() < Date.now()) picked.setFullYear(now.getFullYear() + 1);
    await addAnniversary(coupleId, annName.trim(), picked.getTime());
    const updated = await getAnniversaries(coupleId);
    setAnniversaries(updated);
    setAnnModal(false);
    setAnnName('');
    setAnnPickerDate(new Date());
  }

  function handleDeleteAnniversary(item: Anniversary) {
    Alert.alert('删除纪念日', `确定删除「${item.name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          if (!coupleId) return;
          await deleteAnniversary(coupleId, item.id);
          setAnniversaries(prev => prev.filter(a => a.id !== item.id));
        },
      },
    ]);
  }

  // ── Unbind / Logout ───────────────────────────────────────
  function handleUnbind() {
    Alert.alert('解绑情侣', '解绑后需要重新配对才能同步数据，确定吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定解绑', style: 'destructive',
        onPress: async () => {
          if (!coupleId || !userId) return;
          const snap = await getDoc(doc(db, 'couples', coupleId));
          if (snap.exists()) {
            const data = snap.data();
            if (data.user1 === userId) {
              await updateDoc(doc(db, 'couples', coupleId), { user1: null, status: 'pending' });
            } else {
              await updateDoc(doc(db, 'couples', coupleId), { user2: null, status: 'pending' });
            }
          }
          await updateDoc(doc(db, 'users', userId), { coupleId: null });
          clearAuth();
        },
      },
    ]);
  }

  function handleLogout() {
    Alert.alert('退出登录', '确定要退出吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: clearAuth },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.pageTitle}>更多</Text>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} disabled={avatarUploading}>
          {avatarUploading ? (
            <View style={styles.avatarCircle}><ActivityIndicator color={colors.green} /></View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarCircle} />
          ) : (
            <View style={styles.avatarCircle}><Text style={styles.avatarPlaceholder}>👤</Text></View>
          )}
          <Text style={styles.avatarHint}>点击更换头像</Text>
        </TouchableOpacity>

        {/* 账户 */}
        <Text style={styles.sectionTitle}>账户</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.row} onPress={() => { setNickname(currentNickname); setNicknameModal(true); }}>
            <Text style={styles.rowLabel}>昵称</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{currentNickname || '未设置'}</Text>
              <Text style={styles.rowArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 情侣 */}
        <Text style={styles.sectionTitle}>情侣</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.row} onPress={() => setShowStartPicker(true)}>
            <Text style={styles.rowLabel}>在一起的日期</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{formatDisplayDate(startDate)}</Text>
              <Text style={styles.rowArrow}>›</Text>
            </View>
          </TouchableOpacity>
          {coupleId ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>情侣 ID</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{coupleId}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={handleUnbind}>
            <Text style={[styles.rowLabel, styles.danger]}>解绑情侣</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 纪念日 */}
        <View style={styles.annHeader}>
          <Text style={styles.sectionTitle}>纪念日</Text>
          <TouchableOpacity style={styles.annAddBtn} onPress={() => setAnnModal(true)}>
            <Text style={styles.annAddBtnText}>＋ 添加</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          {anniversaries.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.rowValue}>还没有纪念日</Text>
            </View>
          ) : (
            anniversaries.map((a, i) => {
              const daysLeft = Math.ceil((a.date - Date.now()) / 86400000);
              const label = daysLeft === 0 ? '今天 🎉' : daysLeft > 0 ? `${daysLeft} 天后` : `${Math.abs(daysLeft)} 天前`;
              const urgent = daysLeft >= 0 && daysLeft <= 7;
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.row, i === anniversaries.length - 1 && styles.rowLast]}
                  onLongPress={() => handleDeleteAnniversary(a)}
                  delayLongPress={500}
                >
                  <Text style={styles.rowLabel}>{a.name}</Text>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, urgent && styles.rowValueUrgent]}>{label}</Text>
                    <Text style={styles.rowArrow}>⋯</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
        <Text style={styles.annHint}>长按纪念日可删除</Text>

        {/* 其他 */}
        <Text style={styles.sectionTitle}>其他</Text>
        <View style={styles.section}>
          <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={handleLogout}>
            <Text style={[styles.rowLabel, styles.danger]}>退出登录</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>LoveApp v1.0</Text>
      </ScrollView>

      {/* Nickname modal */}
      <Modal visible={nicknameModal} transparent animationType="fade" onRequestClose={() => setNicknameModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>修改昵称</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="输入新昵称"
              placeholderTextColor={colors.whiteSecondary}
              value={nickname}
              onChangeText={setNickname}
              autoFocus
              maxLength={20}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => { setNicknameModal(false); setNickname(''); }}>
                <Text style={styles.modalCancel}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveNickname}>
                <Text style={styles.modalConfirmText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add anniversary modal */}
      <Modal visible={annModal} transparent animationType="fade" onRequestClose={() => setAnnModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>添加纪念日</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="名称（如：生日、第一次约会）"
              placeholderTextColor={colors.whiteSecondary}
              value={annName}
              onChangeText={setAnnName}
              autoFocus
              maxLength={20}
            />
            <TouchableOpacity style={styles.dateField} onPress={() => setShowAnnPicker(true)}>
              <Text style={styles.dateFieldLabel}>日期</Text>
              <Text style={styles.dateFieldValue}>
                {`${annPickerDate.getMonth() + 1} 月 ${annPickerDate.getDate()} 日`}
              </Text>
            </TouchableOpacity>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => { setAnnModal(false); setAnnName(''); setAnnPickerDate(new Date()); }}>
                <Text style={styles.modalCancel}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleAddAnniversary}>
                <Text style={styles.modalConfirmText}>添加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date pickers */}
      <DatePicker
        visible={showStartPicker}
        value={startDate ? new Date(startDate) : new Date()}
        maximumDate={new Date()}
        onChange={handleStartDateChange}
        onCancel={() => setShowStartPicker(false)}
      />
      <DatePicker
        visible={showAnnPicker}
        value={annPickerDate}
        onChange={(d) => { setAnnPickerDate(d); setShowAnnPicker(false); }}
        onCancel={() => setShowAnnPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pageTitle: { fontSize: 22, fontWeight: '700', color: colors.white, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },

  avatarWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  avatarCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.whiteDim, borderWidth: 2, borderColor: colors.greenBorder, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarPlaceholder: { fontSize: 36 },
  avatarHint: { color: colors.whiteSecondary, fontSize: 12, marginTop: 8 },

  sectionTitle: { fontSize: 12, color: colors.whiteSecondary, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, letterSpacing: 1 },
  section: { backgroundColor: '#16213e', marginHorizontal: spacing.lg, borderRadius: 12, borderWidth: 1, borderColor: colors.whiteBorder, overflow: 'hidden' },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.whiteBorder },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 15, color: colors.white },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 13, color: colors.whiteSecondary, maxWidth: 180 },
  rowValueUrgent: { color: colors.green, fontWeight: '600' },
  rowArrow: { fontSize: 18, color: colors.whiteSecondary },
  danger: { color: '#f87171' },

  annHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: spacing.lg },
  annAddBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.greenBorder, backgroundColor: colors.greenDim },
  annAddBtnText: { fontSize: 12, color: colors.green },
  annHint: { fontSize: 11, color: colors.whiteSecondary, paddingHorizontal: spacing.lg, marginTop: 6 },

  version: { textAlign: 'center', color: colors.whiteSecondary, fontSize: 12, marginTop: spacing.xl },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#16213e', borderRadius: 16, padding: spacing.lg, width: '85%', borderWidth: 1, borderColor: colors.whiteBorder },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: spacing.md },
  modalInput: { backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder, borderRadius: 10, padding: spacing.md, color: colors.white, fontSize: 15, marginBottom: spacing.md },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  dateField: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder,
    borderRadius: 10, padding: spacing.md, marginBottom: spacing.md,
  },
  dateFieldLabel: { fontSize: 14, color: colors.whiteSecondary },
  dateFieldValue: { fontSize: 15, color: colors.green, fontWeight: '600' },
  modalCancel: { color: colors.whiteSecondary, fontSize: 15, padding: spacing.sm },
  modalConfirm: { backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalConfirmText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
});
