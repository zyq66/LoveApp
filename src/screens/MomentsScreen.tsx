// src/screens/MomentsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, Modal, TextInput, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { DatePicker } from '../components/DatePicker';
import { useAuth } from '../store/AuthContext';
import { listenMoments, addMoment, deleteMoment, Moment } from '../services/moments';
import { uploadImage } from '../services/storage';
import { colors, spacing } from '../theme';

const EMOJIS = ['🌸', '🌟', '🎉', '💕', '🌈', '🍃', '☕', '🎵', '🌙', '🔥'];

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function msFromYYYYMMDD(str: string): number {
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return Date.now();
  return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3])).getTime();
}

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function MomentsScreen() {
  const { userId, coupleId } = useAuth();
  const [moments, setMoments] = useState<Moment[]>([]);

  // Add modal
  const [addModal, setAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
  const [dateStr, setDateStr] = useState(todayString());
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [selected, setSelected] = useState<Moment | null>(null);

  useEffect(() => {
    if (!coupleId) return;
    return listenMoments(coupleId, setMoments);
  }, [coupleId]);

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相册权限', '请在设置中允许访问相册');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setPendingPhoto(result.assets[0].uri);
  }

  async function handleConfirmAdd() {
    if (!title.trim() || !coupleId || !userId) return;
    setUploading(true);
    try {
      let photoUrl: string | undefined;
      if (pendingPhoto) {
        photoUrl = await uploadImage(pendingPhoto, 'moments');
      }
      await addMoment(coupleId, userId, {
        title: title.trim(),
        note: note.trim(),
        emoji: selectedEmoji,
        date: msFromYYYYMMDD(dateStr),
        photoUrl,
      });
      resetAddModal();
    } catch (e: any) {
      Alert.alert('保存失败', e?.message || String(e));
    } finally {
      setUploading(false);
    }
  }

  function resetAddModal() {
    setAddModal(false);
    setTitle('');
    setNote('');
    setSelectedEmoji(EMOJIS[0]);
    setDateStr(todayString());
    setPendingPhoto(null);
  }

  async function handleDelete() {
    if (!selected || !coupleId) return;
    Alert.alert('删除时光', `确定删除「${selected.title}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          await deleteMoment(coupleId, selected.id);
          setDetailModal(false);
          setSelected(null);
        },
      },
    ]);
  }

  function renderCard({ item }: { item: Moment }) {
    return (
      <TouchableOpacity style={styles.card} onPress={() => { setSelected(item); setDetailModal(true); }}>
        <View style={styles.cardLeft}>
          <View style={styles.emojiCircle}>
            <Text style={styles.cardEmoji}>{item.emoji}</Text>
          </View>
          <View style={styles.cardLine} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
          <View style={styles.cardContent}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.cardThumb} />
            ) : null}
            <View style={styles.cardText}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              {item.note ? <Text style={styles.cardNote} numberOfLines={2}>{item.note}</Text> : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>时光</Text>
        <Text style={styles.headerSub}>{moments.length} 个美好时刻</Text>
      </View>

      {moments.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>✨</Text>
          <Text style={styles.emptyText}>还没有记录{'\n'}点击下方按钮，留住美好时刻</Text>
        </View>
      ) : (
        <FlatList
          data={moments}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setAddModal(true)}>
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      {/* Add modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={resetAddModal}>
        <View style={styles.slideOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>记录美好时刻</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Emoji picker */}
              <Text style={styles.fieldLabel}>选个心情</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
                {EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiBtn, selectedEmoji === e && styles.emojiBtnActive]}
                    onPress={() => setSelectedEmoji(e)}
                  >
                    <Text style={styles.emojiBtnText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title */}
              <Text style={styles.fieldLabel}>标题 *</Text>
              <TextInput
                style={styles.input}
                placeholder="这一刻叫什么？"
                placeholderTextColor={colors.whiteSecondary}
                value={title}
                onChangeText={setTitle}
                maxLength={40}
              />

              {/* Date */}
              <Text style={styles.fieldLabel}>日期</Text>
              <TouchableOpacity style={styles.dateField} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateFieldLabel}>选择日期</Text>
                <Text style={styles.dateFieldValue}>{dateStr}</Text>
              </TouchableOpacity>

              {/* Note */}
              <Text style={styles.fieldLabel}>备注（可选）</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="写下当时的感受..."
                placeholderTextColor={colors.whiteSecondary}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={200}
              />

              {/* Photo */}
              <Text style={styles.fieldLabel}>照片（可选）</Text>
              <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
                {pendingPhoto ? (
                  <Image source={{ uri: pendingPhoto }} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.photoBtnText}>📷 点击选择照片</Text>
                )}
              </TouchableOpacity>

              <View style={styles.sheetButtons}>
                <TouchableOpacity onPress={resetAddModal}>
                  <Text style={styles.cancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, (!title.trim() || uploading) && styles.confirmBtnDisabled]}
                  onPress={handleConfirmAdd}
                  disabled={!title.trim() || uploading}
                >
                  {uploading
                    ? <ActivityIndicator color={colors.bg} size="small" />
                    : <Text style={styles.confirmText}>保存</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date picker for moment date */}
      <DatePicker
        visible={showDatePicker}
        value={new Date(msFromYYYYMMDD(dateStr))}
        maximumDate={new Date()}
        onChange={(d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          setDateStr(`${y}-${m}-${day}`);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      {/* Detail modal */}
      <Modal visible={detailModal} transparent animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <TouchableOpacity style={styles.detailOverlay} activeOpacity={1} onPress={() => setDetailModal(false)}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailEmoji}>{selected?.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{selected?.title}</Text>
                <Text style={styles.detailDate}>{selected ? formatDate(selected.date) : ''}</Text>
              </View>
            </View>
            {selected?.photoUrl ? (
              <Image source={{ uri: selected.photoUrl }} style={styles.detailPhoto} resizeMode="cover" />
            ) : null}
            {selected?.note ? (
              <Text style={styles.detailNote}>{selected.note}</Text>
            ) : null}
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>删除这个时刻</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: colors.white },
  headerSub: { fontSize: 12, color: colors.whiteSecondary, marginTop: 2 },

  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 100 },

  card: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  cardLeft: { width: 36, alignItems: 'center' },
  emojiCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.greenDim,
    borderWidth: 1, borderColor: colors.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  cardEmoji: { fontSize: 16 },
  cardLine: { flex: 1, width: 1, backgroundColor: colors.whiteBorder, marginTop: 4 },

  cardBody: { flex: 1, marginLeft: spacing.sm },
  cardDate: { fontSize: 11, color: colors.whiteSecondary, marginBottom: 6 },
  cardContent: {
    backgroundColor: colors.bgLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.whiteBorder,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  cardThumb: { width: '100%', height: 140, backgroundColor: colors.whiteDim },
  cardText: { padding: spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.white },
  cardNote: { fontSize: 13, color: colors.whiteSecondary, marginTop: 4 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: colors.whiteSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg + 16,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
  },
  fabIcon: { fontSize: 26, color: colors.bg, lineHeight: 30 },

  // Add sheet
  slideOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.bgLight,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: colors.whiteBorder,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.whiteBorder,
    alignSelf: 'center', marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: spacing.md },

  fieldLabel: { fontSize: 12, color: colors.whiteSecondary, marginBottom: 6, marginTop: spacing.sm },
  dateField: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder,
    borderRadius: 10, padding: spacing.md, marginBottom: 4,
  },
  dateFieldLabel: { fontSize: 14, color: colors.whiteSecondary },
  dateFieldValue: { fontSize: 15, color: colors.green, fontWeight: '600' },
  input: {
    backgroundColor: colors.whiteDim,
    borderWidth: 1, borderColor: colors.whiteBorder,
    borderRadius: 10, padding: spacing.md,
    color: colors.white, fontSize: 15,
    marginBottom: 4,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  emojiRow: { flexDirection: 'row', marginBottom: 4 },
  emojiBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, backgroundColor: colors.whiteDim,
    borderWidth: 1, borderColor: 'transparent',
  },
  emojiBtnActive: { borderColor: colors.green, backgroundColor: colors.greenDim },
  emojiBtnText: { fontSize: 20 },

  photoBtn: {
    height: 90,
    backgroundColor: colors.whiteDim,
    borderWidth: 1, borderColor: colors.whiteBorder,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  photoBtnText: { color: colors.whiteSecondary, fontSize: 14 },
  photoPreview: { width: '100%', height: '100%' },

  sheetButtons: {
    flexDirection: 'row', justifyContent: 'flex-end',
    gap: 12, marginTop: spacing.lg,
  },
  cancelText: { color: colors.whiteSecondary, fontSize: 15, padding: spacing.sm },
  confirmBtn: {
    backgroundColor: colors.green, borderRadius: 8,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    minWidth: 70, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { color: colors.bg, fontWeight: '700', fontSize: 15 },

  // Detail
  detailOverlay: { flex: 1, justifyContent: 'flex-end' },
  detailCard: {
    backgroundColor: colors.bgLight,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: colors.whiteBorder,
    padding: spacing.lg,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.md },
  detailEmoji: { fontSize: 32 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  detailDate: { fontSize: 12, color: colors.whiteSecondary, marginTop: 2 },
  detailPhoto: {
    width: '100%', height: 200,
    borderRadius: 12, marginBottom: spacing.md,
    backgroundColor: colors.whiteDim,
  },
  detailNote: {
    fontSize: 14, color: 'rgba(255,255,255,0.7)',
    lineHeight: 22, marginBottom: spacing.md,
  },
  deleteBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)',
    marginTop: spacing.sm,
  },
  deleteBtnText: { color: '#f87171', fontSize: 14 },
});
