// src/store/AuthContext.tsx
//
// 本机身份 + 当前成员 / 伴侣 / 双人空间的实时订阅。
// 界面没有账号登录；首次选择身份后，沿用历史 userId/coupleId。
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/cloudbase';
import { watchCollection } from '../services/realtime';
import { IdentityOption, recordDeviceBinding } from '../services/identity';

export interface UserDoc {
  _id: string;
  phone?: string;
  nickname?: string;
  avatarUrl?: string;
  gender?: 'male' | 'female';
  coupleId?: string;
  code?: string;
}

export interface CoupleDoc {
  _id: string;
  user1?: string;
  user2?: string;
  startDate?: number;
  status?: string;
  rolls?: Record<string, {
    id: string;
    title: string;
    type: 'normal' | 'secret';
    status: 'open' | 'developed';
    unlockAt?: number;
    createdBy: string;
    createdAt: number;
  }>;
}

interface AuthState {
  userId: string | null;
  coupleId: string;                   // 永远是 string，未配对时 ''
  gender: 'male' | 'female' | null;
  user: UserDoc | null;               // 当前用户实时文档
  partner: UserDoc | null;            // 伴侣实时文档
  couple: CoupleDoc | null;           // couple 文档（含 startDate 等）
  loading: boolean;
  selectIdentity: (identity: IdentityOption) => Promise<void>;
  resetIdentity: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<UserDoc | null>(null);
  const [couple, setCouple] = useState<CoupleDoc | null>(null);
  const [partner, setPartner] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // Cold-start fallback：watch 拉到第一帧之前用 AsyncStorage 兜底
  const [bootstrapGender, setBootstrapGender] = useState<'male' | 'female' | null>(null);
  const [bootstrapCoupleId, setBootstrapCoupleId] = useState<string>('');

  // 启动恢复
  useEffect(() => {
    AsyncStorage.multiGet(['userId', 'coupleId', 'gender']).then(pairs => {
      const uid = pairs[0][1];
      const cid = pairs[1][1] || '';
      const g = pairs[2][1] as 'male' | 'female' | null;
      if (uid) setUserId(uid);
      setBootstrapCoupleId(cid);
      setBootstrapGender(g);
      setLoading(false);
    });
  }, []);

  // ── Layer 1: watch 自己的 user 文档 ─────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }
    const unsub = watchCollection<UserDoc>({
      buildQuery: () => db.collection('users').where({ _id: userId }),
      mapper: (d: any) => d as UserDoc,
      onChange: (users) => setUser(users[0] ?? null),
      debugLabel: 'auth.self',
    });
    return unsub;
  }, [userId]);

  // 派生：coupleId 来自 user 文档，未拉到时用 bootstrap 兜底
  const coupleId = user ? (user.coupleId || '') : bootstrapCoupleId;
  const gender = user?.gender ?? bootstrapGender;

  // user 推送过来后，把 coupleId/gender 同步到 AsyncStorage
  useEffect(() => {
    if (!user) return;
    AsyncStorage.multiSet([
      ['coupleId', user.coupleId || ''],
      ['gender', user.gender || 'male'],
    ]);
  }, [user?.coupleId, user?.gender]);

  // ── Layer 2: watch couple 文档 ──────────────────────────────────────
  useEffect(() => {
    if (!coupleId) {
      setCouple(null);
      return;
    }
    const unsub = watchCollection<CoupleDoc>({
      buildQuery: () => db.collection('couples').where({ _id: coupleId }),
      mapper: (d: any) => d as CoupleDoc,
      onChange: (couples) => setCouple(couples[0] ?? null),
      debugLabel: 'auth.couple',
    });
    return unsub;
  }, [coupleId]);

  // ── Layer 3: watch 伴侣 user 文档 ───────────────────────────────────
  const partnerId = couple
    ? (couple.user1 === userId ? (couple.user2 || '') : (couple.user1 || ''))
    : '';
  useEffect(() => {
    if (!partnerId) {
      setPartner(null);
      return;
    }
    const unsub = watchCollection<UserDoc>({
      buildQuery: () => db.collection('users').where({ _id: partnerId }),
      mapper: (d: any) => d as UserDoc,
      onChange: (users) => setPartner(users[0] ?? null),
      debugLabel: 'auth.partner',
    });
    return unsub;
  }, [partnerId]);

  async function selectIdentity(identity: IdentityOption) {
    setUserId(identity.id);
    setBootstrapCoupleId(identity.coupleId);
    setBootstrapGender(identity.gender);
    await AsyncStorage.multiSet([
      ['userId', identity.id],
      ['coupleId', identity.coupleId],
      ['gender', identity.gender],
    ]);
    recordDeviceBinding(identity).catch(() => {
      // Binding metadata is helpful for background sync but must never block entry.
    });
  }

  async function resetIdentity() {
    setUserId(null);
    setUser(null);
    setCouple(null);
    setPartner(null);
    setBootstrapCoupleId('');
    setBootstrapGender(null);
    await AsyncStorage.multiRemove(['userId', 'coupleId', 'gender']);
  }

  return (
    <AuthContext.Provider value={{
      userId,
      coupleId,
      gender,
      user,
      partner,
      couple,
      loading,
      selectIdentity,
      resetIdentity,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
