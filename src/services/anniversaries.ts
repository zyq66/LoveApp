// src/services/anniversaries.ts
import { db } from '../config/cloudbase';

export interface Anniversary {
  id: string;
  name: string;
  date: number;
}

export async function getAnniversaries(coupleId: string): Promise<Anniversary[]> {
  const res = await db.collection('anniversaries').where({ coupleId }).orderBy('date', 'asc').get();
  return ((res.data as any[]) ?? []).map(d => ({ id: d._id, name: d.name, date: d.date }));
}

export async function addAnniversary(coupleId: string, name: string, date: number): Promise<void> {
  await db.collection('anniversaries').add({ coupleId, name, date, createdAt: Date.now() });
}

export async function deleteAnniversary(coupleId: string, itemId: string): Promise<void> {
  await db.collection('anniversaries').doc(itemId).remove();
}
