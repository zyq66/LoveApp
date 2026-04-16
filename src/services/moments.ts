// src/services/moments.ts
import {
  collection, addDoc, deleteDoc, doc,
  query, orderBy, onSnapshot, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Moment {
  id: string;
  title: string;
  note: string;
  emoji: string;
  date: number; // ms timestamp (the recorded date, not upload date)
  createdAt: number;
  photoUrl?: string;
  addedBy: string;
}

export function listenMoments(
  coupleId: string,
  callback: (moments: Moment[]) => void,
): () => void {
  const q = query(
    collection(db, `moments/${coupleId}/entries`),
    orderBy('date', 'desc'),
  );
  return onSnapshot(q, snap => {
    callback(
      snap.docs.map(d => ({ id: d.id, ...d.data() } as Moment)),
    );
  });
}

export async function addMoment(
  coupleId: string,
  userId: string,
  data: { title: string; note: string; emoji: string; date: number; photoUrl?: string },
): Promise<void> {
  const payload: Record<string, unknown> = {
    title: data.title,
    note: data.note,
    emoji: data.emoji,
    date: data.date,
    createdAt: Date.now(),
    addedBy: userId,
  };
  if (data.photoUrl) payload.photoUrl = data.photoUrl;
  await addDoc(collection(db, `moments/${coupleId}/entries`), payload);
}

export async function deleteMoment(coupleId: string, momentId: string): Promise<void> {
  await deleteDoc(doc(db, `moments/${coupleId}/entries`, momentId));
}
