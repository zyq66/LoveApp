// src/services/letters.ts
import { db } from '../config/cloudbase';

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

export function listenLetters(coupleId: string, callback: (letters: Letter[]) => void) {
  const watcher = db.collection('messages')
    .where({ coupleId })
    .watch({
      onChange: (snapshot: any) => {
        const letters = (snapshot.docs as any[])
          .map(d => ({ type: 'text', reactions: {}, ...d, id: d._id }))
          .sort((a: any, b: any) => a.createdAt - b.createdAt) as Letter[];
        callback(letters);
      },
      onError: (err: any) => console.error('listenLetters error', err),
    });
  return () => watcher.close();
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
