// src/screens/CalendarScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import {
  CareRecord,
  CareRecordType,
  deleteCareRecord,
  fetchCareRecords,
  saveCareRecord,
  watchCareRecords,
} from '../services/careCalendar';
import { colors, spacing } from '../theme';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const TASK_META: Record<CareRecordType, {
  label: string;
  short: string;
  color: string;
  defaultAmount?: number;
}> = {
  allowance: { label: '转 200 元', short: '钱', color: '#4ade80', defaultAmount: 200 },
  milkTea: { label: '点奶茶', short: '茶', color: '#f9a8d4' },
  dessert: { label: '安排甜品', short: '甜', color: '#fbbf24' },
  clothes: { label: '买衣服', short: '衣', color: '#93c5fd' },
};

const TASK_ORDER: CareRecordType[] = ['allowance', 'milkTea', 'dessert', 'clothes'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function monthGridDays(month: Date): Date[] {
  const start = monthStart(month);
  const leading = (start.getDay() + 6) % 7;
  const firstCell = addDays(start, -leading);
  return Array.from({ length: 42 }, (_, i) => addDays(firstCell, i));
}

function formatMonth(date: Date): string {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function fullDateLabel(key: string): string {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function calendarErrorMessage(e: any): string {
  const raw = e?.message || String(e);
  if (raw.includes('COLLECTION_NOT_EXIST') || raw.includes('DATABASE_COLLECTION_NOT_EXIST')) {
    return 'TCB couples 集合不存在，请先确认情侣配对数据正常';
  }
  if (raw.includes('PERMISSION_DENIED')) {
    return 'couples 集合权限不足，请在 TCB 控制台允许当前用户读写';
  }
  return raw;
}

function recordLabel(record: CareRecord): string {
  const meta = TASK_META[record.type];
  if (record.type === 'allowance') return `${meta.label}`;
  if (record.note) return `${meta.label}：${record.note}`;
  return meta.label;
}

export function CalendarScreen() {
  const { userId, coupleId } = useAuth();
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(monthStart(new Date()));
  const [actionModal, setActionModal] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [savingType, setSavingType] = useState<CareRecordType | ''>('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!coupleId) return;
    const unsub = watchCareRecords(coupleId, setRecords);
    return unsub;
  }, [coupleId]);

  const selectedKey = dateKey(selectedDate);
  const monthRange = {
    start: dateKey(monthStart(currentMonth)),
    end: dateKey(monthEnd(currentMonth)),
  };

  const recordsByDate = useMemo(() => {
    const map: Record<string, CareRecord[]> = {};
    records.forEach(record => {
      if (!map[record.dateKey]) map[record.dateKey] = [];
      map[record.dateKey].push(record);
    });
    return map;
  }, [records]);

  const selectedRecords = recordsByDate[selectedKey] ?? [];
  const monthRecords = records
    .filter(r => r.dateKey >= monthRange.start && r.dateKey <= monthRange.end)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.updatedAt - a.updatedAt);

  const counts = TASK_ORDER.reduce((acc, type) => {
    acc[type] = monthRecords.filter(r => r.type === type).length;
    return acc;
  }, {} as Record<CareRecordType, number>);

  if (!coupleId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerEmpty}>
          <Text style={styles.emptyIcon}>🗓</Text>
          <Text style={styles.emptyTitle}>还未配对</Text>
          <Text style={styles.emptyText}>完成配对后再记录每周的小约定</Text>
        </View>
      </SafeAreaView>
    );
  }

  async function refreshRecords() {
    if (!coupleId) return;
    setRefreshing(true);
    try {
      setRecords(await fetchCareRecords(coupleId));
    } finally {
      setRefreshing(false);
    }
  }

  function openDate(day: Date) {
    setSelectedDate(day);
    setCurrentMonth(monthStart(day));
    setNoteInput('');
    setActionModal(true);
  }

  function optimisticRecord(type: CareRecordType, note = ''): CareRecord {
    const now = Date.now();
    return {
      id: `local-${type}-${selectedKey}`,
      coupleId: coupleId || '',
      dateKey: selectedKey,
      type,
      amount: TASK_META[type].defaultAmount ?? 0,
      note,
      createdAt: now,
      updatedAt: now,
      updatedBy: userId || '',
    };
  }

  function recordAction(type: CareRecordType) {
    console.log('[calendar] record action', type, selectedKey);
    if (!coupleId || !userId) {
      Alert.alert('暂时不能记录', '请确认已经登录并完成配对');
      return;
    }
    const note = noteInput.trim();
    setRecords(prev => [
      ...prev.filter(r => !(r.dateKey === selectedKey && r.type === type)),
      optimisticRecord(type, note),
    ]);
    setNoteInput('');
    setActionModal(false);

    saveCareRecord(coupleId, userId, selectedKey, type, {
      amount: TASK_META[type].defaultAmount ?? 0,
      note,
    })
      .then((docId) => {
        console.log('[calendar] save success', type, selectedKey, docId);
        setRecords(prev => prev.map(record => (
          record.id === `local-${type}-${selectedKey}`
            ? { ...record, id: docId || record.id }
            : record
        )));
        return fetchCareRecords(coupleId);
      })
      .then((remoteRecords) => {
        console.log('[calendar] fetched records', remoteRecords.length);
        if (remoteRecords.length > 0) setRecords(remoteRecords);
      })
      .catch((e: any) => {
        console.warn('[calendar] save failed', e);
        Alert.alert('保存失败', calendarErrorMessage(e));
      });
  }

  function removeAction(type: CareRecordType) {
    console.log('[calendar] remove action', type, selectedKey);
    if (!coupleId) return;
    const existing = selectedRecords.find(record => record.type === type);
    if (!existing) return;
    setRecords(prev => prev.filter(r => !(r.dateKey === selectedKey && r.type === type)));
    setActionModal(false);

    if (existing.id.startsWith('local-')) return;
    deleteCareRecord(coupleId, selectedKey, type, existing.id)
      .then(() => fetchCareRecords(coupleId))
      .then(setRecords)
      .catch((e: any) => {
        console.warn('[calendar] remove failed', e);
        Alert.alert('撤销失败', calendarErrorMessage(e));
      });
  }

  function changeMonth(offset: number) {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(next);
    if (!isSameMonth(selectedDate, next)) setSelectedDate(next);
  }

  function renderDay(day: Date) {
    const key = dateKey(day);
    const dayRecords = recordsByDate[key] ?? [];
    const inMonth = isSameMonth(day, currentMonth);
    const selected = isSameDay(day, selectedDate);
    const today = isSameDay(day, new Date());

    return (
      <TouchableOpacity
        key={key}
        style={[styles.dayCell, selected && styles.dayCellSelected]}
        onPress={() => openDate(day)}
      >
        <Text style={[
          styles.dayNum,
          !inMonth && styles.dayNumMuted,
          today && styles.dayNumToday,
          selected && styles.dayNumSelected,
        ]}>
          {day.getDate()}
        </Text>
        <View style={styles.markerRow}>
          {dayRecords.slice(0, 4).map(record => (
            <View key={record.id} style={[styles.marker, { backgroundColor: TASK_META[record.type].color }]} />
          ))}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshRecords} tintColor={colors.green} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>日历</Text>
            <Text style={styles.subtitle}>点日期，记录今天做了什么</Text>
          </View>
          {savingType ? <ActivityIndicator color={colors.green} /> : null}
        </View>

        <View style={styles.summaryGrid}>
          {TASK_ORDER.map(type => (
            <View key={type} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{TASK_META[type].label}</Text>
              <Text style={styles.summaryValue}>{counts[type] || 0}</Text>
            </View>
          ))}
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <TouchableOpacity style={styles.monthBtn} onPress={() => changeMonth(-1)}>
              <Text style={styles.monthBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{formatMonth(currentMonth)}</Text>
            <TouchableOpacity style={styles.monthBtn} onPress={() => changeMonth(1)}>
              <Text style={styles.monthBtnText}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.weekHeader}>
            {WEEKDAYS.map(day => <Text key={day} style={styles.weekday}>{day}</Text>)}
          </View>
          <View style={styles.grid}>
            {monthGridDays(currentMonth).map(renderDay)}
          </View>
        </View>

        <View style={styles.monthList}>
          <Text style={styles.monthListTitle}>{formatMonth(currentMonth)}记录</Text>
          {monthRecords.length === 0 ? (
            <View style={styles.emptyRecordBox}>
              <Text style={styles.emptyRecordText}>这个月还没有记录</Text>
            </View>
          ) : (
            monthRecords.map(record => (
              <TouchableOpacity
                key={record.id}
                style={styles.recordRow}
                onPress={() => openDate(parseDateKey(record.dateKey))}
              >
                <View style={[styles.recordBadge, { backgroundColor: TASK_META[record.type].color }]}>
                  <Text style={styles.recordBadgeText}>{TASK_META[record.type].short}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordTitle}>{recordLabel(record)}</Text>
                  <Text style={styles.recordDate}>{fullDateLabel(record.dateKey)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={actionModal} transparent animationType="fade" onRequestClose={() => setActionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.actionSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{formatDate(selectedDate)}</Text>
                <Text style={styles.sheetSub}>
                  {selectedRecords.length ? `已记录 ${selectedRecords.length} 件事` : '选择今天做了什么'}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setActionModal(false)}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.noteInput}
              placeholder="备注（可选，比如奶茶店、甜品名、衣服链接）"
              placeholderTextColor={colors.whiteSecondary}
              value={noteInput}
              onChangeText={setNoteInput}
              maxLength={80}
            />

            {TASK_ORDER.map(type => {
              const meta = TASK_META[type];
              const existing = selectedRecords.find(record => record.type === type);
              const pending = savingType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.actionOption,
                    existing && { borderColor: meta.color, backgroundColor: `${meta.color}22` },
                  ]}
                  onPress={() => existing ? removeAction(type) : recordAction(type)}
                >
                  <View style={[styles.actionDot, { backgroundColor: meta.color }]}>
                    <Text style={styles.actionDotText}>{meta.short}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionLabel}>
                      {pending ? '保存中…' : existing ? `已记录：${meta.label}` : meta.label}
                    </Text>
                    <Text style={styles.actionHint}>{existing ? '点击撤销这条记录' : '点击后会在日历上打标'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 96 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.white },
  subtitle: { color: colors.whiteSecondary, fontSize: 12, marginTop: 4 },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  summaryCard: {
    width: '48.7%',
    backgroundColor: colors.whiteDim,
    borderWidth: 1,
    borderColor: colors.whiteBorder,
    borderRadius: 12,
    padding: spacing.md,
  },
  summaryLabel: { color: colors.whiteSecondary, fontSize: 11, marginBottom: 6 },
  summaryValue: { color: colors.white, fontSize: 22, fontWeight: '800' },
  calendarCard: {
    backgroundColor: colors.bgLight,
    borderWidth: 1,
    borderColor: colors.whiteBorder,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.whiteDim,
  },
  monthBtnText: { color: colors.white, fontSize: 28, lineHeight: 30 },
  monthTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  weekHeader: { flexDirection: 'row', marginBottom: 6 },
  weekday: { flex: 1, textAlign: 'center', color: colors.whiteSecondary, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.95,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  dayCellSelected: {
    backgroundColor: 'rgba(74,222,128,0.14)',
    borderWidth: 1,
    borderColor: colors.greenBorder,
  },
  dayNum: { color: colors.white, fontSize: 13, fontWeight: '600' },
  dayNumMuted: { color: 'rgba(255,255,255,0.22)' },
  dayNumToday: { color: colors.green },
  dayNumSelected: { color: colors.white },
  markerRow: {
    height: 8,
    flexDirection: 'row',
    gap: 2,
    marginTop: 5,
  },
  marker: { width: 5, height: 5, borderRadius: 2.5 },
  monthList: {
    backgroundColor: colors.bgLight,
    borderWidth: 1,
    borderColor: colors.whiteBorder,
    borderRadius: 14,
    padding: spacing.md,
  },
  monthListTitle: { color: colors.white, fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  emptyRecordBox: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.whiteDim,
    borderRadius: 10,
  },
  emptyRecordText: { color: colors.whiteSecondary, fontSize: 13 },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.whiteBorder,
  },
  recordBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBadgeText: { color: colors.bg, fontSize: 11, fontWeight: '900' },
  recordTitle: { color: colors.white, fontSize: 14, fontWeight: '700' },
  recordDate: { color: colors.whiteSecondary, fontSize: 11, marginTop: 3 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: colors.bgLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.whiteBorder,
    padding: spacing.lg,
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
  sheetSub: { color: colors.whiteSecondary, fontSize: 12, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.whiteSecondary, fontSize: 30, lineHeight: 32 },
  noteInput: {
    backgroundColor: colors.whiteDim,
    borderWidth: 1,
    borderColor: colors.whiteBorder,
    borderRadius: 10,
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  actionOption: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.whiteBorder,
    backgroundColor: colors.whiteDim,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: 10,
  },
  actionDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDotText: { color: colors.bg, fontSize: 11, fontWeight: '900' },
  actionLabel: { color: colors.white, fontSize: 15, fontWeight: '800' },
  actionHint: { color: colors.whiteSecondary, fontSize: 11, marginTop: 3 },
  centerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyIcon: { fontSize: 42, marginBottom: spacing.md },
  emptyTitle: { color: colors.white, fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: colors.whiteSecondary, fontSize: 13, textAlign: 'center' },
});
