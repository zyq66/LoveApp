'use strict';
const https = require('https');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

exports.main = async (event) => {
  const { type } = event;

  let system, userPrompt, maxTokens;

  if (type === 'letter') {
    system = `你是一个情书写手，中文。写作风格：${event.style}。100-150字，只输出情书正文，不要标题或说明。`;
    userPrompt = `根据以下关键词写一封情书：${event.keywords}`;
    maxTokens = 320;

  } else if (type === 'mood') {
    system = `你是一个情感顾问，根据恋人之间最近的对话，${event.desc}。只输出结果，不加任何前缀或解释。`;
    userPrompt = `最近对话：\n${event.messages}`;
    maxTokens = 80;

  } else if (type === 'topic') {
    system = `你是一个恋爱关系顾问，专门为情侣设计深度交流话题。${event.format}，围绕给定方向生成一个话题，中文，25-40字，直接输出问题本身，不加任何前缀或标点说明。`;
    userPrompt = `方向：「${event.category || '日常生活'}」`;
    maxTokens = 80;

  } else if (type === 'wish') {
    system = `你是一个文案写手，写纪念日祝福语，中文，50-80字。风格：${event.style}。只输出正文，不加任何说明。`;
    userPrompt = `纪念日名称：「${event.name}」，${event.urgency}。写一段专属祝福语。`;
    maxTokens = 160;

  } else {
    return { error: 'unknown type' };
  }

  try {
    const text = await callDeepSeek(system, userPrompt, maxTokens);
    return { text };
  } catch (e) {
    return { error: e.message || 'AI 服务异常' };
  }
};

function callDeepSeek(system, user, maxTokens) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.95,
    });

    const req = https.request(
      {
        hostname: 'api.deepseek.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.message?.content;
            if (!text) reject(new Error('AI 服务异常'));
            else resolve(text.trim());
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
