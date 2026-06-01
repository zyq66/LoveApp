import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, Dimensions,
  Pressable, Modal, TouchableOpacity,
} from 'react-native';
import { Photo } from '../services/album';
import { colors, spacing } from '../theme';
import { usePhotoAspectRatios } from './usePhotoAspectRatios';

interface Props {
  photos: Photo[];
  userId: string;
  onReact: (photo: Photo, emoji: string) => void;
  onOpen: (photo: Photo) => void;
  onDelete: (photo: Photo) => void;
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🌸'];

const SCREEN_W = Dimensions.get('window').width;
const COL_GAP = spacing.sm;
const H_PAD = spacing.lg;
const COL_W = (SCREEN_W - H_PAD * 2 - COL_GAP) / 2;

function gridImageHeight(ratio: number): number {
  const naturalHeight = COL_W / Math.max(ratio, 0.35);
  return Math.min(Math.max(naturalHeight, 120), 300);
}

export function PhotoGrid({ photos, userId, onReact, onOpen, onDelete }: Props) {
  const [actionTarget, setActionTarget] = useState<Photo | null>(null);
  const ratios = usePhotoAspectRatios(photos);

  if (photos.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>还没有照片，上传第一张吧 📸</Text>
      </View>
    );
  }

  const left: Photo[] = [];
  const right: Photo[] = [];
  photos.forEach((p, i) => (i % 2 === 0 ? left : right).push(p));

  function renderColumn(items: Photo[]) {
    return items.map((photo, i) => {
      const h = gridImageHeight(ratios[photo.id] ?? 1);
      const isMe = photo.uploadedBy === userId;
      const reactionEntries = Object.entries(photo.reactions ?? {}).filter(([, v]) => v !== '');
      const counts: Record<string, number> = {};
      reactionEntries.forEach(([, emoji]) => { counts[emoji] = (counts[emoji] || 0) + 1; });
      const topReaction = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

      return (
        <Pressable
          key={photo.id}
          style={[styles.item, { marginBottom: COL_GAP }]}
          onPress={() => onOpen(photo)}
          onLongPress={() => setActionTarget(photo)}
          delayLongPress={400}
        >
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: photo.url }}
              style={[styles.image, { height: h }]}
              resizeMode="contain"
            />
            {/* 上传者角标 */}
            <View style={[styles.avatarBadge, isMe ? styles.avatarBadgeMe : styles.avatarBadgeThem]}>
              <Text style={styles.avatarBadgeText}>{isMe ? '我' : 'TA'}</Text>
            </View>
            {/* 反应 */}
            {topReaction && (
              <View style={styles.reactionBadge}>
                <Text style={styles.reactionBadgeText}>{topReaction[0]} {topReaction[1] > 1 ? topReaction[1] : ''}</Text>
              </View>
            )}
          </View>
          {photo.caption ? <Text style={styles.caption} numberOfLines={2}>{photo.caption}</Text> : null}
        </Pressable>
      );
    });
  }

  return (
    <>
      <View style={styles.row}>
        <View style={[styles.col, { marginRight: COL_GAP / 2 }]}>
          {renderColumn(left)}
        </View>
        <View style={[styles.col, { marginLeft: COL_GAP / 2 }]}>
          {renderColumn(right)}
        </View>
      </View>

      <Modal visible={!!actionTarget} transparent animationType="fade" onRequestClose={() => setActionTarget(null)}>
        <Pressable style={styles.overlay} onPress={() => setActionTarget(null)}>
          <View style={styles.actionMenu}>
            <Text style={styles.actionTitle}>回应</Text>
            <View style={styles.reactionPicker}>
              {REACTION_EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={styles.reactionBtn}
                  onPress={() => {
                    if (actionTarget) onReact(actionTarget, e);
                    setActionTarget(null);
                  }}
                >
                  <Text style={styles.reactionEmoji}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {actionTarget?.uploadedBy === userId && (
              <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => {
                  const target = actionTarget;
                  setActionTarget(null);
                  if (target) onDelete(target);
                }}
              >
                <Text style={styles.deleteActionText}>撤回发布</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: colors.whiteSecondary, fontSize: 14 },
  row: { flexDirection: 'row', paddingHorizontal: H_PAD },
  col: { flex: 1 },
  item: {},
  image: { width: COL_W, borderRadius: 10, backgroundColor: colors.whiteDim },
  caption: { color: colors.whiteSecondary, fontSize: 11, marginTop: 4 },

  avatarBadge: {
    position: 'absolute', bottom: -6, right: -6,
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#0a0a14',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBadgeMe: { backgroundColor: colors.green },
  avatarBadgeThem: { backgroundColor: '#f9a8d4' },
  avatarBadgeText: { fontSize: 8, fontWeight: '700', color: '#0a0a14' },

  reactionBadge: {
    position: 'absolute', bottom: -6, left: 4,
    backgroundColor: 'rgba(15,20,40,0.92)',
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.whiteBorder,
  },
  reactionBadgeText: { fontSize: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  actionMenu: {
    backgroundColor: '#16213e', borderRadius: 20, padding: spacing.lg,
    width: '80%', borderWidth: 1, borderColor: colors.whiteBorder,
  },
  actionTitle: { fontSize: 13, color: colors.whiteSecondary, marginBottom: spacing.md, textAlign: 'center' },
  reactionPicker: { flexDirection: 'row', justifyContent: 'space-around' },
  reactionBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.whiteDim,
    alignItems: 'center', justifyContent: 'center',
  },
  reactionEmoji: { fontSize: 24 },
  deleteAction: {
    alignSelf: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.55)',
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deleteActionText: { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
});
