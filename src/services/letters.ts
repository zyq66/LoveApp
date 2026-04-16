// src/services/letters.ts
import { db } from '../config/firebase';
import {
  collection, addDoc, query, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc,
} from 'firebase/firestore';

export interface Letter {
  id: string;
  from: string;
  content: string;
  mood: string;
  type: 'text' | 'image';
  imageUrl?: string;
  createdAt: number;
  read: boolean;
  reactions: Record<string, string>; // userId -> emoji
}

export async function sendLetter(
  coupleId: string,
  userId: string,
  content: string,
  mood: string,
): Promise<void> {
  await addDoc(collection(db, `letters/${coupleId}/messages`), {
    from: userId, content, mood, type: 'text',
    createdAt: Date.now(), read: false, reactions: {},
  });
}

export async function sendImage(
  coupleId: string,
  userId: string,
  imageUrl: string,
  mood: string,
): Promise<void> {
  await addDoc(collection(db, `letters/${coupleId}/messages`), {
    from: userId, content: '', mood, type: 'image', imageUrl,
    createdAt: Date.now(), read: false, reactions: {},
  });
}

export function listenLetters(coupleId: string, callback: (letters: Letter[]) => void) {
  const q = query(
    collection(db, `letters/${coupleId}/messages`),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        type: 'text',
        reactions: {},
        ...data,
      } as Letter;
    }));
  });
}

export async function markRead(coupleId: string, letterId: string): Promise<void> {
  await updateDoc(doc(db, `letters/${coupleId}/messages/${letterId}`), { read: true });
}

export async function addReaction(
  coupleId: string,
  letterId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  await updateDoc(doc(db, `letters/${coupleId}/messages/${letterId}`), {
    [`reactions.${userId}`]: emoji,
  });
}

export async function deleteLetter(coupleId: string, letterId: string): Promise<void> {
  await deleteDoc(doc(db, `letters/${coupleId}/messages/${letterId}`));
}
