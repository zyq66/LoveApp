import { authReady, db } from '../config/cloudbase';
import { CoupleDoc } from '../store/AuthContext';

export interface MemoryRoll {
  id: string;
  title: string;
  type: 'normal' | 'secret';
  status: 'open' | 'developed';
  unlockAt?: number;
  createdBy: string;
  createdAt: number;
}

export function coupleRolls(couple: CoupleDoc | null): MemoryRoll[] {
  return Object.values(couple?.rolls || {})
    .filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createRoll(
  coupleId: string,
  userId: string,
  title: string,
  type: 'normal' | 'secret' = 'normal',
  unlockAt?: number,
): Promise<MemoryRoll> {
  await authReady;
  const id = `roll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const roll: MemoryRoll = {
    id,
    title: title.trim(),
    type,
    status: type === 'secret' ? 'open' : 'open',
    unlockAt: type === 'secret' ? unlockAt : undefined,
    createdBy: userId,
    createdAt: Date.now(),
  };
  await db.collection('couples').doc(coupleId).update({ [`rolls.${id}`]: roll });
  return roll;
}

export async function developRoll(coupleId: string, rollId: string): Promise<void> {
  await authReady;
  await db.collection('couples').doc(coupleId).update({
    [`rolls.${rollId}.status`]: 'developed',
  });
}
