# 今日小任务 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首页天数下方展示每日情侣小任务，AI 生成并按日期缓存到 AsyncStorage，失败走固定题库兜底。

**Architecture:** ai.ts 新增 generateDailyTask()；新建 DailyTaskWidget 组件，内含题库、AsyncStorage 缓存逻辑和渲染；HomeScreen 引入组件。云函数新增 task 分支。

**Tech Stack:** React Native, TypeScript, AsyncStorage, DeepSeek via 腾讯云函数

---

### Task 1: 云函数新增 task 分支

**Files:**
- Modify: `functions/ai-proxy/index.js`

- [ ] **Step 1: 在 wish 分支后、else 前插入 task 分支**

找到 `} else {` 行（即 `return { error: 'unknown type' };` 前），在其前插入：

```javascript
} else if (type === 'task') {
  system = `你是一个情侣关系顾问，专为两人设计每日小任务。这是一个情侣私密 App，任务内容可以温馨、甜蜜或亲密挑逗。输出一句话，不超过 25 字，直接输出任务本身，不加任何前缀、序号或说明。`;
  userPrompt = `今天的任务方向：${event.direction}。生成一个适合情侣今天完成的小任务。`;
  maxTokens = 60;
```

改完后该段代码为：

```javascript
} else if (type === 'task') {
  system = `你是一个情侣关系顾问，专为两人设计每日小任务。这是一个情侣私密 App，任务内容可以温馨、甜蜜或亲密挑逗。输出一句话，不超过 25 字，直接输出任务本身，不加任何前缀、序号或说明。`;
  userPrompt = `今天的任务方向：${event.direction}。生成一个适合情侣今天完成的小任务。`;
  maxTokens = 60;

} else {
  return { error: 'unknown type' };
}
```

- [ ] **Step 2: 将更新后的云函数内容粘贴到腾讯云控制台**

登录 [CloudBase 控制台](https://console.cloud.tencent.com/tcb) → 云函数 → ai-proxy → 函数代码 → 粘贴完整 index.js → 保存并部署。

- [ ] **Step 3: 提交本地云函数文件**

```bash
git add functions/ai-proxy/index.js
git commit -m "feat: ai-proxy add task type for daily couple task generation"
```

---

### Task 2: ai.ts 新增 generateDailyTask

**Files:**
- Modify: `src/services/ai.ts`

- [ ] **Step 1: 在文件末尾追加 generateDailyTask**

在 `generateAnniversaryWish` 函数后追加：

```typescript
// ── 今日小任务 ────────────────────────────────────────────────────────────────

const TASK_DIRECTIONS = [
  '温馨日常', '甜蜜撒娇', '亲密挑逗',
  '温馨日常', '温馨日常', '甜蜜撒娇', // 权重：日常40% 撒娇35% 挑逗25%
  '甜蜜撒娇', '温馨日常', '亲密挑逗',
  '温馨日常', '甜蜜撒娇', '温馨日常',
];

export async function generateDailyTask(): Promise<string> {
  return callAI('task', { direction: pick(TASK_DIRECTIONS) });
}
```

- [ ] **Step 2: 提交**

```bash
git add src/services/ai.ts
git commit -m "feat: ai.ts add generateDailyTask with weighted direction"
```

---

### Task 3: 新建 DailyTaskWidget 组件

**Files:**
- Create: `src/components/DailyTaskWidget.tsx`

- [ ] **Step 1: 创建组件文件**

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateDailyTask } from '../services/ai';
import { colors, spacing } from '../theme';

const FALLBACK_TASKS = [
  '今天夸对方一个你从没说过的优点 💬',
  '给 TA 发一首今天脑海中响起的歌 🎵',
  '今晚语音通话至少 10 分钟 📞',
  '发一张你今天的自拍给 TA 📸',
  '告诉 TA 你今天最开心的一件小事 😊',
  '给 TA 发一条只有你们懂的梗 😂',
  '今天帮 TA 做一件小事，不用说原因 🌸',
  '发一张你觉得自己今天最好看的照片 ✨',
  '描述一个你最近想和 TA 一起做的事 💭',
  '发一张你的腿照给 TA 👀',
  '今晚睡前给 TA 发一条语音 🎙',
  '告诉 TA 你喜欢 TA 哪个小习惯 💕',
  '今天给 TA 发一个你觉得 TA 会喜欢的表情包 😄',
  '发一张你现在所在地方的照片 📍',
  '今天用文字描述一下 TA 在你心里的样子 💝',
  '发一张能代表你今天心情的图片 🌈',
  '告诉 TA 你最近一次想念 TA 是什么时候 🥺',
  '今天给 TA 发一个你最近学会的新词或梗 😝',
  '发一张你觉得自己胸/背最好看角度的照片 🔥',
  '今晚一起看同一部剧或电影，各自在家 🎬',
  '告诉 TA 一件你一直想做但还没做的事 🌟',
  '给 TA 发一张让你想起 TA 的路边风景 🌿',
  '今天记录一件让你觉得被爱的小事 💌',
  '用三个词形容一下今天的 TA 🎯',
  '今晚给 TA 发一段睡前语音哄 TA 睡觉 🌙',
  '发一张你今天吃的最好吃的东西 🍜',
  '告诉 TA 你最喜欢和 TA 做的事是什么 🎈',
  '今天主动撒一次娇，不许害羞 🥰',
  '发一张你现在的表情自拍 😜',
  '描述你想象中你们以后住在一起的样子 🏠',
  '发一张让你联想到 TA 的商品截图 🛍',
  '今天给 TA 发一段你觉得适合你们的歌词 🎶',
  '今晚睡前互相说一件今天想到对方的瞬间 ✨',
  '发一张你觉得自己腿最好看的照片给 TA 👢',
  '今天告诉 TA 一件你一直没说出口的小事 💬',
  '给 TA 发一个你最近在用的表情，解释一下含义 😊',
  '今天找一首新歌一起听，说说各自感受 🎧',
  '发一张你认为你们最像情侣的合照 📷',
  '今天做一件让 TA 感到惊喜的小事 🎁',
];

function todayKey(): string {
  const d = new Date();
  return `daily_task_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function fallbackTask(): string {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return FALLBACK_TASKS[dayIndex % FALLBACK_TASKS.length];
}

export function DailyTaskWidget() {
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const key = todayKey();
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          if (!cancelled) setTask(cached);
          return;
        }
        const generated = await generateDailyTask();
        await AsyncStorage.setItem(key, generated);
        if (!cancelled) setTask(generated);
      } catch {
        if (!cancelled) setTask(fallbackTask());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>✦ 今日小任务</Text>
        <ActivityIndicator size="small" color={colors.green} style={{ marginTop: 8 }} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>✦ 今日小任务</Text>
      <Text style={styles.task}>{task}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(74,222,128,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.green,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  task: {
    fontSize: 15,
    color: colors.white,
    lineHeight: 22,
  },
});
```

- [ ] **Step 2: 提交**

```bash
git add src/components/DailyTaskWidget.tsx
git commit -m "feat: DailyTaskWidget with AI generation, AsyncStorage cache, fallback list"
```

---

### Task 4: HomeScreen 引入 DailyTaskWidget

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: 在 import 区追加组件引入**

在 HomeScreen.tsx 顶部 import 区末尾追加：

```typescript
import { DailyTaskWidget } from '../components/DailyTaskWidget';
```

- [ ] **Step 2: 在 JSX 中插入 Widget**

找到 `{/* ── Anniversary Section ── */}` 注释行，在其正上方插入：

```tsx
<DailyTaskWidget />
```

完整上下文应为：

```tsx
        {startDate > 0 && (
          <Text style={styles.startDateText}>
            ♡  自 {formatStartDate(startDate)} 相恋至今
          </Text>
        )}
      </View>

      <DailyTaskWidget />

      {/* ── Anniversary Section ── */}
```

- [ ] **Step 3: 提交**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: HomeScreen integrates DailyTaskWidget above anniversaries"
```

---

### Task 5: 手动验证

- [ ] 启动 App：`npx expo start`
- [ ] 首页天数下方出现今日小任务卡片，加载时显示 spinner
- [ ] 任务内容正常显示（AI 生成或题库兜底）
- [ ] 杀掉 App 重新打开，任务内容不变（AsyncStorage 缓存生效）
- [ ] 修改手机日期到第二天（或清除 AsyncStorage），重开 App，任务更新
