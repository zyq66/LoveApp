// src/screens/ProfileScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../store/AuthContext';
import { getProfile, saveProfile, Profile, DEFAULT_PROFILE } from '../services/profile';
import { DatePicker } from '../components/DatePicker';
import { colors, spacing } from '../theme';

// ── helpers ──────────────────────────────────────────────────────────────────

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'];
const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
];
const HABIT_PRESETS = ['爱赖床', '睡前刷手机', '喜欢开灯睡', '起床困难', '爱干净', '丢三落四', '夜猫子', '早起鸟'];
const HOBBY_PRESETS = ['追剧', '打游戏', '逛街', '读书', '健身', '做饭', '摄影', '音乐', '旅行', '画画'];

function zodiacFromDate(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const m = d.getMonth() + 1, day = d.getDate();
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return '♈ 白羊座';
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return '♉ 金牛座';
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return '♊ 双子座';
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return '♋ 巨蟹座';
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return '♌ 狮子座';
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return '♍ 处女座';
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return '♎ 天秤座';
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return '♏ 天蝎座';
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return '♐ 射手座';
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return '♑ 摩羯座';
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return '♒ 水瓶座';
  return '♓ 双鱼座';
}

function formatBirthday(ts: number): string {
  if (!ts) return '未设置';
  const d = new Date(ts);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function nextPeriodDate(start: number, cycle: number): Date {
  let next = new Date(start);
  const now = Date.now();
  while (next.getTime() <= now) {
    next = new Date(next.getTime() + cycle * 86400000);
  }
  return next;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

// ── TagRow ───────────────────────────────────────────────────────────────────

function TagRow({
  tags, presets, onAdd, onRemove, color = colors.green,
}: {
  tags: string[];
  presets?: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
  color?: string;
}) {
  const [modal, setModal] = useState(false);
  const [input, setInput] = useState('');

  function confirm(val: string) {
    const v = val.trim();
    if (v && !tags.includes(v)) onAdd(v);
    setInput('');
    setModal(false);
  }

  return (
    <View style={tagStyles.wrap}>
      {tags.map(t => (
        <TouchableOpacity
          key={t}
          style={[tagStyles.tag, { borderColor: color + '66', backgroundColor: color + '1a' }]}
          onLongPress={() => Alert.alert('删除标签', `删除「${t}」？`, [
            { text: '取消', style: 'cancel' },
            { text: '删除', style: 'destructive', onPress: () => onRemove(t) },
          ])}
        >
          <Text style={[tagStyles.tagText, { color }]}>{t}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[tagStyles.tag, tagStyles.addTag]}
        onPress={() => setModal(true)}
      >
        <Text style={tagStyles.addText}>＋</Text>
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <View style={tagStyles.overlay}>
          <View style={tagStyles.modalBox}>
            <Text style={tagStyles.modalTitle}>添加标签</Text>
            <TextInput
              style={tagStyles.modalInput}
              placeholder="输入或选择"
              placeholderTextColor={colors.whiteSecondary}
              value={input}
              onChangeText={setInput}
              autoFocus
              maxLength={12}
              onSubmitEditing={() => confirm(input)}
            />
            {presets && (
              <View style={tagStyles.presetRow}>
                {presets.filter(p => !tags.includes(p)).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={tagStyles.presetChip}
                    onPress={() => confirm(p)}
                  >
                    <Text style={tagStyles.presetText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={tagStyles.modalBtns}>
              <TouchableOpacity onPress={() => { setModal(false); setInput(''); }}>
                <Text style={tagStyles.cancelBtn}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tagStyles.confirmBtn}
                onPress={() => confirm(input)}
              >
                <Text style={tagStyles.confirmBtnText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const tagStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  tagText: { fontSize: 13 },
  addTag: { borderColor: colors.whiteBorder, backgroundColor: colors.whiteDim },
  addText: { fontSize: 14, color: colors.whiteSecondary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: {
    backgroundColor: '#16213e', borderRadius: 16, padding: spacing.lg,
    width: '85%', borderWidth: 1, borderColor: colors.whiteBorder,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.white, marginBottom: spacing.md },
  modalInput: {
    backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder,
    borderRadius: 10, padding: spacing.md, color: colors.white, fontSize: 15,
    marginBottom: spacing.sm,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  presetChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 16, borderWidth: 1, borderColor: colors.whiteBorder,
    backgroundColor: colors.whiteDim,
  },
  presetText: { fontSize: 12, color: colors.whiteSecondary },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: spacing.sm },
  cancelBtn: { color: colors.whiteSecondary, fontSize: 15, padding: spacing.sm },
  confirmBtn: { backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  confirmBtnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { userId, coupleId, gender, partner } = useAuth();
  const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILE });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 派生：实时跟随伴侣文档
  const partnerAvatar = partner?.avatarUrl ?? '';
  const partnerNickname = partner?.nickname || 'TA';

  // pickers / editors
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showBloodModal, setShowBloodModal] = useState(false);
  const [showMbtiModal, setShowMbtiModal] = useState(false);
  const [showHeightModal, setShowHeightModal] = useState(false);
  const [heightInput, setHeightInput] = useState('');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showPeriodDatePicker, setShowPeriodDatePicker] = useState(false);
  const [periodCycleInput, setPeriodCycleInput] = useState('');
  const [memoEditing, setMemoEditing] = useState(false);
  const [memoInput, setMemoInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!userId || !coupleId) return;
      load();
    }, [userId, coupleId]),
  );

  async function load() {
    setLoading(true);
    try {
      setProfile(await getProfile(userId!));
      // partner 头像/昵称由 AuthContext 实时提供，不再手动 fetch
    } finally {
      setLoading(false);
    }
  }

  async function save(updated: Profile) {
    setProfile(updated);
    setSaving(true);
    try {
      await saveProfile(userId!, coupleId!, updated);
    } finally {
      setSaving(false);
    }
  }

  function update(patch: Partial<Profile>) {
    const updated = { ...profile, ...patch };
    save(updated);
  }

  // ── Period helpers ──
  const hasPeriod = profile.periodStart > 0;
  const nextPeriod = hasPeriod ? nextPeriodDate(profile.periodStart, profile.periodCycle) : null;
  const daysUntilPeriod = nextPeriod
    ? Math.ceil((nextPeriod.getTime() - Date.now()) / 86400000)
    : null;
  const periodUrgent = daysUntilPeriod !== null && daysUntilPeriod <= 3;
  const periodProgress = nextPeriod
    ? 1 - daysUntilPeriod! / profile.periodCycle
    : 0;

  const zodiac = zodiacFromDate(profile.birthday);

  if (!coupleId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>💑</Text>
          <Text style={{ fontSize: 16, color: colors.white, fontWeight: '700', marginBottom: 8 }}>还未配对</Text>
          <Text style={{ fontSize: 13, color: colors.whiteSecondary, textAlign: 'center' }}>
            请先去首页完成配对，才能查看和编辑 TA 的档案
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.green} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* ── 顶部 header ── */}
        <View style={styles.header}>
          {partnerAvatar
            ? <Image source={{ uri: partnerAvatar }} style={styles.avatar} />
            : <View style={styles.avatar}><Text style={{ fontSize: 36 }}>👤</Text></View>
          }
          <Text style={styles.name}>{partnerNickname}</Text>
          <View style={styles.tagRow}>
            {zodiac ? <Text style={styles.headerTag}>{zodiac}</Text> : null}
            {profile.bloodType ? <Text style={styles.headerTag}>{profile.bloodType} 型</Text> : null}
            {profile.mbti ? <Text style={styles.headerTag}>{profile.mbti}</Text> : null}
          </View>
          {saving && <Text style={styles.savingHint}>保存中…</Text>}
        </View>

        {/* ── 基本信息 ── */}
        <Text style={styles.sectionTitle}>📋 基本信息</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => setShowBirthdayPicker(true)}>
            <Text style={styles.rowLabel}>生日</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{formatBirthday(profile.birthday)}</Text>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => setShowBloodModal(true)}>
            <Text style={styles.rowLabel}>血型</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{profile.bloodType || '未设置'}</Text>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => setShowMbtiModal(true)}>
            <Text style={styles.rowLabel}>MBTI</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{profile.mbti || '未设置'}</Text>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={() => {
            setHeightInput(profile.height);
            setShowHeightModal(true);
          }}>
            <Text style={styles.rowLabel}>身高</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{profile.height ? `${profile.height} cm` : '未设置'}</Text>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 饮食偏好 ── */}
        <Text style={styles.sectionTitle}>🍜 饮食偏好</Text>
        <View style={styles.card}>
          <View style={styles.tagSection}>
            <Text style={styles.tagSectionLabel}>❤️ 爱吃</Text>
            <TagRow
              tags={profile.favFoods}
              onAdd={t => update({ favFoods: [...profile.favFoods, t] })}
              onRemove={t => update({ favFoods: profile.favFoods.filter(x => x !== t) })}
              color={colors.green}
            />
          </View>
          <View style={[styles.tagSection, { borderTopWidth: 1, borderTopColor: colors.whiteBorder, marginTop: spacing.sm, paddingTop: spacing.sm }]}>
            <Text style={styles.tagSectionLabel}>🚫 不吃 / 过敏</Text>
            <TagRow
              tags={profile.noFoods}
              onAdd={t => update({ noFoods: [...profile.noFoods, t] })}
              onRemove={t => update({ noFoods: profile.noFoods.filter(x => x !== t) })}
              color="#f87171"
            />
          </View>
        </View>

        {/* ── 习惯癖好 ── */}
        <Text style={styles.sectionTitle}>✨ 习惯癖好</Text>
        <View style={styles.card}>
          <View style={styles.tagSection}>
            <Text style={styles.hintText}>长按标签可删除</Text>
            <TagRow
              tags={profile.habits}
              presets={HABIT_PRESETS}
              onAdd={t => update({ habits: [...profile.habits, t] })}
              onRemove={t => update({ habits: profile.habits.filter(x => x !== t) })}
            />
          </View>
        </View>

        {/* ── 兴趣爱好 ── */}
        <Text style={styles.sectionTitle}>🎮 兴趣爱好</Text>
        <View style={styles.card}>
          <View style={styles.tagSection}>
            <Text style={styles.hintText}>长按标签可删除</Text>
            <TagRow
              tags={profile.hobbies}
              presets={HOBBY_PRESETS}
              onAdd={t => update({ hobbies: [...profile.hobbies, t] })}
              onRemove={t => update({ hobbies: profile.hobbies.filter(x => x !== t) })}
            />
          </View>
        </View>

        {/* ── 生理期（仅男生可见，用来关心女朋友） ── */}
        {gender === 'male' && <Text style={styles.sectionTitle}>🌸 生理期</Text>}
        {gender === 'male' && (
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => setShowPeriodDatePicker(true)}>
              <Text style={styles.rowLabel}>上次开始</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{profile.periodStart ? formatDate(profile.periodStart) : '未设置'}</Text>
                <Text style={styles.arrow}>›</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, !hasPeriod && styles.rowLast]} onPress={() => {
              setPeriodCycleInput(String(profile.periodCycle));
              setShowPeriodModal(true);
            }}>
              <Text style={styles.rowLabel}>周期</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{profile.periodCycle} 天</Text>
                <Text style={styles.arrow}>›</Text>
              </View>
            </TouchableOpacity>
            {hasPeriod && nextPeriod && (
              <View style={[styles.periodResult, styles.rowLast]}>
                <View style={styles.periodInfo}>
                  <Text style={styles.periodLabel}>下次预计</Text>
                  <Text style={[styles.periodDate, periodUrgent && styles.periodUrgent]}>
                    {formatDate(nextPeriod.getTime())}
                  </Text>
                </View>
                <Text style={[styles.periodDays, periodUrgent && styles.periodUrgent]}>
                  {daysUntilPeriod === 0 ? '就是今天 🌸' : `还有 ${daysUntilPeriod} 天`}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[
                    styles.progressFill,
                    { width: `${Math.min(periodProgress * 100, 100)}%` },
                    periodUrgent && styles.progressUrgent,
                  ]} />
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── 私密备忘 ── */}
        <Text style={styles.sectionTitle}>📝 私密备忘</Text>
        <TouchableOpacity
          style={styles.memoCard}
          onPress={() => { setMemoInput(profile.memo); setMemoEditing(true); }}
          activeOpacity={0.8}
        >
          {profile.memo
            ? <Text style={styles.memoText}>{profile.memo}</Text>
            : <Text style={styles.memoPlaceholder}>点击记录关于 TA 的小秘密…</Text>
          }
        </TouchableOpacity>

      </ScrollView>

      {/* ─────── Modals ─────── */}

      {/* 生日 */}
      <DatePicker
        visible={showBirthdayPicker}
        value={profile.birthday ? new Date(profile.birthday) : new Date(2000, 0, 1)}
        maximumDate={new Date()}
        onChange={d => { setShowBirthdayPicker(false); update({ birthday: d.getTime() }); }}
        onCancel={() => setShowBirthdayPicker(false)}
      />

      {/* 生理期日期 */}
      <DatePicker
        visible={showPeriodDatePicker}
        value={profile.periodStart ? new Date(profile.periodStart) : new Date()}
        maximumDate={new Date()}
        onChange={d => { setShowPeriodDatePicker(false); update({ periodStart: d.getTime() }); }}
        onCancel={() => setShowPeriodDatePicker(false)}
      />

      {/* 血型 */}
      <Modal visible={showBloodModal} transparent animationType="fade" onRequestClose={() => setShowBloodModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.pickerBox}>
            <Text style={styles.pickerTitle}>选择血型</Text>
            {BLOOD_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.pickerItem, profile.bloodType === t && styles.pickerItemActive]}
                onPress={() => { update({ bloodType: t }); setShowBloodModal(false); }}
              >
                <Text style={[styles.pickerItemText, profile.bloodType === t && styles.pickerItemTextActive]}>
                  {t} 型
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowBloodModal(false)}>
              <Text style={styles.pickerCancel}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MBTI */}
      <Modal visible={showMbtiModal} transparent animationType="fade" onRequestClose={() => setShowMbtiModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.pickerBox}>
            <Text style={styles.pickerTitle}>选择 MBTI</Text>
            <View style={styles.mbtiGrid}>
              {MBTI_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.mbtiItem, profile.mbti === t && styles.pickerItemActive]}
                  onPress={() => { update({ mbti: t }); setShowMbtiModal(false); }}
                >
                  <Text style={[styles.mbtiText, profile.mbti === t && styles.pickerItemTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setShowMbtiModal(false)}>
              <Text style={styles.pickerCancel}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 身高 */}
      <Modal visible={showHeightModal} transparent animationType="fade" onRequestClose={() => setShowHeightModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.pickerBox}>
            <Text style={styles.pickerTitle}>输入身高（cm）</Text>
            <TextInput
              style={styles.textInput}
              value={heightInput}
              onChangeText={setHeightInput}
              keyboardType="numeric"
              placeholder="如：163"
              placeholderTextColor={colors.whiteSecondary}
              autoFocus
              maxLength={3}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setShowHeightModal(false)}>
                <Text style={styles.pickerCancel}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => {
                update({ height: heightInput.trim() });
                setShowHeightModal(false);
              }}>
                <Text style={styles.confirmBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 生理期周期 */}
      <Modal visible={showPeriodModal} transparent animationType="fade" onRequestClose={() => setShowPeriodModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.pickerBox}>
            <Text style={styles.pickerTitle}>月经周期（天）</Text>
            <TextInput
              style={styles.textInput}
              value={periodCycleInput}
              onChangeText={setPeriodCycleInput}
              keyboardType="numeric"
              placeholder="默认 28"
              placeholderTextColor={colors.whiteSecondary}
              autoFocus
              maxLength={2}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setShowPeriodModal(false)}>
                <Text style={styles.pickerCancel}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => {
                const n = parseInt(periodCycleInput);
                if (n > 0) update({ periodCycle: n });
                setShowPeriodModal(false);
              }}>
                <Text style={styles.confirmBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 备忘编辑 */}
      <Modal visible={memoEditing} transparent animationType="slide" onRequestClose={() => setMemoEditing(false)}>
        <View style={styles.memoOverlay}>
          <View style={styles.memoSheet}>
            <Text style={styles.pickerTitle}>私密备忘</Text>
            <TextInput
              style={styles.memoInput}
              value={memoInput}
              onChangeText={setMemoInput}
              multiline
              placeholder="记录关于 TA 的一切小秘密…"
              placeholderTextColor={colors.whiteSecondary}
              autoFocus
              maxLength={500}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setMemoEditing(false)}>
                <Text style={styles.pickerCancel}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => {
                update({ memo: memoInput });
                setMemoEditing(false);
              }}>
                <Text style={styles.confirmBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.md },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.whiteDim, borderWidth: 2, borderColor: colors.greenBorder,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    marginBottom: 10,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.white, marginBottom: 8 },
  tagRow: { flexDirection: 'row', gap: 8 },
  headerTag: {
    fontSize: 12, color: colors.green,
    backgroundColor: colors.greenDim, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.greenBorder,
  },
  savingHint: { fontSize: 11, color: colors.whiteSecondary, marginTop: 6 },

  sectionTitle: {
    fontSize: 12, color: colors.whiteSecondary,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    paddingBottom: spacing.sm, letterSpacing: 1,
  },
  card: {
    backgroundColor: '#16213e', marginHorizontal: spacing.lg,
    borderRadius: 12, borderWidth: 1, borderColor: colors.whiteBorder, overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.whiteBorder,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 15, color: colors.white },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 13, color: colors.whiteSecondary },
  arrow: { fontSize: 18, color: colors.whiteSecondary },

  tagSection: { padding: spacing.md, gap: 10 },
  tagSectionLabel: { fontSize: 13, color: colors.whiteSecondary, marginBottom: 4 },
  hintText: { fontSize: 11, color: colors.whiteSecondary, marginBottom: 4 },

  // 生理期
  periodResult: {
    paddingHorizontal: spacing.md, paddingVertical: 14, gap: 8,
  },
  periodInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  periodLabel: { fontSize: 15, color: colors.white },
  periodDate: { fontSize: 13, color: colors.whiteSecondary },
  periodDays: { fontSize: 13, color: colors.whiteSecondary, textAlign: 'right' },
  periodUrgent: { color: '#f87171' },
  progressTrack: {
    height: 6, backgroundColor: colors.whiteDim,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.green, borderRadius: 3,
  },
  progressUrgent: { backgroundColor: '#f87171' },

  // 备忘
  memoCard: {
    backgroundColor: '#16213e', marginHorizontal: spacing.lg,
    borderRadius: 12, borderWidth: 1, borderColor: colors.whiteBorder,
    padding: spacing.md, minHeight: 80,
  },
  memoText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 22 },
  memoPlaceholder: { fontSize: 14, color: colors.whiteSecondary, lineHeight: 22 },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  pickerBox: {
    backgroundColor: '#16213e', borderRadius: 16, padding: spacing.lg,
    width: '85%', borderWidth: 1, borderColor: colors.whiteBorder,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: colors.white, marginBottom: spacing.md },
  pickerItem: {
    paddingVertical: 12, paddingHorizontal: spacing.md,
    borderRadius: 10, marginBottom: 6,
  },
  pickerItemActive: { backgroundColor: colors.greenDim, borderWidth: 1, borderColor: colors.greenBorder },
  pickerItemText: { fontSize: 15, color: colors.white, textAlign: 'center' },
  pickerItemTextActive: { color: colors.green, fontWeight: '700' },
  pickerCancel: { color: colors.whiteSecondary, fontSize: 14, textAlign: 'center', marginTop: spacing.sm, padding: spacing.sm },
  mbtiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  mbtiItem: {
    width: '22%', paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.whiteDim, alignItems: 'center',
    borderWidth: 1, borderColor: colors.whiteBorder,
  },
  mbtiText: { fontSize: 13, color: colors.white },
  textInput: {
    backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder,
    borderRadius: 10, padding: spacing.md, color: colors.white, fontSize: 15,
    marginBottom: spacing.md,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  confirmBtn: { backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  confirmBtnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },

  memoOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  memoSheet: {
    backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: colors.whiteBorder, padding: spacing.lg, paddingBottom: 40,
  },
  memoInput: {
    backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder,
    borderRadius: 12, padding: spacing.md, color: colors.white, fontSize: 15,
    minHeight: 120, textAlignVertical: 'top', marginBottom: spacing.md,
  },
});
