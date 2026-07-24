import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import {
  addPhotoReaction,
  deletePhoto,
  Photo,
  removePhotoReaction,
  watchPhotos,
} from '../services/album';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { colors, spacing } from '../theme';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function todayKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthDay(): string {
  const date = new Date();
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayLabel(): string {
  const date = new Date();
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function daysTogether(startDate: number): number {
  if (!startDate) return 0;
  return Math.max(1, Math.floor((Date.now() - startDate) / 86400000) + 1);
}

function displayName(value?: string, fallback = '你'): string {
  return value?.trim() || fallback;
}

export function TodayScreen() {
  const { userId, coupleId, user, partner, couple } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preview, setPreview] = useState<Photo | null>(null);
  const { chooseSource, uploading, progress } = usePhotoPicker();

  useEffect(() => {
    if (!coupleId) return;
    return watchPhotos(coupleId, setPhotos);
  }, [coupleId]);

  const visiblePhotos = photos.filter(photo => !photo.hiddenUntil || photo.hiddenUntil <= Date.now());
  const todayPhotos = visiblePhotos.filter(photo => photo.dateKey === todayKey());
  const mineToday = todayPhotos.find(photo => photo.uploadedBy === userId);
  const theirsToday = todayPhotos.find(photo => photo.uploadedBy !== userId);
  const latestPartnerPhoto = visiblePhotos.find(photo => (
    partner?._id ? photo.uploadedBy === partner._id : photo.uploadedBy !== userId
  ));

  const resurfaced = useMemo(() => {
    const exact = visiblePhotos.find(photo => photo.monthDay === monthDay() && photo.dateKey !== todayKey());
    if (exact) return exact;
    if (visiblePhotos.length === 0) return undefined;
    const dayIndex = Math.floor(Date.now() / 86400000);
    return visiblePhotos[dayIndex % visiblePhotos.length];
  }, [photos, partner?._id, userId]);

  async function react(photo: Photo, emoji: string) {
    if (!userId) return;
    if (photo.reactions?.[userId] === emoji) await removePhotoReaction(photo.id, userId);
    else await addPhotoReaction(photo.id, userId, emoji);
  }

  function remove(photo: Photo) {
    if (!userId || !coupleId) return;
    Alert.alert('移出我们的胶卷？', '照片会从 App 中移除，手机里的原图不会受影响。', [
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.dateLabel}>今天 · {todayLabel()}</Text>
            <Text style={styles.pageTitle}>我们的此刻</Text>
          </View>
          <View style={styles.avatarPair}>
            {user?.avatarUrl
              ? <Image source={{ uri: user.avatarUrl }} style={styles.miniAvatar} />
              : <View style={[styles.miniAvatar, styles.avatarFallback]}><Text>🌙</Text></View>}
            {partner?.avatarUrl
              ? <Image source={{ uri: partner.avatarUrl }} style={[styles.miniAvatar, styles.partnerAvatar]} />
              : <View style={[styles.miniAvatar, styles.avatarFallback, styles.partnerAvatar]}><Text>🌷</Text></View>}
          </View>
        </View>

        <View style={styles.daysCard}>
          <Text style={styles.daysSmall}>我们一起走过</Text>
          <View style={styles.daysLine}>
            <Text style={styles.daysNumber}>{daysTogether(couple?.startDate || 0)}</Text>
            <Text style={styles.daysUnit}>天</Text>
          </View>
          <Text style={styles.daysNames}>
            {displayName(user?.nickname)}  ♡  {displayName(partner?.nickname, 'TA')}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>今天的我们</Text>
            <Text style={styles.sectionHint}>一人一张，就拼成了同一天</Text>
          </View>
          <TouchableOpacity onPress={chooseSource} disabled={uploading}>
            <Text style={styles.actionText}>{uploading ? `${progress.completed}/${progress.total}` : '放一张 ＋'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dailyPair}>
          <DailySlot
            photo={mineToday}
            label={displayName(user?.nickname)}
            placeholder="我的今天"
            onPress={() => mineToday ? setPreview(mineToday) : chooseSource()}
          />
          <View style={styles.pairHeart}><Text style={styles.pairHeartText}>♡</Text></View>
          <DailySlot
            photo={theirsToday}
            label={displayName(partner?.nickname, 'TA')}
            placeholder="等 TA 放入"
            onPress={() => theirsToday && setPreview(theirsToday)}
          />
        </View>

        {latestPartnerPhoto && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>TA 刚刚留下的</Text>
                <Text style={styles.sectionHint}>看见同一个生活的另一面</Text>
              </View>
              <TouchableOpacity style={styles.heartButton} onPress={() => react(latestPartnerPhoto, '❤️')}>
                <Text style={styles.heartButtonText}>
                  {latestPartnerPhoto.reactions?.[userId || ''] === '❤️' ? '♥' : '♡'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.88} onPress={() => setPreview(latestPartnerPhoto)}>
              <Image source={{ uri: latestPartnerPhoto.thumbnailUrl }} style={styles.featurePhoto} />
              <View style={styles.photoOverlay}>
                <Text style={styles.photoDate}>{new Date(latestPartnerPhoto.shotAt).toLocaleDateString('zh-CN')}</Text>
                {!!latestPartnerPhoto.caption && <Text style={styles.photoCaption}>{latestPartnerPhoto.caption}</Text>}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {resurfaced && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>再次遇见</Text>
                <Text style={styles.sectionHint}>
                  {resurfaced.monthDay === monthDay() ? '从前的今天' : '随机翻到的一页'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.memoryRow} activeOpacity={0.82} onPress={() => setPreview(resurfaced)}>
              <Image source={{ uri: resurfaced.thumbnailUrl }} style={styles.memoryThumb} />
              <View style={styles.memoryCopy}>
                <Text style={styles.memoryDate}>{new Date(resurfaced.shotAt).toLocaleDateString('zh-CN')}</Text>
                <Text style={styles.memoryText} numberOfLines={2}>
                  {resurfaced.caption || '那一天没有写下什么，但照片替我们记住了。'}
                </Text>
                <Text style={styles.memoryLink}>打开这段回忆  ›</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {photos.length === 0 && (
          <TouchableOpacity style={styles.firstImport} onPress={chooseSource}>
            <Text style={styles.firstImportEmoji}>🎞️</Text>
            <Text style={styles.firstImportTitle}>放进第一批共同照片</Text>
            <Text style={styles.firstImportText}>一次可以选择 20 张，让这里从第一天就有回忆。</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <PhotoPreviewModal photo={preview} userId={userId || ''} onClose={() => setPreview(null)} onDelete={remove} />
    </SafeAreaView>
  );
}

function DailySlot({
  photo,
  label,
  placeholder,
  onPress,
}: {
  photo?: Photo;
  label: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.dailySlot} activeOpacity={0.8} onPress={onPress}>
      {photo ? (
        <Image source={{ uri: photo.thumbnailUrl }} style={styles.dailyImage} />
      ) : (
        <View style={styles.dailyPlaceholder}>
          <Text style={styles.dailyPlus}>＋</Text>
          <Text style={styles.dailyPlaceholderText}>{placeholder}</Text>
        </View>
      )}
      <View style={styles.dailyLabel}><Text style={styles.dailyLabelText}>{label}</Text></View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 38 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel: { color: colors.rose, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  pageTitle: { color: colors.white, fontSize: 29, fontWeight: '800', marginTop: 6 },
  avatarPair: { flexDirection: 'row', paddingRight: 8 },
  miniAvatar: { width: 39, height: 39, borderRadius: 15, borderWidth: 2, borderColor: colors.bg },
  avatarFallback: { backgroundColor: colors.bgLight, alignItems: 'center', justifyContent: 'center' },
  partnerAvatar: { marginLeft: -10 },
  daysCard: {
    marginTop: 25, padding: 22, borderRadius: 28, overflow: 'hidden',
    backgroundColor: colors.roseDim, borderWidth: 1, borderColor: colors.roseBorder,
  },
  daysSmall: { color: colors.roseSoft, fontSize: 12, fontWeight: '600' },
  daysLine: { flexDirection: 'row', alignItems: 'baseline', marginTop: 3 },
  daysNumber: { color: colors.white, fontSize: 52, lineHeight: 60, fontWeight: '800', letterSpacing: -2 },
  daysUnit: { color: colors.roseSoft, fontSize: 15, marginLeft: 8 },
  daysNames: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4 },
  section: { marginTop: 32 },
  sectionHeader: { marginTop: 30, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  sectionHint: { color: colors.whiteSecondary, fontSize: 11, marginTop: 4 },
  actionText: { color: colors.rose, fontSize: 12, fontWeight: '700' },
  dailyPair: { flexDirection: 'row', alignItems: 'center' },
  dailySlot: { flex: 1, height: 210, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.bgLight },
  dailyImage: { width: '100%', height: '100%' },
  dailyPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.whiteBorder, borderRadius: 24,
  },
  dailyPlus: { color: colors.rose, fontSize: 30, fontWeight: '300' },
  dailyPlaceholderText: { color: colors.whiteSecondary, fontSize: 11, marginTop: 6 },
  dailyLabel: {
    position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(16,13,23,0.75)',
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10,
  },
  dailyLabelText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  pairHeart: {
    width: 30, height: 30, borderRadius: 15, marginHorizontal: -6, zIndex: 2,
    backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.bg,
  },
  pairHeartText: { color: colors.bg, fontSize: 17, fontWeight: '800' },
  heartButton: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.roseDim, borderWidth: 1, borderColor: colors.roseBorder,
  },
  heartButtonText: { color: colors.rose, fontSize: 22 },
  featurePhoto: { width: '100%', height: 330, borderRadius: 26, backgroundColor: colors.bgLight },
  photoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18 },
  photoDate: { color: colors.white, fontSize: 11, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 6 },
  photoCaption: { color: colors.white, fontSize: 15, fontWeight: '600', marginTop: 4, textShadowColor: '#000', textShadowRadius: 8 },
  memoryRow: {
    flexDirection: 'row', padding: 12, borderRadius: 22, backgroundColor: colors.bgLight,
    borderWidth: 1, borderColor: colors.whiteBorder,
  },
  memoryThumb: { width: 112, height: 126, borderRadius: 16, backgroundColor: colors.whiteDim },
  memoryCopy: { flex: 1, padding: 9, paddingLeft: 15 },
  memoryDate: { color: colors.rose, fontSize: 11, fontWeight: '700' },
  memoryText: { color: colors.white, fontSize: 13, lineHeight: 20, marginTop: 9 },
  memoryLink: { color: colors.whiteSecondary, fontSize: 11, marginTop: 'auto' },
  firstImport: {
    marginTop: 36, alignItems: 'center', padding: 32, borderRadius: 28,
    backgroundColor: colors.bgLight, borderWidth: 1, borderColor: colors.roseBorder,
  },
  firstImportEmoji: { fontSize: 38 },
  firstImportTitle: { color: colors.white, fontSize: 17, fontWeight: '700', marginTop: 12 },
  firstImportText: { color: colors.whiteSecondary, fontSize: 12, textAlign: 'center', lineHeight: 19, marginTop: 8 },
});
