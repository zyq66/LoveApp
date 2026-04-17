// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
  Modal, TextInput, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { DatePicker } from '../components/DatePicker';
import { generateAnniversaryWish } from '../services/ai';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../store/AuthContext';
import {
  getAnniversaries, addAnniversary, deleteAnniversary, Anniversary,
} from '../services/anniversaries';
import { db } from '../config/cloudbase';
import { colors, spacing } from '../theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function scheduleAnniversaryNotifications(anniversaries: Anniversary[]) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const a of anniversaries) {
    const triggerDate = new Date(a.date - 86400000);
    if (triggerDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: { title: '明天是纪念日 🎉', body: `明天是 ${a.name}，别忘了！` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });
    }
  }
}

function formatStartDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function daysLeftLabel(date: number): { text: string; urgent: boolean } {
  const d = Math.ceil((date - Date.now()) / 86400000);
  if (d === 0) return { text: '就是今天 🎉', urgent: true };
  if (d > 0) return { text: `${d} 天后`, urgent: d <= 7 };
  return { text: `${Math.abs(d)} 天前`, urgent: false };
}

export function HomeScreen() {
  const { userId, coupleId } = useAuth();
  const [daysTogether, setDaysTogether] = useState(0);
  const [startDate, setStartDate] = useState(0);
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputName, setInputName] = useState('');
  const [annPickerDate, setAnnPickerDate] = useState(new Date());
  const [showAnnPicker, setShowAnnPicker] = useState(false);

  const [myAvatar, setMyAvatar] = useState('');
  const [partnerAvatar, setPartnerAvatar] = useState('');
  const [myNickname, setMyNickname] = useState('');
  const [partnerNickname, setPartnerNickname] = useState('');

  // AI wish
  const [wishModal, setWishModal] = useState(false);
  const [wishTarget, setWishTarget] = useState<Anniversary | null>(null);
  const [wishText, setWishText] = useState('');
  const [wishLoading, setWishLoading] = useState(false);

  // 每次切回首页都重新拉取所有数据（在一起日期、头像、昵称、纪念日）
  useFocusEffect(
    React.useCallback(() => {
      if (!coupleId || !userId) return;

      db.collection('couples').doc(coupleId).get().then(async (coupleRes: any) => {
        const coupleList = coupleRes.data as any[];
        if (!coupleList || coupleList.length === 0) return;
        const data = coupleList[0];
        const days = Math.floor((Date.now() - data.startDate) / 86400000);
        setDaysTogether(Math.max(0, days));
        setStartDate(data.startDate || 0);

        const partnerId = data.user1 === userId ? data.user2 : data.user1;
        const [myRes, partnerRes] = await Promise.all([
          db.collection('users').doc(userId).get(),
          partnerId ? db.collection('users').doc(partnerId).get() : Promise.resolve(null),
        ]);
        const myData = ((myRes as any)?.data as any[])?.[0];
        if (myData) {
          setMyAvatar(myData.avatarUrl || '');
          setMyNickname(myData.nickname || '');
        }
        const partnerData = ((partnerRes as any)?.data as any[])?.[0];
        if (partnerData) {
          setPartnerAvatar(partnerData.avatarUrl || '');
          setPartnerNickname(partnerData.nickname || '');
        }
      });

      getAnniversaries(coupleId).then(list => {
        setAnniversaries(list);
        scheduleAnniversaryNotifications(list);
      });
    }, [coupleId, userId])
  );

  function closeModal() {
    setModalVisible(false);
    setInputName('');
    setAnnPickerDate(new Date());
  }

  async function handleConfirmAdd() {
    if (!inputName.trim() || !coupleId) return;
    const picked = new Date(annPickerDate);
    const now = new Date();
    picked.setFullYear(now.getFullYear());
    if (picked.getTime() < Date.now()) picked.setFullYear(now.getFullYear() + 1);
    await addAnniversary(coupleId, inputName.trim(), picked.getTime());
    const updated = await getAnniversaries(coupleId);
    setAnniversaries(updated);
    closeModal();
  }

  function handleLongPressAnniversary(item: Anniversary) {
    Alert.alert(item.name, '选择操作', [
      { text: '取消', style: 'cancel' },
      {
        text: '✨ AI 生成祝福', onPress: async () => {
          setWishTarget(item);
          setWishText('');
          setWishModal(true);
          setWishLoading(true);
          try {
            const daysLeft = Math.ceil((item.date - Date.now()) / 86400000);
            const result = await generateAnniversaryWish(item.name, Math.max(0, daysLeft));
            setWishText(result);
          } catch {
            setWishText('生成失败，请稍后再试');
          } finally {
            setWishLoading(false);
          }
        },
      },
      { text: '删除', style: 'destructive', onPress: () => handleDeleteAnniversary(item.id) },
    ]);
  }

  async function handleDeleteAnniversary(itemId: string) {
    if (!coupleId) return;
    Alert.alert('删除纪念日', '确定要删除这个纪念日吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive', onPress: async () => {
          await deleteAnniversary(coupleId, itemId);
          setAnniversaries(prev => prev.filter(a => a.id !== itemId));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero Section ── */}
        <View style={styles.hero}>

          {/* Decorative dots */}
          <View style={styles.dotsRow}>
            {['✦', '·', '✦', '·', '✦'].map((d, i) => (
              <Text key={i} style={[styles.dot, i === 2 && styles.dotBig]}>{d}</Text>
            ))}
          </View>

          {/* Avatar pair */}
          <View style={styles.avatarRow}>
            {/* Me */}
            <View style={styles.avatarCol}>
              {myAvatar
                ? <Image source={{ uri: myAvatar }} style={styles.avatar} />
                : <View style={styles.avatar}><Text style={styles.avatarEmoji}>👤</Text></View>
              }
              <Text style={styles.nicknameMe} numberOfLines={1}>
                {myNickname || '你'}
              </Text>
            </View>

            {/* Heart */}
            <View style={styles.heartWrap}>
              <Text style={styles.heartGlow}>♥</Text>
            </View>

            {/* Partner */}
            <View style={styles.avatarCol}>
              {partnerAvatar
                ? <Image source={{ uri: partnerAvatar }} style={styles.avatar} />
                : <View style={styles.avatar}><Text style={styles.avatarEmoji}>👤</Text></View>
              }
              <Text style={styles.nicknamePartner} numberOfLines={1}>
                {partnerNickname || 'TA'}
              </Text>
            </View>
          </View>

          {/* Days counter */}
          <View style={styles.daysWrap}>
            <Text style={styles.daysPrefix}>在一起的第</Text>
            <Text style={styles.daysNum}>{daysTogether}</Text>
            <Text style={styles.daysSuffix}>天</Text>
          </View>

          {startDate > 0 && (
            <Text style={styles.startDateText}>
              ♡  自 {formatStartDate(startDate)} 相恋至今
            </Text>
          )}
        </View>

        {/* ── Anniversary Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>纪念日</Text>
            <TouchableOpacity style={styles.addCircleBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.addCircleBtnText}>＋</Text>
            </TouchableOpacity>
          </View>

          {anniversaries.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>还没有纪念日，添加一个吧</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardList}
            >
              {anniversaries.map(a => {
                const { text, urgent } = daysLeftLabel(a.date);
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.annCard, urgent && styles.annCardUrgent]}
                    onLongPress={() => handleLongPressAnniversary(a)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.annCardEmoji}>🗓</Text>
                    <Text style={[styles.annCardName, urgent && styles.annCardNameUrgent]} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text style={[styles.annCardDays, urgent && styles.annCardDaysUrgent]}>
                      {text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

      </ScrollView>

      {/* AI wish modal */}
      <Modal visible={wishModal} transparent animationType="fade" onRequestClose={() => setWishModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>✨ {wishTarget?.name} 祝福文案</Text>
            {wishLoading ? (
              <View style={styles.wishLoading}>
                <ActivityIndicator color={colors.green} />
                <Text style={styles.wishLoadingText}>AI 生成中…</Text>
              </View>
            ) : (
              <Text style={styles.wishText}>{wishText}</Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setWishModal(false)}>
                <Text style={styles.modalCancel}>关闭</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add anniversary modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>添加纪念日</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="名称（如：生日、第一次约会）"
              placeholderTextColor={colors.whiteSecondary}
              value={inputName}
              onChangeText={setInputName}
              autoFocus
            />
            <TouchableOpacity style={styles.dateField} onPress={() => setShowAnnPicker(true)}>
              <Text style={styles.dateFieldLabel}>日期</Text>
              <Text style={styles.dateFieldValue}>
                {`${annPickerDate.getMonth() + 1} 月 ${annPickerDate.getDate()} 日`}
              </Text>
            </TouchableOpacity>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.modalCancel}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleConfirmAdd}>
                <Text style={styles.modalConfirmText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DatePicker
        visible={showAnnPicker}
        value={annPickerDate}
        onChange={(d) => { setAnnPickerDate(d); setShowAnnPicker(false); }}
        onCancel={() => setShowAnnPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingBottom: 100 },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },

  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.lg },
  dot: { color: colors.whiteSecondary, fontSize: 10 },
  dotBig: { color: colors.green, fontSize: 14 },

  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: 0,
  },
  avatarCol: { alignItems: 'center', width: 100 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.whiteDim,
    borderWidth: 2.5, borderColor: colors.greenBorder,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarEmoji: { fontSize: 34 },
  nicknameMe: {
    marginTop: 8,
    fontSize: 13, fontWeight: '600',
    color: colors.green,
    maxWidth: 90, textAlign: 'center',
  },
  nicknamePartner: {
    marginTop: 8,
    fontSize: 13, fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    maxWidth: 90, textAlign: 'center',
  },

  heartWrap: {
    width: 56, alignItems: 'center',
    marginTop: -24, // raise heart to avatar center level
  },
  heartGlow: {
    fontSize: 32, color: colors.green,
    textShadowColor: 'rgba(74,222,128,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },

  daysWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 10 },
  daysPrefix: { fontSize: 16, color: colors.whiteSecondary, marginBottom: 14 },
  daysNum: {
    fontSize: 88, fontWeight: '800', color: colors.white,
    letterSpacing: -4, lineHeight: 88,
  },
  daysSuffix: { fontSize: 20, color: colors.whiteSecondary, fontWeight: '300', marginBottom: 14 },

  startDateText: {
    fontSize: 12, color: colors.whiteSecondary,
    letterSpacing: 0.5, marginTop: 4,
  },

  // ── Anniversary ──
  section: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.white, letterSpacing: 0.5 },
  addCircleBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: colors.whiteBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  addCircleBtnText: { color: colors.whiteSecondary, fontSize: 16, lineHeight: 20 },

  emptyRow: { paddingVertical: spacing.md },
  emptyText: { color: colors.whiteSecondary, fontSize: 13 },

  cardList: { gap: 12, paddingBottom: 4, paddingRight: spacing.lg },
  annCard: {
    width: 110,
    backgroundColor: colors.bgLight,
    borderRadius: 16,
    borderWidth: 1, borderColor: colors.whiteBorder,
    padding: 14,
    gap: 6,
  },
  annCardUrgent: {
    backgroundColor: colors.greenDim,
    borderColor: colors.greenBorder,
  },
  annCardEmoji: { fontSize: 22 },
  annCardName: { fontSize: 13, fontWeight: '600', color: colors.white },
  annCardNameUrgent: { color: colors.green },
  annCardDays: { fontSize: 11, color: colors.whiteSecondary },
  annCardDaysUrgent: { color: colors.green, fontWeight: '600' },

  // ── Modals ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#16213e', borderRadius: 20, padding: spacing.lg, width: '85%', borderWidth: 1, borderColor: colors.whiteBorder },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: spacing.md },
  modalInput: { backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder, borderRadius: 10, padding: spacing.md, color: colors.white, fontSize: 15, marginBottom: spacing.md },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  dateField: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder,
    borderRadius: 10, padding: spacing.md, marginBottom: spacing.md,
  },
  dateFieldLabel: { fontSize: 14, color: colors.whiteSecondary },
  dateFieldValue: { fontSize: 15, color: colors.green, fontWeight: '600' },
  modalCancel: { color: colors.whiteSecondary, fontSize: 15, padding: spacing.sm },
  modalConfirm: { backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalConfirmText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
  wishLoading: { alignItems: 'center', paddingVertical: spacing.lg, gap: 8 },
  wishLoadingText: { color: colors.whiteSecondary, fontSize: 13 },
  wishText: { color: colors.white, fontSize: 15, lineHeight: 24, marginBottom: spacing.md },
});
