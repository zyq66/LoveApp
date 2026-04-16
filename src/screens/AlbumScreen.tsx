// src/screens/AlbumScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../store/AuthContext';
import { uploadPhoto, listenPhotos, Photo } from '../services/album';
import { PhotoTimeline } from '../components/PhotoTimeline';
import { PhotoGrid } from '../components/PhotoGrid';
import { colors, spacing } from '../theme';

type ViewMode = 'timeline' | 'grid';

export function AlbumScreen() {
  const { userId, coupleId } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [mode, setMode] = useState<ViewMode>('timeline');
  const [uploading, setUploading] = useState(false);
  const [captionModal, setCaptionModal] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (!coupleId) return;
    const unsub = listenPhotos(coupleId, setPhotos);
    return unsub;
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
    setPendingUri(result.assets[0].uri);
    setCaptionModal(true);
  }

  async function handleConfirmUpload() {
    if (!pendingUri || !coupleId || !userId) return;
    setCaptionModal(false);
    setUploading(true);
    try {
      await uploadPhoto(coupleId, userId, pendingUri, caption.trim());
    } catch (e: any) {
      Alert.alert('上传失败', e.message);
    } finally {
      setUploading(false);
      setPendingUri(null);
      setCaption('');
    }
  }

  function handleCancelUpload() {
    setCaptionModal(false);
    setPendingUri(null);
    setCaption('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>相册</Text>
        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'timeline' && styles.toggleActive]}
            onPress={() => setMode('timeline')}
          >
            <Text style={[styles.toggleText, mode === 'timeline' && styles.toggleTextActive]}>时间轴</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'grid' && styles.toggleActive]}
            onPress={() => setMode('grid')}
          >
            <Text style={[styles.toggleText, mode === 'grid' && styles.toggleTextActive]}>瀑布流</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Photo list */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mode === 'timeline'
          ? <PhotoTimeline photos={photos} />
          : <PhotoGrid photos={photos} />
        }
      </ScrollView>

      {/* Upload button */}
      <TouchableOpacity style={styles.fab} onPress={handlePickPhoto} disabled={uploading}>
        {uploading
          ? <ActivityIndicator color={colors.bg} />
          : <Text style={styles.fabIcon}>＋</Text>
        }
      </TouchableOpacity>

      {/* Caption modal */}
      <Modal visible={captionModal} transparent animationType="fade" onRequestClose={handleCancelUpload}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>添加描述</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="写点什么吧（可选）"
              placeholderTextColor={colors.whiteSecondary}
              value={caption}
              onChangeText={setCaption}
              autoFocus
              multiline
              maxLength={100}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={handleCancelUpload}>
                <Text style={styles.modalCancel}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleConfirmUpload}>
                <Text style={styles.modalConfirmText}>上传</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.white },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.whiteDim,
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.whiteBorder,
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  toggleActive: { backgroundColor: colors.green },
  toggleText: { fontSize: 12, color: colors.whiteSecondary },
  toggleTextActive: { color: colors.bg, fontWeight: '600' },
  scrollContent: { paddingTop: spacing.sm, paddingBottom: 100 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg + 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  fabIcon: { fontSize: 26, color: colors.bg, lineHeight: 30 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: spacing.lg,
    width: '85%',
    borderWidth: 1,
    borderColor: colors.whiteBorder,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: spacing.md },
  modalInput: {
    backgroundColor: colors.whiteDim,
    borderWidth: 1,
    borderColor: colors.whiteBorder,
    borderRadius: 10,
    padding: spacing.md,
    color: colors.white,
    fontSize: 15,
    marginBottom: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { color: colors.whiteSecondary, fontSize: 15, padding: spacing.sm },
  modalConfirm: {
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalConfirmText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
});
