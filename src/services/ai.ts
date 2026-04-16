// src/services/ai.ts
const DEEPSEEK_API_KEY = 'sk-26f3d35065f743cb94bcff218c874659';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function chat(system: string, user: string, maxTokens = 300): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.9,
    }),
  });
  const data = await res.json();
  if (!data.choices?.[0]) throw new Error('AI 服务异常，请稍后再试');
  return (data.choices[0].message.content as string).trim();
}

/** 根据关键词生成一封情书 */
export async function generateLoveLetter(keywords: string): Promise<string> {
  return chat(
    '你是一个专业情书写手，中文，风格真诚温暖不做作，100-150字。只输出情书正文，不要标题或说明。',
    `根据以下关键词写一封情书：${keywords}`,
  );
}

/** 根据最近消息和心情，给一句贴心的回应建议 */
export async function analyzeMood(
  messages: { content: string; mood: string; isMe: boolean }[],
): Promise<string> {
  const recent = messages.slice(-6).map(m =>
    `${m.isMe ? '我' : 'TA'}（${m.mood}）：${m.content || '[图片]'}`,
  ).join('\n');
  return chat(
    '你是一个情感顾问，根据恋人之间最近的对话，给出一句温柔贴心的互动建议，15-25字，简洁自然。只输出建议，不加任何前缀。',
    `最近对话：\n${recent}`,
    60,
  );
}

/** 生成今日情侣话题 */
export async function generateDailyTopic(): Promise<string> {
  return chat(
    '你是一个恋爱关系顾问，专门为情侣设计深度交流话题。生成一个有趣、温暖、能引发深入聊天的问题，中文，25-40字，直接输出问题本身，不加任何前缀或标点说明。',
    '给一对热恋中的情侣生成一个今日话题，要有新意，不要太普通。',
    80,
  );
}

/** 生成纪念日专属祝福文案 */
export async function generateAnniversaryWish(
  name: string,
  daysLeft: number,
): Promise<string> {
  const timing = daysLeft === 0 ? '就是今天' : `还有 ${daysLeft} 天`;
  return chat(
    '你是一个文案写手，写纪念日祝福语，中文，温暖真诚，50-80字。只输出正文，不加任何说明。',
    `纪念日名称：「${name}」，${timing}。写一段专属祝福语。`,
    150,
  );
}
