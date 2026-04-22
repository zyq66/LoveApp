import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, Dimensions,
  Pressable, Modal, TouchableOpacity,
} from 'react-native';
import { Photo } from '../services/album';
import { colors, spacing } from '../theme';

interface Props {
  photos: Photo[];
  userId: string;
  onReact: (photo: Photo, emoji: string) => void;
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🌸'];

const SCREEN_W = Dimensions.get('window').width;
const COL_GAP = spacing.sm;
const H_PAD = spacing.lg;
const COL_W = (SCREEN_W - H_PAD * 2 - COL_GAP) / 2;
const HEIGHTS = [COL_W * 1.2, COL_W * 0.8, COL_W, COL_W * 1.4, COL_W * 0.9];

export function PhotoGrid({ photos, userId, onReact }: Props) {
  const [actionTarget, setActionTarget] = useState<Photo | null>(null);

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

  function renderColumn(items: Photo[], offset: number) {
    return items.map((photo, i) => {
      const h = HEIGHTS[(offset + i) % HEIGHTS.length];
      const isMe = photo.uploadedBy === userId;
      const reactionEntries = Object.entries(photo.reactions ?? {}).filter(([, v]) => v !== '');
      const counts: Record<string, number> = {};
      reactionEntries.forEach(([, emoji]) => { counts[emoji] = (counts[emoji] || 0) + 1; });
      const topReaction = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

      return (
        <Pressable
          key={photo.id}
          style={[styles.item, { marginBottom: COL_GAP }]}
          onLongPress={() => setActionTarget(photo)}
          delayLongPress={400}
        >
          <View style={{ position: 'relative' }}>
            <Image source={{ uri: photo.url }} style={[styles.image, { height: h }]} />
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
          {renderColumn(left, 0)}
        </View>
        <View style={[styles.col, { marginLeft: COL_GAP / 2 }]}>
          {renderColumn(right, 2)}
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
});
