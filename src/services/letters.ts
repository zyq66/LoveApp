// src/services/letters.ts
import { db, authReady } from '../config/cloudbase';
import { watchCollection } from './realtime';

export interface Letter {
  id: string;
  from: string;
  content: string;
  mood: string;
  type: 'text' | 'image';
  imageUrl?: string;
  createdAt: number;
  read: boolean;
  reactions: Record<string, string>;
}

export async function sendLetter(coupleId: string, userId: string, content: string, mood: string): Promise<void> {
  await authReady;
  await db.collection('messages').add({
    coupleId, from: userId, content, mood, type: 'text',
    createdAt: Date.now(), read: false, reactions: {},
  });
}

export async function sendImage(coupleId: string, userId: string, imageUrl: string, mood: string): Promise<void> {
  await authReady;
  await db.collection('messages').add({
    coupleId, from: userId, content: '', mood, type: 'image', imageUrl,
    createdAt: Date.now(), read: false, reactions: {},
  });
}

export function listenLetters(coupleId: string, callback: (letters: Letter[]) => void) {
  return watchCollection<Letter>({
    buildQuery: () => db.collection('messages').where({ coupleId }),
    mapper: (d: any) => ({ type: 'text', reactions: {}, ...d, id: d._id }) as Letter,
    onChange: (letters) => {
      letters.sort((a, b) => a.createdAt - b.createdAt);
      callback(letters);
    },
    debugLabel: 'listenLetters',
  });
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
