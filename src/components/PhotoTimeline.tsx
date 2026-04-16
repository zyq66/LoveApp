// src/components/PhotoTimeline.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { Photo } from '../services/album';
import { colors, spacing } from '../theme';

interface Props {
  photos: Photo[];
}

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

export function PhotoTimeline({ photos }: Props) {
  const groups = groupByMonth(photos);

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>还没有照片，上传第一张吧 📸</Text>
      </View>
    );
  }

  return (
    <View>
      {groups.map((group, gi) => (
        <View key={group.label} style={styles.group}>
          {/* Month header */}
          <View style={styles.monthRow}>
            <View style={[styles.dot, gi === 0 && styles.dotGreen]} />
            <Text style={[styles.monthLabel, gi === 0 && styles.monthLabelGreen]}>
              {group.label}
            </Text>
          </View>
          {/* Photos in this month */}
          {group.items.map(photo => (
            <View key={photo.id} style={styles.photoCard}>
              <Image source={{ uri: photo.url }} style={[styles.image, { width: IMG_SIZE }]} />
              {photo.caption ? (
                <Text style={styles.caption}>{photo.caption}</Text>
              ) : null}
              <Text style={styles.dateLine}>
                {new Date(photo.date).toLocaleDateString('zh-CN')}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
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
});
