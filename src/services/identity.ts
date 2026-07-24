import AsyncStorage from '@react-native-async-storage/async-storage';
import { authReady, db } from '../config/cloudbase';

export interface IdentityOption {
  id: string;
  nickname: string;
  avatarUrl: string;
  gender: 'male' | 'female';
  coupleId: string;
}

const DEVICE_ID_KEY = 'loveletter_device_id';

export async function listIdentityOptions(): Promise<IdentityOption[]> {
  await authReady;
  const result = await db.collection('users').get();
  const users = ((result.data as any[]) ?? [])
    .filter(user => !!user?._id && !!user?.coupleId)
    .map(user => ({
      id: user._id as string,
      nickname: (user.nickname || '') as string,
      avatarUrl: (user.avatarUrl || '') as string,
      gender: (user.gender === 'female' ? 'female' : 'male') as 'male' | 'female',
      coupleId: user.coupleId as string,
    }));

  return users.sort((a, b) => {
    if (a.gender === b.gender) return a.id.localeCompare(b.id);
    return a.gender === 'male' ? -1 : 1;
  });
}

export function identityDisplayName(identity: IdentityOption, index = 0): string {
  if (identity.nickname.trim()) return identity.nickname.trim();
  if (identity.gender === 'male') return '男朋友';
  if (identity.gender === 'female') return '女朋友';
  return `成员 ${index + 1}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const value = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, value);
  return value;
}

export async function recordDeviceBinding(identity: IdentityOption): Promise<void> {
  await authReady;
  const deviceId = await getOrCreateDeviceId();
  const payload = {
    deviceId,
    memberId: identity.id,
    coupleId: identity.coupleId,
    platform: 'android',
    updatedAt: Date.now(),
  };

  // Keep device bindings inside the existing couple document so no new
  // CloudBase collection has to be created for this two-person app.
  await db.collection('couples').doc(identity.coupleId).update({
    [`devices.${deviceId}`]: payload,
  });
}
