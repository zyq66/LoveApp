# 语音消息 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 情书页新增按住录音、松开发送的语音消息功能，支持上滑取消，20 秒倒计时，气泡展示静态波形和时长，点击播放/停止。

**Architecture:** letters.ts 扩展 Letter 接口增 voice type，新增 sendVoice()；LetterScreen 新增麦克风按钮、录音状态浮层（含 PanResponder 上滑取消）、语音气泡渲染、playback 逻辑，所有 expo-av 操作集中在一个 useVoiceRecorder hook 中。

**Tech Stack:** React Native, TypeScript, expo-av (Audio.Recording + Audio.Sound), 腾讯云 CloudBase storage, PanResponder

---

### Task 1: 安装 expo-av

**Files:**
- No source changes, dependency install only

- [ ] **Step 1: 安装依赖**

```bash
npx expo install expo-av
```

Expected: `expo-av` added to `package.json` without version conflicts.

- [ ] **Step 2: 提交**

```bash
git add package.json package-lock.json
git commit -m "chore: install expo-av for voice recording and playback"
```

---

### Task 2: 扩展 letters.ts — 新增 voice 类型和 sendVoice

**Files:**
- Modify: `src/services/letters.ts`

- [ ] **Step 1: 扩展 Letter 接口，新增 sendVoice 函数**

将 `src/services/letters.ts` 完整替换为：

```typescript
// src/services/letters.ts
import { db, authReady } from '../config/cloudbase';

export interface Letter {
  id: string;
  from: string;
  content: string;
  mood: string;
  type: 'text' | 'image' | 'voice';
  imageUrl?: string;
  voiceUrl?: string;
  duration?: number;
  createdAt: number;
  read: boolean;
  reactions: Record<string, string>;
}

export async function sendLetter(coupleId: string, userId: string, content: string, mood: string): Promise<void> {
  await db.collection('messages').add({
    coupleId, from: userId, content, mood, type: 'text',
    createdAt: Date.now(), read: false, reactions: {},
  });
}

export async function sendImage(coupleId: string, userId: string, imageUrl: string, mood: string): Promise<void> {
  await db.collection('messages').add({
    coupleId, from: userId, content: '', mood, type: 'image', imageUrl,
    createdAt: Date.now(), read: false, reactions: {},
  });
}

export async function sendVoice(coupleId: string, userId: string, voiceUrl: string, duration: number, mood: string): Promise<void> {
  await db.collection('messages').add({
    coupleId, from: userId, content: '', mood, type: 'voice', voiceUrl, duration,
    createdAt: Date.now(), read: false, reactions: {},
  });
}

export function listenLetters(coupleId: string, callback: (letters: Letter[]) => void) {
  let cancelled = false;

  async function poll() {
    if (cancelled) return;
    try {
      await authReady;
      const res = await db.collection('messages')
        .where({ coupleId })
        .orderBy('createdAt', 'asc')
        .limit(100)
        .get();
      const letters = ((res.data as any[]) ?? [])
        .map(d => ({ type: 'text', reactions: {}, ...d, id: d._id })) as Letter[];
      callback(letters);
    } catch (e) {
      console.error('listenLetters error', e);
    }
    if (!cancelled) setTimeout(poll, 5000);
  }

  poll();
  return () => { cancelled = true; };
}

export async function markRead(coupleId: string, letterId: string): Promise<void> {
  await db.collection('messages').doc(letterId).update({ read: true });
}

export async function addReaction(coupleId: string, letterId: string, userId: string, emoji: string): Promise<void> {
  await db.collection('messages').doc(letterId).update({
    [`reactions.${userId}`]: emoji,
  });
}

export async function deleteLetter(coupleId: string, letterId: string): Promise<void> {
  await db.collection('messages').doc(letterId).remove();
}
```

- [ ] **Step 2: 提交**

```bash
git add src/services/letters.ts
git commit -m "feat: extend Letter type with voice fields, add sendVoice()"
```

---

### Task 3: 新增 useVoiceRecorder Hook

**Files:**
- Create: `src/hooks/useVoiceRecorder.ts`

- [ ] **Step 1: 创建 hook 文件**

```typescript
// src/hooks/useVoiceRecorder.ts
import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

export interface VoiceRecorderState {
  isRecording: boolean;
  elapsed: number;        // seconds recorded so far
  cancelled: boolean;     // was the last recording cancelled
}

export interface VoiceRecorderResult {
  uri: string;
  duration: number;       // seconds, rounded
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    elapsed: 0,
    cancelled: false,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(0);
  const onFinishRef = useRef<((result: VoiceRecorderResult | null) => void) | null>(null);

  function clearTimers() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
  }

  const start = useCallback(async (onFinish: (result: VoiceRecorderResult | null) => void) => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { onFinish(null); return; }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;
      onFinishRef.current = onFinish;
      elapsedRef.current = 0;

      setState({ isRecording: true, elapsed: 0, cancelled: false });

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setState(s => ({ ...s, elapsed: elapsedRef.current }));
      }, 1000);

      // auto-stop at 20 seconds
      autoStopRef.current = setTimeout(() => {
        stop(false);
      }, 20000);
    } catch (e) {
      console.error('useVoiceRecorder start error', e);
      onFinish(null);
    }
  }, []);

  const stop = useCallback(async (cancel: boolean) => {
    clearTimers();
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (cancel) {
        setState({ isRecording: false, elapsed: 0, cancelled: true });
        onFinishRef.current?.(null);
      } else {
        const uri = recording.getURI() ?? '';
        const duration = Math.max(1, Math.round(elapsedRef.current));
        setState({ isRecording: false, elapsed: 0, cancelled: false });
        onFinishRef.current?.({ uri, duration });
      }
    } catch (e) {
      console.error('useVoiceRecorder stop error', e);
      setState({ isRecording: false, elapsed: 0, cancelled: false });
      onFinishRef.current?.(null);
    }
  }, []);

  return { state, start, stop };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/hooks/useVoiceRecorder.ts
git commit -m "feat: useVoiceRecorder hook — start/stop/20s-auto-stop/cancel"
```

---

### Task 4: 更新 LetterScreen — 麦克风按钮 + 录音浮层 + 上滑取消 + 语音气泡

**Files:**
- Modify: `src/screens/LetterScreen.tsx`

这个任务分四个子步骤完成，每步只改一个关注点。

---

- [ ] **Step 1: 新增 imports 和 hook 引用**

在文件顶部，在现有 import 之后追加：

```typescript
import { PanResponder, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { uploadImage } from '../services/storage'; // already imported, skip duplicate
import { sendVoice } from '../services/letters';
```

> 注意：`uploadImage` 已经 import，无需重复。`sendVoice` 需要追加到 letters import 行。

将顶部 letters import 改为：

```typescript
import {
  sendLetter, sendImage, sendVoice, listenLetters, markRead,
  addReaction, deleteLetter, Letter,
} from '../services/letters';
```

将顶部 RN import 改为（加入 `PanResponder`, `Animated`）：

```typescript
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Image, Modal, ActivityIndicator, Pressable,
  PanResponder, Animated,
} from 'react-native';
```

顶部追加 expo-av import：

```typescript
import { Audio } from 'expo-av';
```

---

- [ ] **Step 2: 在 LetterScreen 函数体内添加录音状态和 handlers**

紧接在 `const scrollRef = useRef<ScrollView>(null);` 一行后：

```typescript
  // Voice recorder
  const { state: recState, start: startRec, stop: stopRec } = useVoiceRecorder();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const micDragY = useRef(new Animated.Value(0)).current;

  const micPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        micDragY.setValue(0);
        startRec(async (result) => {
          if (!result || !coupleId || !userId) return;
          try {
            const url = await uploadImage(result.uri, 'voice');
            await sendVoice(coupleId, userId, url, result.duration, mood);
          } catch (e) {
            console.error('voice send error', e);
          }
        });
      },
      onPanResponderMove: Animated.event([null, { dy: micDragY }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gs) => {
        micDragY.setValue(0);
        if (gs.dy < -50) {
          stopRec(true);  // cancel
        } else {
          stopRec(false); // send
        }
      },
      onPanResponderTerminate: () => {
        micDragY.setValue(0);
        stopRec(true);
      },
    })
  ).current;

  async function handlePlayVoice(letter: Letter) {
    if (!letter.voiceUrl) return;

    // stop current playback
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    if (playingId === letter.id) {
      setPlayingId(null);
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: letter.voiceUrl },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      setPlayingId(letter.id);
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (e) {
      console.error('voice play error', e);
      setPlayingId(null);
    }
  }
```

---

- [ ] **Step 3: 在 input bar 中添加麦克风按钮，并在 ScrollView 上方添加录音浮层**

找到 input bar 的 `{/* Image button */}` 块，在其之后（图片按钮 `</TouchableOpacity>` 之后，`<TextInput` 之前）插入麦克风按钮：

```tsx
            {/* Microphone button */}
            <Animated.View
              style={[styles.imgBtn, recState.isRecording && styles.imgBtnRecording]}
              {...micPanResponder.panHandlers}
            >
              <Text style={styles.imgBtnIcon}>🎙</Text>
            </Animated.View>
```

找到 `{/* Messages */}` 注释行，在其正上方（`</View>` insightBanner 结束后）插入录音浮层：

```tsx
        {/* Recording overlay */}
        {recState.isRecording && (
          <View style={styles.recordingOverlay}>
            <View style={styles.recordingInner}>
              <Text style={styles.recordingMic}>🎙</Text>
              <View style={styles.waveRow}>
                {[40, 70, 55, 90, 45, 80, 60, 35, 75, 50].map((h, i) => (
                  <View key={i} style={[styles.wavebar, { height: h * 0.28 }]} />
                ))}
              </View>
              <Text style={styles.recordingTimer}>
                0:{String(recState.elapsed).padStart(2, '0')}
              </Text>
            </View>
            <Text style={styles.recordingHint}>松开发送 · 上滑取消</Text>
          </View>
        )}
```

---

- [ ] **Step 4: 添加语音气泡渲染**

找到现有 `letter.type === 'image'` 的判断块：

```tsx
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
```

替换为三路判断：

```tsx
                        {letter.type === 'image' && letter.imageUrl ? (
                          <Image
                            source={{ uri: letter.imageUrl }}
                            style={[styles.imgBubble, isMe ? styles.imgBubbleMe : styles.imgBubbleThem]}
                          />
                        ) : letter.type === 'voice' && letter.voiceUrl ? (
                          <TouchableOpacity
                            style={[styles.voiceBubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
                            onPress={() => handlePlayVoice(letter)}
                          >
                            <Text style={[styles.voicePlayIcon, isMe && styles.voicePlayIconMe]}>
                              {playingId === letter.id ? '⏹' : '▶'}
                            </Text>
                            <View style={styles.voiceWaveRow}>
                              {[40, 80, 55, 100, 65, 45, 75, 35, 90, 50, 70, 30].map((h, i) => (
                                <View
                                  key={i}
                                  style={[
                                    styles.voiceWavebar,
                                    isMe ? styles.voiceWavebarMe : styles.voiceWavebarThem,
                                    { height: h * 0.2 },
                                  ]}
                                />
                              ))}
                            </View>
                            <Text style={[styles.voiceDuration, isMe && styles.voiceDurationMe]}>
                              0:{String(letter.duration ?? 0).padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                              {letter.content}
                            </Text>
                          </View>
                        )}
```

---

- [ ] **Step 5: 追加新样式到 StyleSheet**

在 `actionDeleteText` 样式后，`});` 结束括号之前追加：

```typescript
  // Microphone button recording state
  imgBtnRecording: {
    backgroundColor: 'rgba(74,222,128,0.2)',
    borderColor: colors.green,
    borderWidth: 2,
  },

  // Recording overlay
  recordingOverlay: {
    position: 'absolute',
    bottom: 90,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: '#0d1a0d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    padding: spacing.md,
    zIndex: 100,
  },
  recordingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordingMic: { fontSize: 22 },
  waveRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 28,
  },
  wavebar: {
    width: 3,
    backgroundColor: colors.green,
    borderRadius: 2,
  },
  recordingTimer: {
    color: colors.green,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
  },
  recordingHint: {
    color: colors.whiteSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },

  // Voice bubble
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    minWidth: 140,
  },
  voicePlayIcon: {
    fontSize: 16,
    color: colors.white,
  },
  voicePlayIconMe: { color: colors.bg },
  voiceWaveRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  voiceWavebar: {
    width: 2,
    borderRadius: 1,
  },
  voiceWavebarMe: { backgroundColor: 'rgba(10,10,20,0.6)' },
  voiceWavebarThem: { backgroundColor: 'rgba(255,255,255,0.5)' },
  voiceDuration: {
    fontSize: 13,
    color: colors.whiteSecondary,
    fontWeight: '600',
  },
  voiceDurationMe: { color: 'rgba(10,10,20,0.7)' },
```

---

- [ ] **Step 6: 提交**

```bash
git add src/screens/LetterScreen.tsx src/hooks/useVoiceRecorder.ts
git commit -m "feat: LetterScreen voice recording with mic button, overlay, swipe-cancel, voice bubble"
```

---

### Task 5: 手动验证

- [ ] 启动 App：`npx expo start`
- [ ] 进入情书页，确认输入栏出现 🎙 按钮（位于 🖼 右侧）
- [ ] 按住 🎙，确认录音浮层弹出，计时器开始走
- [ ] 松开，确认语音消息以气泡形式出现（▶ 按钮 + 静态波形 + 时长）
- [ ] 点击语音气泡，确认播放，再次点击确认停止
- [ ] 按住 🎙 后上滑超过 50px，确认浮层消失且没有消息发出
- [ ] 录音超过 20 秒，确认自动发送
- [ ] 切换到对方视图，确认 TA 发来的语音气泡是深蓝底

- [ ] **最终提交（如有遗漏改动）**

```bash
git add -A
git commit -m "feat: voice messages complete — recording, upload, playback"
```
