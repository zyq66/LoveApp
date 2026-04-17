// src/services/ai.ts
import { app } from '../config/cloudbase';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function callAI(type: string, payload: Record<string, unknown>): Promise<string> {
  const res: any = await app.callFunction({
    name: 'ai-proxy',
    data: { type, ...payload },
  });
  if (res.result?.error) throw new Error(res.result.error);
  return res.result.text as string;
}

// ── 情书 ────────────────────────────────────────────────────────────────────

const LETTER_STYLES = [
  '像初恋那样青涩真诚，带点紧张的甜蜜',
  '俏皮幽默，带点撒娇，让人忍不住想笑',
  '诗意浪漫，意境悠远，像一首现代短诗',
  '深情克制，字字珠玑，越读越有味道',
  '像在讲一个只有两个人懂的小故事',
];

export async function generateLoveLetter(keywords: string): Promise<string> {
  return callAI('letter', { keywords, style: pick(LETTER_STYLES) });
}

// ── 心情分析 ─────────────────────────────────────────────────────────────────

const MOOD_MODES = [
  { mode: 'insight', desc: '给出一句温柔贴心的互动建议，15-25字' },
  { mode: 'date', desc: '推荐一个今晚两人可以一起做的小约定，20-30字，具体可执行' },
  { mode: 'action', desc: '给出一个让对方此刻感到被爱的小行动，15-25字，简单直接' },
  { mode: 'summary', desc: '用一句话总结此刻两人关系的状态，带点诗意，20-30字' },
];

export async function analyzeMood(
  msgs: { content: string; mood: string; isMe: boolean }[],
): Promise<string> {
  const messages = msgs.slice(-6)
    .map(m => `${m.isMe ? '我' : 'TA'}（${m.mood}）：${m.content || '[图片]'}`)
    .join('\n');
  const { mode, desc } = pick(MOOD_MODES);
  return callAI('mood', { messages, mode, desc });
}

// ── 今日话题 ─────────────────────────────────────────────────────────────────

const TOPIC_CATEGORIES = [
  '童年记忆', '梦想与未来', '食物与美食', '旅行与向往', '恐惧与勇气',
  '日常小习惯', '家与归属感', '秘密与告白', '成长与改变', '工作与理想',
  '兴趣爱好', '节日与仪式感', '电影与音乐', '争吵与和好', '第一次的记忆',
  '老了以后', '让对方惊喜', '金钱观', '身体与健康', '关于孤独',
];

const TOPIC_FORMATS = [
  '用"如果……你会……"的假设句式提问',
  '用"你还记得……吗"的回忆句式提问',
  '用"……还是……"的选择句式提问',
  '用"你有没有想过……"的期待句式提问',
  '直接提出一个开放性问题',
];

export async function generateDailyTopic(): Promise<string> {
  return callAI('topic', {
    category: pick(TOPIC_CATEGORIES),
    format: pick(TOPIC_FORMATS),
  });
}

// ── 纪念日祝福 ───────────────────────────────────────────────────────────────

const WISH_STYLES = [
  '像朋友间的悄悄话，轻松自然',
  '像一封短信，有仪式感',
  '像一首短诗，有意境',
  '带点小幽默，让人看了想笑又感动',
];

function wishUrgency(daysLeft: number): string {
  if (daysLeft === 0) return '就是今天，语气热烈庆祝，充满惊喜感';
  if (daysLeft <= 3) return `还有 ${daysLeft} 天，充满期待和甜蜜的倒计时感`;
  if (daysLeft <= 7) return `还有 ${daysLeft} 天，温馨提醒，带点小兴奋`;
  return `还有 ${daysLeft} 天，语气轻松俏皮，不用太煽情`;
}

export async function generateAnniversaryWish(name: string, daysLeft: number): Promise<string> {
  return callAI('wish', {
    name,
    daysLeft,
    urgency: wishUrgency(daysLeft),
    style: pick(WISH_STYLES),
  });
}
