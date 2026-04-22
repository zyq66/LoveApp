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

function groupByMonth(photos: Photo[]): { label: string; items: Photo[] }[] {
  const map = new Map<string, Photo[]>();
  for (const p of photos) {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

const IMG_SIZE = Dimensions.get('window').width - spacing.lg * 2;

export function PhotoTimeline({ photos, userId, onReact }: Props) {
  const [actionTarget, setActionTarget] = useState<Photo | null>(null);
  const groups = groupByMonth(photos);

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>还没有照片，上传第一张吧 📸</Text>
      </View>
    );
  }

  return (
    <>
      <View>
        {groups.map((group, gi) => (
          <View key={group.label} style={styles.group}>
            <View style={styles.monthRow}>
              <View style={[styles.dot, gi === 0 && styles.dotGreen]} />
              <Text style={[styles.monthLabel, gi === 0 && styles.monthLabelGreen]}>
                {group.label}
              </Text>
            </View>
            {group.items.map(photo => {
              const isMe = photo.uploadedBy === userId;
              const reactionEntries = Object.entries(photo.reactions ?? {}).filter(([, v]) => v !== '');
              const counts: Record<string, number> = {};
              reactionEntries.forEach(([, emoji]) => { counts[emoji] = (counts[emoji] || 0) + 1; });

              return (
                <Pressable
                  key={photo.id}
                  style={styles.photoCard}
                  onLongPress={() => setActionTarget(photo)}
                  delayLongPress={400}
                >
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: photo.url }} style={[styles.image, { width: IMG_SIZE }]} />
                    {/* 上传者角标 */}
                    <View style={[styles.avatarBadge, isMe ? styles.avatarBadgeMe : styles.avatarBadgeThem]}>
                      <Text style={styles.avatarBadgeText}>{isMe ? '我' : 'TA'}</Text>
                    </View>
                    {/* 反应行 */}
                    {Object.keys(counts).length > 0 && (
                      <View style={styles.reactionsRow}>
                        {Object.entries(counts).map(([emoji, count]) => (
                          <View key={emoji} style={styles.reactionChip}>
                            <Text style={styles.reactionEmoji}>{emoji}</Text>
                            {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  {photo.caption ? <Text style={styles.caption}>{photo.caption}</Text> : null}
                  <Text style={styles.dateLine}>
                    {new Date(photo.date).toLocaleDateString('zh-CN')}
                    {' · '}
                    <Text style={isMe ? styles.uploadMe : styles.uploadThem}>
                      {isMe ? '我上传' : 'TA上传'}
                    </Text>
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
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
                  <Text style={styles.reactionEmojiText}>{e}</Text>
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
  group: { marginBottom: spacing.lg },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.whiteSecondary, marginRight: 8 },
  dotGreen: { backgroundColor: colors.green },
  monthLabel: { fontSize: 13, color: colors.whiteSecondary, fontWeight: '600' },
  monthLabelGreen: { color: colors.green },
  photoCard: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  image: { aspectRatio: 1, borderRadius: 12, backgroundColor: colors.whiteDim },
  caption: { color: colors.white, fontSize: 14, marginTop: spacing.sm },
  dateLine: { color: colors.whiteSecondary, fontSize: 11, marginTop: 4 },
  uploadMe: { color: colors.green },
  uploadThem: { color: 'rgba(249,168,212,0.8)' },

  avatarBadge: {
    position: 'absolute', bottom: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: '#0a0a14',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBadgeMe: { backgroundColor: colors.green },
  avatarBadgeThem: { backgroundColor: '#f9a8d4' },
  avatarBadgeText: { fontSize: 9, fontWeight: '700', color: '#0a0a14' },

  reactionsRow: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', gap: 4,
  },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(15,20,40,0.85)',
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.whiteBorder,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, color: colors.whiteSecondary, marginLeft: 2 },

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
  reactionEmojiText: { fontSize: 24 },
});
