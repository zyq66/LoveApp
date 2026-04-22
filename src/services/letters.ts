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
