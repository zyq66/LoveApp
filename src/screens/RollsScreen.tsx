import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { Photo, watchPhotos } from '../services/album';
import { coupleRolls, createRoll, MemoryRoll } from '../services/rolls';
import { DatePicker } from '../components/DatePicker';
import { colors, spacing } from '../theme';

type RollCard = {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  cover?: Photo;
  kind: 'custom' | 'month';
  secret?: boolean;
  locked?: boolean;
};

function monthKey(photo: Photo): string {
  return photo.dateKey.slice(0, 7);
}

function monthTitle(key: string): string {
  const [year, month] = key.split('-');
  return `${year} 年 ${Number(month)} 月`;
}

function isLocked(roll: MemoryRoll): boolean {
  return roll.type === 'secret' && !!roll.unlockAt && roll.unlockAt > Date.now();
}

export function RollsScreen({ navigation }: any) {
  const { userId, coupleId, couple } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [createVisible, setCreateVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [secret, setSecret] = useState(false);
  const [unlockAt, setUnlockAt] = useState(new Date(Date.now() + 86400000));
  const [datePicker, setDatePicker] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!coupleId) return;
    return watchPhotos(coupleId, setPhotos);
  }, [coupleId]);

  const cards = useMemo<RollCard[]>(() => {
    const custom = coupleRolls(couple).map(roll => {
      const items = photos.filter(photo => photo.rollId === roll.id);
      return {
        id: roll.id,
        title: roll.title,
        subtitle: roll.type === 'secret'
          ? (isLocked(roll) ? `${new Date(roll.unlockAt!).toLocaleDateString('zh-CN')} 一起揭晓` : '秘密胶卷已揭晓')
          : (roll.status === 'developed' ? '已经冲洗完成' : '正在共同记录'),
        count: items.length,
        cover: items[0],
        kind: 'custom' as const,
        secret: roll.type === 'secret',
        locked: isLocked(roll),
      };
    });

    const monthMap = new Map<string, Photo[]>();
    photos.filter(photo => !photo.rollId).forEach(photo => {
      const key = monthKey(photo);
      const items = monthMap.get(key) || [];
      items.push(photo);
      monthMap.set(key, items);
    });
    const months = Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => ({
        id: key,
        title: monthTitle(key),
        subtitle: key === new Date().toISOString().slice(0, 7) ? '这个月的我们' : '旧时光',
        count: items.length,
        cover: items[0],
        kind: 'month' as const,
      }));
    return [...custom, ...months];
  }, [photos, couple]);

  async function confirmCreate() {
    if (!title.trim() || !coupleId || !userId) return;
    setCreating(true);
    try {
      const roll = await createRoll(
        coupleId,
        userId,
        title,
        secret ? 'secret' : 'normal',
        secret ? unlockAt.getTime() : undefined,
      );
      setCreateVisible(false);
      setTitle('');
      setSecret(false);
      navigation.navigate('RollDetail', {
        rollId: roll.id,
        title: roll.title,
        kind: 'custom',
      });
    } finally {
      setCreating(false);
    }
  }

  function openCard(card: RollCard) {
    navigation.navigate('RollDetail', {
      rollId: card.id,
      title: card.title,
      kind: card.kind,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>OUR FILMS</Text>
          <Text style={styles.title}>共同胶卷</Text>
          <Text style={styles.subtitle}>{photos.length} 个瞬间，正在慢慢变成故事</Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={() => setCreateVisible(true)}>
          <Text style={styles.createIcon}>＋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {cards.map((card, index) => (
          <TouchableOpacity
            key={`${card.kind}-${card.id}`}
            style={[styles.card, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}
            activeOpacity={0.84}
            onPress={() => openCard(card)}
          >
            <View style={styles.coverWrap}>
              {card.cover && !card.locked ? (
                <Image source={{ uri: card.cover.thumbnailUrl }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.emptyCover]}>
                  <Text style={styles.emptyIcon}>{card.locked ? '✦' : '🎞️'}</Text>
                  <Text style={styles.emptyText}>{card.locked ? '还没到揭晓时间' : '等待第一张照片'}</Text>
                </View>
              )}
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{card.locked ? '秘密' : `${card.count} 张`}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>{card.title}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>{card.subtitle}</Text>
          </TouchableOpacity>
        ))}

        {cards.length === 0 && (
          <TouchableOpacity style={styles.emptyState} onPress={() => setCreateVisible(true)}>
            <Text style={styles.emptyStateIcon}>🎞️</Text>
            <Text style={styles.emptyStateTitle}>创建第一卷胶卷</Text>
            <Text style={styles.emptyStateText}>可以是一趟旅行，也可以只是一个普通周末。</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={createVisible} transparent animationType="fade" onRequestClose={() => setCreateVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalEyebrow}>NEW FILM</Text>
            <Text style={styles.modalTitle}>这一卷叫什么？</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="例如：杭州周末"
              placeholderTextColor={colors.whiteSecondary}
              maxLength={24}
              autoFocus
            />
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeButton, !secret && styles.typeActive]} onPress={() => setSecret(false)}>
                <Text style={[styles.typeText, !secret && styles.typeTextActive]}>普通胶卷</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeButton, secret && styles.typeActive]} onPress={() => setSecret(true)}>
                <Text style={[styles.typeText, secret && styles.typeTextActive]}>秘密胶卷</Text>
              </TouchableOpacity>
            </View>
            {secret && (
              <TouchableOpacity style={styles.unlockRow} onPress={() => setDatePicker(true)}>
                <View>
                  <Text style={styles.unlockLabel}>一起揭晓的日期</Text>
                  <Text style={styles.unlockDate}>{unlockAt.toLocaleDateString('zh-CN')}</Text>
                </View>
                <Text style={styles.unlockArrow}>›</Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCreateVisible(false)}><Text style={styles.cancel}>取消</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.confirm, (!title.trim() || creating) && styles.disabled]} onPress={confirmCreate} disabled={!title.trim() || creating}>
                <Text style={styles.confirmText}>{creating ? '创建中…' : '开始记录'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DatePicker
        visible={datePicker}
        value={unlockAt}
        minimumDate={new Date()}
        onChange={date => {
          date.setHours(23, 59, 0, 0);
          setUnlockAt(date);
          setDatePicker(false);
        }}
        onCancel={() => setDatePicker(false)}
      />
    </SafeAreaView>
  );
}

const CARD_GAP = 12;
const CARD_WIDTH = (Dimensions.get('window').width - spacing.lg * 2 - CARD_GAP) / 2;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.rose, fontSize: 10, fontWeight: '800', letterSpacing: 2.5 },
  title: { color: colors.white, fontSize: 29, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.whiteSecondary, fontSize: 11, marginTop: 6 },
  createButton: { width: 46, height: 46, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.roseDim, borderWidth: 1, borderColor: colors.roseBorder },
  createIcon: { color: colors.rose, fontSize: 27, lineHeight: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, paddingBottom: 40 },
  card: { width: CARD_WIDTH, marginBottom: 25 },
  cardLeft: { marginRight: CARD_GAP / 2 },
  cardRight: { marginLeft: CARD_GAP / 2 },
  coverWrap: { height: 218, borderRadius: 23, overflow: 'hidden', backgroundColor: colors.bgLight },
  cover: { width: '100%', height: '100%' },
  emptyCover: { alignItems: 'center', justifyContent: 'center', padding: 14, backgroundColor: colors.roseDim, borderWidth: 1, borderColor: colors.roseBorder },
  emptyIcon: { fontSize: 30 },
  emptyText: { color: colors.whiteSecondary, fontSize: 10, textAlign: 'center', marginTop: 9 },
  countBadge: { position: 'absolute', right: 9, bottom: 9, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: 'rgba(16,13,23,0.78)' },
  countText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  cardTitle: { color: colors.white, fontSize: 14, fontWeight: '700', marginTop: 11 },
  cardSubtitle: { color: colors.whiteSecondary, fontSize: 10, marginTop: 4 },
  emptyState: { width: '100%', paddingVertical: 70, alignItems: 'center', borderRadius: 28, backgroundColor: colors.bgLight },
  emptyStateIcon: { fontSize: 40 },
  emptyStateTitle: { color: colors.white, fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptyStateText: { color: colors.whiteSecondary, fontSize: 12, marginTop: 8 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.56)' },
  modal: { backgroundColor: colors.bgLight, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.lg, paddingBottom: 36, borderWidth: 1, borderColor: colors.whiteBorder },
  modalEyebrow: { color: colors.rose, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  modalTitle: { color: colors.white, fontSize: 23, fontWeight: '800', marginTop: 7 },
  input: { marginTop: 22, height: 54, borderRadius: 17, paddingHorizontal: 16, color: colors.white, backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder, fontSize: 16 },
  typeRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  typeButton: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder },
  typeActive: { backgroundColor: colors.roseDim, borderColor: colors.roseBorder },
  typeText: { color: colors.whiteSecondary, fontSize: 12, fontWeight: '600' },
  typeTextActive: { color: colors.roseSoft },
  unlockRow: { marginTop: 14, padding: 15, borderRadius: 17, backgroundColor: colors.whiteDim, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unlockLabel: { color: colors.whiteSecondary, fontSize: 10 },
  unlockDate: { color: colors.white, fontSize: 14, fontWeight: '600', marginTop: 4 },
  unlockArrow: { color: colors.rose, fontSize: 28 },
  modalActions: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 22 },
  cancel: { color: colors.whiteSecondary, fontSize: 14 },
  confirm: { backgroundColor: colors.rose, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 13 },
  confirmText: { color: colors.bg, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.45 },
});
