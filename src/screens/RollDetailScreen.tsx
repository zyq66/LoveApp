import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import {
  addPhotoReaction,
  deletePhoto,
  Photo,
  removePhotoReaction,
  watchPhotos,
} from '../services/album';
import { coupleRolls } from '../services/rolls';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { PhotoGrid } from '../components/PhotoGrid';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { colors, spacing } from '../theme';

export function RollDetailScreen({ navigation, route }: any) {
  const { rollId, title, kind } = route.params as { rollId: string; title: string; kind: 'custom' | 'month' };
  const { userId, coupleId, couple } = useAuth();
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [preview, setPreview] = useState<Photo | null>(null);
  const { chooseSource, uploading, progress } = usePhotoPicker(kind === 'custom' ? rollId : undefined);

  useEffect(() => {
    if (!coupleId) return;
    return watchPhotos(coupleId, setAllPhotos);
  }, [coupleId]);

  const photos = useMemo(() => allPhotos.filter(photo => (
    kind === 'custom' ? photo.rollId === rollId : (!photo.rollId && photo.dateKey.startsWith(rollId))
  )), [allPhotos, kind, rollId]);

  const roll = kind === 'custom' ? coupleRolls(couple).find(item => item.id === rollId) : undefined;
  const locked = !!roll && roll.type === 'secret' && !!roll.unlockAt && roll.unlockAt > Date.now();

  async function react(photo: Photo, emoji: string) {
    if (!userId) return;
    if (photo.reactions?.[userId] === emoji) await removePhotoReaction(photo.id, userId);
    else await addPhotoReaction(photo.id, userId, emoji);
  }

  function remove(photo: Photo) {
    if (!userId || !coupleId) return;
    Alert.alert('移出这张照片？', '手机里的原图不会被删除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '移除', style: 'destructive', onPress: async () => {
          try {
            await deletePhoto(coupleId, photo.id, userId);
            setPreview(null);
          } catch (e: any) {
            Alert.alert('暂时不能移除', e?.message || String(e));
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Text style={styles.backText}>‹</Text></TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle}>{locked ? '秘密保存中' : `${photos.length} 个瞬间`}</Text>
        </View>
        {kind === 'custom' ? (
          <TouchableOpacity style={styles.add} onPress={chooseSource} disabled={uploading}>
            {uploading ? <ActivityIndicator color={colors.rose} /> : <Text style={styles.addText}>＋</Text>}
          </TouchableOpacity>
        ) : <View style={styles.add} />}
      </View>

      {uploading && (
        <View style={styles.progress}><Text style={styles.progressText}>正在放入第 {progress.completed + 1} / {progress.total} 张</Text></View>
      )}

      {locked ? (
        <View style={styles.locked}>
          <Text style={styles.lockedIcon}>✦</Text>
          <Text style={styles.lockedTitle}>这一卷还没有冲洗</Text>
          <Text style={styles.lockedText}>你们都可以继续放照片，到了约定的日子再一起打开。</Text>
          <Text style={styles.unlockDate}>{new Date(roll!.unlockAt!).toLocaleDateString('zh-CN')} 揭晓</Text>
          <TouchableOpacity style={styles.lockedAdd} onPress={chooseSource}><Text style={styles.lockedAddText}>悄悄放一张</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <PhotoGrid photos={photos} userId={userId || ''} onReact={react} onOpen={setPreview} onDelete={remove} />
        </ScrollView>
      )}

      <PhotoPreviewModal photo={preview} userId={userId || ''} onClose={() => setPreview(null)} onDelete={remove} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.whiteBorder },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.white, fontSize: 38, lineHeight: 40 },
  headerCopy: { flex: 1, alignItems: 'center' },
  title: { color: colors.white, fontSize: 17, fontWeight: '700', maxWidth: 220 },
  subtitle: { color: colors.whiteSecondary, fontSize: 10, marginTop: 4 },
  add: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addText: { color: colors.rose, fontSize: 29 },
  progress: { backgroundColor: colors.roseDim, paddingVertical: 8, alignItems: 'center' },
  progressText: { color: colors.roseSoft, fontSize: 10 },
  content: { paddingTop: spacing.lg, paddingBottom: 40 },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44 },
  lockedIcon: { color: colors.rose, fontSize: 48 },
  lockedTitle: { color: colors.white, fontSize: 23, fontWeight: '800', marginTop: 22 },
  lockedText: { color: colors.whiteSecondary, fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: 12 },
  unlockDate: { color: colors.roseSoft, fontSize: 13, fontWeight: '700', marginTop: 18 },
  lockedAdd: { marginTop: 28, backgroundColor: colors.rose, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 16 },
  lockedAddText: { color: colors.bg, fontWeight: '800', fontSize: 13 },
});
