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
