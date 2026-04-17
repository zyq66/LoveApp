// src/screens/LetterScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Image, Modal, ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../store/AuthContext';
import {
  sendLetter, sendImage, listenLetters, markRead,
  addReaction, deleteLetter, Letter,
} from '../services/letters';
import { generateLoveLetter, analyzeMood, generateDailyTopic } from '../services/ai';
import { uploadImage } from '../services/storage';
import { colors, spacing } from '../theme';

const MOODS = [
  { emoji: '😊', label: '开心' },
  { emoji: '🥰', label: '思念' },
  { emoji: '😢', label: '难过' },
  { emoji: '😌', label: '平静' },
  { emoji: '🥳', label: '兴奋' },
];

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🌸'];

const DAILY_TOPICS = [
  '如果我们可以去世界上任何地方旅行，你想去哪里？',
  '你第一次见到我的时候，心里在想什么？',
  '我们在一起最快乐的一个瞬间是什么？',
  '你希望我们十年后的生活是什么样子的？',
  '有什么话你一直想对我说但还没说过的？',
  '你喜欢我哪一点是你从没告诉过我的？',
  '如果今天是我们最后一天在一起，你想做什么？',
  '你觉得我们最默契的是什么？',
  '什么时候你觉得我最可爱？',
  '有什么事是我做了让你特别感动的？',
  '我们的哪个共同习惯你最喜欢？',
  '你觉得我们之间有什么需要改善的地方吗？',
  '如果可以重来，你还会选择和我在一起吗？',
  '你最想和我一起完成的心愿是什么？',
];

function getTodayTopic(): string {
  const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_TOPICS.length;
  return DAILY_TOPICS[dayIndex];
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateGroup(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return '今天';
  const isYesterday = d.toDateString() === new Date(Date.now() - 86400000).toDateString();
  if (isYesterday) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function LetterScreen() {
  const { userId, coupleId } = useAuth();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [input, setInput] = useState('');
  const [mood, setMood] = useState('😊');
  const [imgUploading, setImgUploading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Action menu (long press)
  const [actionTarget, setActionTarget] = useState<Letter | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // AI letter assistant
  const [aiModal, setAiModal] = useState(false);
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // AI mood insight
  const [moodInsight, setMoodInsight] = useState('');
  const [moodInsightLoading, setMoodInsightLoading] = useState(false);
  const [showInsight, setShowInsight] = useState(false);

  // Today's topic (AI-generated)
  const [todayTopic, setTodayTopic] = useState('');
  const [topicLoading, setTopicLoading] = useState(false);

  async function loadTopic() {
    setTopicLoading(true);
    try {
      const t = await generateDailyTopic();
      setTodayTopic(t);
    } catch {
      setTodayTopic(getTodayTopic()); // fallback to static list
    } finally {
      setTopicLoading(false);
    }
  }

  useEffect(() => { loadTopic(); }, []);

  useEffect(() => {
    if (!coupleId) return;
    const unsub = listenLetters(coupleId, msgs => {
      setLetters(msgs);
      msgs
        .filter(m => m.from !== userId && !m.read)
        .forEach(m => markRead(coupleId, m.id));
    });
    return unsub;
  }, [coupleId, userId]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [letters]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !coupleId || !userId) return;
    setInput('');
    await sendLetter(coupleId, userId, text, mood);
  }

  async function handleSendImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0] || !coupleId || !userId) return;
    setImgUploading(true);
    try {
      const uri = result.assets[0].uri;
      const url = await uploadImage(uri, 'letters');
      await sendImage(coupleId, userId, url, mood);
    } finally {
      setImgUploading(false);
    }
  }

  function handleLongPress(letter: Letter) {
    setActionTarget(letter);
    setShowActionMenu(true);
  }

  async function handleReact(emoji: string) {
    if (!actionTarget || !coupleId || !userId) return;
    await addReaction(coupleId, actionTarget.id, userId, emoji);
    setShowActionMenu(false);
    setActionTarget(null);
  }

  async function handleDelete() {
    if (!actionTarget || !coupleId) return;
    await deleteLetter(coupleId, actionTarget.id);
    setShowActionMenu(false);
    setActionTarget(null);
  }

  function handleSendTopic() {
    setInput(todayTopic);
  }

  async function handleGenerateLetter() {
    if (!aiKeywords.trim()) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const result = await generateLoveLetter(aiKeywords.trim());
      setAiResult(result);
    } catch (e: any) {
      setAiResult('生成失败，请稍后再试');
    } finally {
      setAiLoading(false);
    }
  }

  function handleUseAiLetter() {
    setInput(aiResult);
    setAiModal(false);
    setAiKeywords('');
    setAiResult('');
  }

  async function handleMoodInsight() {
    if (letters.length < 2) return;
    setMoodInsightLoading(true);
    setShowInsight(true);
    try {
      const msgs = letters.slice(-6).map(l => ({
        content: l.content,
        mood: l.mood,
        isMe: l.from === userId,
      }));
      const insight = await analyzeMood(msgs);
      setMoodInsight(insight);
    } catch {
      setMoodInsight('暂时无法分析，请稍后再试');
    } finally {
      setMoodInsightLoading(false);
    }
  }

  const partnerMood = [...letters].reverse().find(m => m.from !== userId)?.mood;

  // Group letters by date
  const grouped: { date: string; items: Letter[] }[] = [];
  letters.forEach(l => {
    const label = formatDateGroup(l.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === label) {
      last.items.push(l);
    } else {
      grouped.push({ date: label, items: [l] });
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.kvRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>情书</Text>
            {partnerMood && (
              <Text style={styles.partnerMoodSub}>TA 现在 {partnerMood}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.emoji}
                style={[styles.headerMoodBtn, mood === m.emoji && styles.headerMoodActive]}
                onPress={() => setMood(m.emoji)}
              >
                <Text style={styles.headerMoodEmoji}>{m.emoji}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.insightBtn}
              onPress={handleMoodInsight}
              disabled={moodInsightLoading}
            >
              <Text style={styles.insightBtnText}>AI</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI mood insight banner */}
        {showInsight && (
          <View style={styles.insightBanner}>
            <Text style={styles.insightIcon}>✨</Text>
            {moodInsightLoading
              ? <ActivityIndicator size="small" color={colors.green} style={{ marginLeft: 8 }} />
              : <Text style={styles.insightText} numberOfLines={2}>{moodInsight}</Text>
            }
            <TouchableOpacity onPress={() => setShowInsight(false)}>
              <Text style={styles.insightClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Today's topic card */}
          <View style={styles.topicCard}>
            <View style={styles.topicHeader}>
              <Text style={styles.topicLabel}>✨ 今日话题</Text>
              <TouchableOpacity
                style={styles.topicRefreshBtn}
                onPress={loadTopic}
                disabled={topicLoading}
              >
                {topicLoading
                  ? <ActivityIndicator size="small" color={colors.green} />
                  : <Text style={styles.topicRefreshIcon}>↻</Text>
                }
              </TouchableOpacity>
            </View>
            {topicLoading && todayTopic === ''
              ? <Text style={styles.topicLoading}>AI 生成中…</Text>
              : <Text style={styles.topicText}>{todayTopic}</Text>
            }
            <TouchableOpacity onPress={handleSendTopic} disabled={!todayTopic || topicLoading}>
              <Text style={styles.topicHint}>点击发送给 TA →</Text>
            </TouchableOpacity>
          </View>

          {letters.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>写下第一封情书吧 💌</Text>
            </View>
          )}

          {grouped.map(group => (
            <View key={group.date}>
              {/* Date divider */}
              <View style={styles.dateDivider}>
                <View style={styles.dateLine} />
                <Text style={styles.dateLabel}>{group.date}</Text>
                <View style={styles.dateLine} />
              </View>

              {group.items.map(letter => {
                const isMe = letter.from === userId;
                const reactionEntries = Object.values(letter.reactions || {});
                const reactionCounts: Record<string, number> = {};
                reactionEntries.forEach(e => { reactionCounts[e] = (reactionCounts[e] || 0) + 1; });

                return (
                  <View key={letter.id} style={[styles.row, isMe ? styles.rowRight : styles.rowLeft]}>
                    {!isMe && <Text style={styles.bubbleMood}>{letter.mood}</Text>}

                    <View style={styles.bubbleWrap}>
                      <Pressable
                        onLongPress={() => handleLongPress(letter)}
                        delayLongPress={400}
                      >
                        {letter.type === 'image' && letter.imageUrl ? (
                          <Image
                            source={{ uri: letter.imageUrl }}
                            style={[styles.imgBubble, isMe ? styles.imgBubbleMe : styles.imgBubbleThem]}
                          />
                        ) : (
                          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                              {letter.content}
                            </Text>
                          </View>
                        )}
                      </Pressable>

                      {/* Time + read receipt */}
                      <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeRight : styles.bubbleTimeLeft]}>
                        {formatTime(letter.createdAt)}
                        {isMe && (letter.read ? '  已读' : '  未读')}
                      </Text>

                      {/* Reactions */}
                      {Object.keys(reactionCounts).length > 0 && (
                        <View style={[styles.reactionsRow, isMe ? styles.reactionsRight : styles.reactionsLeft]}>
                          {Object.entries(reactionCounts).map(([emoji, count]) => (
                            <View key={emoji} style={styles.reactionChip}>
                              <Text style={styles.reactionEmoji}>{emoji}</Text>
                              {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {isMe && <Text style={styles.bubbleMood}>{letter.mood}</Text>}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <View style={styles.textRow}>
            {/* AI letter button */}
            <TouchableOpacity style={styles.imgBtn} onPress={() => setAiModal(true)}>
              <Text style={styles.imgBtnIcon}>✨</Text>
            </TouchableOpacity>
            {/* Image button */}
            <TouchableOpacity style={styles.imgBtn} onPress={handleSendImage} disabled={imgUploading}>
              {imgUploading
                ? <ActivityIndicator size="small" color={colors.green} />
                : <Text style={styles.imgBtnIcon}>🖼</Text>
              }
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="写点什么…"
              placeholderTextColor={colors.whiteSecondary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* AI letter assistant modal */}
      <Modal visible={aiModal} transparent animationType="slide" onRequestClose={() => setAiModal(false)}>
        <Pressable style={styles.actionOverlay} onPress={() => setAiModal(false)}>
          <Pressable style={styles.aiSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.aiSheetTitle}>✨ AI 情书助手</Text>
            <Text style={styles.aiSheetSub}>输入几个关键词，AI 帮你写一封情书</Text>
            <TextInput
              style={styles.aiInput}
              placeholder="如：想你了  下雨天  一起吃火锅  黄色小花"
              placeholderTextColor={colors.whiteSecondary}
              value={aiKeywords}
              onChangeText={setAiKeywords}
              multiline
              maxLength={80}
            />
            <TouchableOpacity
              style={[styles.aiGenerateBtn, (!aiKeywords.trim() || aiLoading) && styles.aiBtnDisabled]}
              onPress={handleGenerateLetter}
              disabled={!aiKeywords.trim() || aiLoading}
            >
              {aiLoading
                ? <ActivityIndicator color={colors.bg} size="small" />
                : <Text style={styles.aiGenerateBtnText}>生成情书</Text>
              }
            </TouchableOpacity>

            {aiResult !== '' && (
              <View style={styles.aiResultBox}>
                <Text style={styles.aiResultText}>{aiResult}</Text>
                <View style={styles.aiResultActions}>
                  <TouchableOpacity onPress={handleGenerateLetter} disabled={aiLoading}>
                    <Text style={styles.aiRegenText}>重新生成</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.aiUseBtn} onPress={handleUseAiLetter}>
                    <Text style={styles.aiUseBtnText}>使用这封情书</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Action menu modal */}
      <Modal visible={showActionMenu} transparent animationType="fade" onRequestClose={() => setShowActionMenu(false)}>
        <Pressable style={styles.actionOverlay} onPress={() => setShowActionMenu(false)}>
          <View style={styles.actionMenu}>
            <Text style={styles.actionTitle}>回应</Text>
            <View style={styles.reactionPicker}>
              {REACTION_EMOJIS.map(e => (
                <TouchableOpacity key={e} style={styles.reactionPickerBtn} onPress={() => handleReact(e)}>
                  <Text style={styles.reactionPickerEmoji}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {actionTarget?.from === userId && (
              <TouchableOpacity style={styles.actionDelete} onPress={handleDelete}>
                <Text style={styles.actionDeleteText}>撤回消息</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kvRoot: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.whiteBorder,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.white },
  partnerMoodSub: { fontSize: 11, color: colors.whiteSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 4 },
  headerMoodBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.whiteDim,
  },
  headerMoodActive: { backgroundColor: colors.greenDim, borderWidth: 1, borderColor: colors.greenBorder },
  headerMoodEmoji: { fontSize: 16 },

  // Messages
  messageList: { padding: spacing.md, paddingBottom: spacing.lg },

  // Topic card
  topicCard: {
    backgroundColor: colors.greenDim,
    borderWidth: 1, borderColor: colors.greenBorder,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  topicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  topicLabel: { fontSize: 11, color: colors.green, fontWeight: '600' },
  topicRefreshBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  topicRefreshIcon: { fontSize: 18, color: colors.green },
  topicLoading: { fontSize: 13, color: colors.whiteSecondary, marginBottom: 6 },
  topicText: { fontSize: 14, color: colors.white, lineHeight: 20, marginBottom: 6 },
  topicHint: { fontSize: 11, color: colors.whiteSecondary, textAlign: 'right' },

  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: colors.whiteSecondary, fontSize: 14 },

  // Date divider
  dateDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md, gap: 8 },
  dateLine: { flex: 1, height: 1, backgroundColor: colors.whiteBorder },
  dateLabel: { fontSize: 11, color: colors.whiteSecondary },

  // Message row
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.sm },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  bubbleMood: { fontSize: 18, marginHorizontal: 4 },
  bubbleWrap: { maxWidth: '72%' },

  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: {
    backgroundColor: colors.green,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#16213e',
    borderWidth: 1, borderColor: colors.whiteBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, color: colors.white, lineHeight: 21 },
  bubbleTextMe: { color: colors.bg },

  imgBubble: { width: 200, height: 200, borderRadius: 16 },
  imgBubbleMe: { borderBottomRightRadius: 4 },
  imgBubbleThem: { borderBottomLeftRadius: 4 },

  bubbleTime: { fontSize: 10, color: colors.whiteSecondary, marginTop: 3 },
  bubbleTimeRight: { textAlign: 'right' },
  bubbleTimeLeft: { textAlign: 'left' },

  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionsRight: { justifyContent: 'flex-end' },
  reactionsLeft: { justifyContent: 'flex-start' },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.whiteBorder,
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, color: colors.whiteSecondary, marginLeft: 2 },

  // Input bar
  inputBar: {
    backgroundColor: 'rgba(10,10,20,0.97)',
    borderTopWidth: 1, borderTopColor: colors.whiteBorder,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  textRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  imgBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.whiteDim,
    borderWidth: 1, borderColor: colors.whiteBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  imgBtnIcon: { fontSize: 18 },
  input: {
    flex: 1,
    backgroundColor: colors.whiteDim,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.white,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1, borderColor: colors.whiteBorder,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: colors.bg, fontSize: 16, fontWeight: '700' },

  // AI insight
  insightBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.greenDim,
    borderWidth: 1, borderColor: colors.greenBorder,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 4,
  },
  insightBtnText: { fontSize: 10, fontWeight: '700', color: colors.green },
  insightBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.greenDim,
    borderBottomWidth: 1, borderBottomColor: colors.greenBorder,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    gap: 8,
  },
  insightIcon: { fontSize: 14 },
  insightText: { flex: 1, fontSize: 13, color: colors.white, lineHeight: 18 },
  insightClose: { color: colors.whiteSecondary, fontSize: 14, padding: 4 },

  // AI letter sheet
  aiSheet: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: colors.whiteBorder,
    padding: spacing.lg, paddingBottom: 40,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.whiteBorder,
    alignSelf: 'center', marginBottom: spacing.md,
  },
  aiSheetTitle: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: 4 },
  aiSheetSub: { fontSize: 13, color: colors.whiteSecondary, marginBottom: spacing.md },
  aiInput: {
    backgroundColor: colors.whiteDim,
    borderWidth: 1, borderColor: colors.whiteBorder,
    borderRadius: 12, padding: spacing.md,
    color: colors.white, fontSize: 14,
    minHeight: 60, textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  aiGenerateBtn: {
    backgroundColor: colors.green, borderRadius: 12,
    padding: spacing.md, alignItems: 'center',
  },
  aiBtnDisabled: { opacity: 0.4 },
  aiGenerateBtnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
  aiResultBox: {
    marginTop: spacing.md,
    backgroundColor: colors.whiteDim,
    borderRadius: 12, padding: spacing.md,
    borderWidth: 1, borderColor: colors.whiteBorder,
  },
  aiResultText: { color: colors.white, fontSize: 14, lineHeight: 22 },
  aiResultActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: spacing.md,
  },
  aiRegenText: { color: colors.whiteSecondary, fontSize: 13 },
  aiUseBtn: {
    backgroundColor: colors.green, borderRadius: 8,
    paddingHorizontal: spacing.md, paddingVertical: 7,
  },
  aiUseBtnText: { color: colors.bg, fontWeight: '700', fontSize: 13 },

  // Action menu
  actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  actionMenu: {
    backgroundColor: '#16213e',
    borderRadius: 20, padding: spacing.lg,
    width: '80%',
    borderWidth: 1, borderColor: colors.whiteBorder,
  },
  actionTitle: { fontSize: 13, color: colors.whiteSecondary, marginBottom: spacing.md, textAlign: 'center' },
  reactionPicker: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md },
  reactionPickerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.whiteDim,
    alignItems: 'center', justifyContent: 'center',
  },
  reactionPickerEmoji: { fontSize: 24 },
  actionDelete: {
    alignItems: 'center', paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.whiteBorder,
    marginTop: spacing.sm,
  },
  actionDeleteText: { color: '#f87171', fontSize: 15 },
});
