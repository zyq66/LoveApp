# 相册点赞 + 上传者角标 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 相册照片右下角显示上传者角标（绿色=我/粉色=TA），左下角显示反应 emoji，长按可选择/取消反应。

**Architecture:** 在 Photo 接口扩展 reactions 字段，album.ts 新增 addPhotoReaction()，PhotoGrid 和 PhotoTimeline 两个组件均新增角标和长按浮层，AlbumScreen 向下传 userId 和 onReact 回调。

**Tech Stack:** React Native, TypeScript, 腾讯云 CloudBase JS SDK

---

### Task 1: 扩展 Photo 接口 + 新增 addPhotoReaction

**Files:**
- Modify: `src/services/album.ts`

- [ ] **Step 1: 扩展 Photo 接口，新增 addPhotoReaction 函数**

将 `src/services/album.ts` 改为：

```typescript
import { db, authReady } from '../config/cloudbase';
import { uploadImage } from './storage';

export interface Photo {
  id: string;
  url: string;
  caption: string;
  date: number;
  uploadedBy: string;
  reactions: Record<string, string>; // { [userId]: emoji }
}

export async function uploadPhoto(coupleId: string, userId: string, uri: string, caption: string): Promise<void> {
  const url = await uploadImage(uri, 'album');
  await db.collection('photos').add({
    coupleId, url, caption, date: Date.now(), uploadedBy: userId, reactions: {},
  });
}

export async function fetchPhotos(coupleId: string): Promise<Photo[]> {
  await authReady;
  const res = await db.collection('photos')
    .where({ coupleId })
    .orderBy('date', 'desc')
    .limit(200)
    .get();
  return ((res.data as any[]) ?? [])
    .map(d => ({ reactions: {}, ...d, id: d._id })) as Photo[];
}

export async function addPhotoReaction(photoId: string, userId: string, emoji: string): Promise<void> {
  await authReady;
  await db.collection('photos').doc(photoId).update({
    [`reactions.${userId}`]: emoji,
  });
}

export async function removePhotoReaction(photoId: string, userId: string): Promise<void> {
  await authReady;
  // TCB 不支持 unset，用空字符串覆盖后在读取时过滤
  await db.collection('photos').doc(photoId).update({
    [`reactions.${userId}`]: '',
  });
}

export async function deletePhoto(coupleId: string, photoId: string): Promise<void> {
  await db.collection('photos').doc(photoId).remove();
}
```

- [ ] **Step 2: 提交**

```bash
git add src/services/album.ts
git commit -m "feat: extend Photo interface with reactions, add addPhotoReaction/removePhotoReaction"
```

---

### Task 2: 更新 AlbumScreen 传 userId 和 onReact

**Files:**
- Modify: `src/screens/AlbumScreen.tsx`

- [ ] **Step 1: 引入新函数，传 userId 和 onReact 给子组件**

修改 `src/screens/AlbumScreen.tsx`：

1. import 行改为：
```typescript
import { uploadPhoto, fetchPhotos, addPhotoReaction, removePhotoReaction, Photo } from '../services/album';
```

2. 在 `const { userId, coupleId } = useAuth();` 下方的 `handleConfirmUpload` 之后，新增 react handler：
```typescript
async function handleReact(photo: Photo, emoji: string) {
  if (!userId) return;
  const current = photo.reactions?.[userId];
  if (current === emoji) {
    await removePhotoReaction(photo.id, userId);
  } else {
    await addPhotoReaction(photo.id, userId, emoji);
  }
  await loadPhotos();
}
```

3. 将 ScrollView 内的两处组件调用改为传入 userId 和 onReact：
```tsx
{mode === 'timeline'
  ? <PhotoTimeline photos={photos} userId={userId ?? ''} onReact={handleReact} />
  : <PhotoGrid photos={photos} userId={userId ?? ''} onReact={handleReact} />
}
```

- [ ] **Step 2: 提交**

```bash
git add src/screens/AlbumScreen.tsx
git commit -m "feat: pass userId and onReact handler to photo components"
```

---

### Task 3: 更新 PhotoGrid — 角标 + 长按反应

**Files:**
- Modify: `src/components/PhotoGrid.tsx`

- [ ] **Step 1: 全量替换 PhotoGrid.tsx**

```typescript
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
```

- [ ] **Step 2: 提交**

```bash
git add src/components/PhotoGrid.tsx
git commit -m "feat: PhotoGrid adds uploader badge and long-press reaction picker"
```

---

### Task 4: 更新 PhotoTimeline — 角标 + 长按反应

**Files:**
- Modify: `src/components/PhotoTimeline.tsx`

- [ ] **Step 1: 全量替换 PhotoTimeline.tsx**

```typescript
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
```

- [ ] **Step 2: 提交**

```bash
git add src/components/PhotoTimeline.tsx
git commit -m "feat: PhotoTimeline adds uploader badge and long-press reaction picker"
```

---

### Task 5: 手动验证

- [ ] 启动 App：`npx expo start`
- [ ] 进入相册，确认照片右下角有角标（绿色我/粉色TA）
- [ ] 长按照片，弹出 emoji 选择器
- [ ] 选一个 emoji，确认左下角出现反应计数
- [ ] 再次长按选同一 emoji，确认反应消失
- [ ] 切换时间轴/瀑布流，两个视图均正常

- [ ] **最终提交（如有遗漏改动）**

```bash
git add -A
git commit -m "feat: album reactions and uploader badge complete"
```
