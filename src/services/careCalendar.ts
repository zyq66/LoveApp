import { db, authReady } from '../config/cloudbase';
import { watchCollection } from './realtime';

export type CareRecordType = 'allowance' | 'milkTea' | 'dessert' | 'clothes';

export interface CareRecord {
  id: string;
  coupleId: string;
  dateKey: string; // YYYY-MM-DD
  type: CareRecordType;
  amount?: number;
  note?: string;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
}

interface SaveCareRecordInput {
  amount?: number;
  note?: string;
}

function recordKey(dateKey: string, type: CareRecordType): string {
  return `d${dateKey.replace(/-/g, '')}_${type}`;
}

function normalizeCareRecords(couple: any, coupleId: string): CareRecord[] {
  const raw = couple?.careRecords ?? {};
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw)
    .map(([key, value]) => ({ key, value: value as any }))
    .filter(({ value }) => value && typeof value === 'object' && !value.deleted)
    .map(({ key, value }) => ({
      id: value.id || key,
      coupleId,
      dateKey: value.dateKey,
      type: value.type,
      amount: value.amount ?? 0,
      note: value.note ?? '',
      createdAt: value.createdAt ?? value.updatedAt ?? 0,
      updatedAt: value.updatedAt ?? 0,
      updatedBy: value.updatedBy ?? '',
    }) as CareRecord)
    .filter(record => !!record.dateKey && !!record.type);
}

export async function fetchCareRecords(coupleId: string): Promise<CareRecord[]> {
  await authReady;
  const res: any = await db.collection('couples').doc(coupleId).get();
  const couple = ((res.data as any[]) ?? [])[0];
  return normalizeCareRecords(couple, coupleId)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export function watchCareRecords(
  coupleId: string,
  onChange: (records: CareRecord[]) => void,
): () => void {
  return watchCollection<any>({
    buildQuery: () => db.collection('couples').where({ _id: coupleId }),
    mapper: (d: any) => d,
    onChange: (couples) => {
      onChange(
        normalizeCareRecords(couples[0], coupleId)
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
      );
    },
    debugLabel: 'watchCareRecords',
  });
}

export async function saveCareRecord(
  coupleId: string,
  userId: string,
  dateKey: string,
  type: CareRecordType,
  input: SaveCareRecordInput = {},
): Promise<string> {
  await authReady;
  const key = recordKey(dateKey, type);
  const now = Date.now();
  const record: CareRecord = {
    id: key,
    coupleId,
    dateKey,
    type,
    amount: input.amount ?? 0,
    note: input.note ?? '',
    createdAt: now,
    updatedAt: now,
    updatedBy: userId,
  };
  await db.collection('couples').doc(coupleId).update({
    [`careRecords.${key}`]: record,
  });
  return key;
}

export async function deleteCareRecord(
  coupleId: string,
  dateKey: string,
  type: CareRecordType,
  recordId: string,
): Promise<void> {
  await authReady;
  if (!recordId || recordId.startsWith('local-')) throw new Error('记录还没有同步完成，请稍后再试');
  const key = recordKey(dateKey, type);
  await db.collection('couples').doc(coupleId).update({
    [`careRecords.${key}.deleted`]: true,
    [`careRecords.${key}.updatedAt`]: Date.now(),
  });
}
