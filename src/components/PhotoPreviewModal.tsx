import React from 'react';
import {
  Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Photo } from '../services/album';
import { colors, spacing } from '../theme';

interface Props {
  photo: Photo | null;
  userId: string;
  onClose: () => void;
  onDelete: (photo: Photo) => void;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('zh-CN');
}

export function PhotoPreviewModal({ photo, userId, onClose, onDelete }: Props) {
  const isOwner = !!photo && photo.uploadedBy === userId;

  return (
    <Modal visible={!!photo} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
            <Text style={styles.iconText}>×</Text>
          </TouchableOpacity>
          {isOwner && photo ? (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(photo)}>
              <Text style={styles.deleteText}>撤回发布</Text>
            </TouchableOpacity>
          ) : <View style={styles.iconBtn} />}
        </View>

        <Pressable style={styles.imageWrap} onPress={onClose}>
          {photo ? (
            <Image source={{ uri: photo.originalUrl || photo.url }} style={styles.image} resizeMode="contain" />
          ) : null}
        </Pressable>

        {photo ? (
          <View style={styles.footer}>
            {photo.caption ? <Text style={styles.caption}>{photo.caption}</Text> : null}
            <Text style={styles.meta}>
              {formatDate(photo.shotAt)}
              {' · '}
              {isOwner ? '我上传' : 'TA上传'}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: {
    height: 52,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: colors.white, fontSize: 32, lineHeight: 34 },
  deleteBtn: {
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.55)',
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  deleteText: { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
  imageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  caption: { color: colors.white, fontSize: 15, lineHeight: 22, marginBottom: 6 },
  meta: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
});
