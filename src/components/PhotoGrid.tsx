// src/components/PhotoGrid.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { Photo } from '../services/album';
import { colors, spacing } from '../theme';

interface Props {
  photos: Photo[];
}

const SCREEN_W = Dimensions.get('window').width;
const COL_GAP = spacing.sm;
const H_PAD = spacing.lg;
const COL_W = (SCREEN_W - H_PAD * 2 - COL_GAP) / 2;

// Fixed set of aspect ratios to create varied heights
const HEIGHTS = [COL_W * 1.2, COL_W * 0.8, COL_W, COL_W * 1.4, COL_W * 0.9];

export function PhotoGrid({ photos }: Props) {
  if (photos.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>还没有照片，上传第一张吧 📸</Text>
      </View>
    );
  }

  // Split into two columns
  const left: Photo[] = [];
  const right: Photo[] = [];
  photos.forEach((p, i) => (i % 2 === 0 ? left : right).push(p));

  function renderColumn(items: Photo[], offset: number) {
    return items.map((photo, i) => {
      const h = HEIGHTS[(offset + i) % HEIGHTS.length];
      return (
        <View key={photo.id} style={[styles.item, { marginBottom: COL_GAP }]}>
          <Image source={{ uri: photo.url }} style={[styles.image, { height: h }]} />
          {photo.caption ? <Text style={styles.caption} numberOfLines={2}>{photo.caption}</Text> : null}
        </View>
      );
    });
  }

  return (
    <View style={styles.row}>
      <View style={[styles.col, { marginRight: COL_GAP / 2 }]}>
        {renderColumn(left, 0)}
      </View>
      <View style={[styles.col, { marginLeft: COL_GAP / 2 }]}>
        {renderColumn(right, 2)}
      </View>
    </View>
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
});
