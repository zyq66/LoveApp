// src/services/anniversaries.ts
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

export interface Anniversary {
  id: string;
  name: string;
  date: number; // timestamp ms
}

export async function getAnniversaries(coupleId: string): Promise<Anniversary[]> {
  const q = query(collection(db, `anniversaries/${coupleId}/items`), orderBy('date', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Anniversary));
}

export async function addAnniversary(coupleId: string, name: string, date: number): Promise<void> {
  await addDoc(collection(db, `anniversaries/${coupleId}/items`), { name, date, createdAt: Date.now() });
}

export async function deleteAnniversary(coupleId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, `anniversaries/${coupleId}/items`, itemId));
}
