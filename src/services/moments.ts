// src/services/moments.ts
import { db } from '../config/cloudbase';

export interface Moment {
  id: string;
  title: string;
  note: string;
  emoji: string;
  date: number;
  createdAt: number;
  photoUrl?: string;
  addedBy: string;
}

export function listenMoments(coupleId: string, callback: (moments: Moment[]) => void): () => void {
  const watcher = db.collection('moments')
    .where({ coupleId })
    .watch({
      onChange: (snapshot: any) => {
        const moments = (snapshot.docs as any[])
          .map(d => ({ ...d, id: d._id }))
          .sort((a: any, b: any) => b.date - a.date) as Moment[];
        callback(moments);
      },
      onError: (err: any) => console.error('listenMoments error', err),
    });
  return () => watcher.close();
}

export async function addMoment(
  coupleId: string,
  userId: string,
  data: { title: string; note: string; emoji: string; date: number; photoUrl?: string },
): Promise<void> {
  const payload: Record<string, unknown> = {
    coupleId,
    title: data.title,
    note: data.note,
    emoji: data.emoji,
    date: data.date,
    createdAt: Date.now(),
    addedBy: userId,
  };
  if (data.photoUrl) payload.photoUrl = data.photoUrl;
  await db.collection('moments').add(payload);
}

export async function deleteMoment(coupleId: string, momentId: string): Promise<void> {
  await db.collection('moments').doc(momentId).remove();
}
