// src/store/AuthContext.tsx
//
// 全局登录态 + 当前用户 / 伴侣 / couple 文档的实时订阅
//
// 之前的实现：
//   - HomeScreen 用 5s 轮询检测自己被配对
//   - HomeScreen / MoreScreen / ProfileScreen 各自手动 fetch users.doc(userId)
//   - 改头像/昵称后只能手动同步
//
// 现在：AuthContext 内 watch 三层数据（自己 → couple → 伴侣），
// 任何一方变更（被配对、改头像、改昵称、解绑）自动推送到所有屏幕。
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/cloudbase';
import { watchCollection } from '../services/realtime';

export interface UserDoc {
  _id: string;
  phone?: string;
  nickname?: string;
  avatarUrl?: string;
  gender?: 'male' | 'female';
  coupleId?: string;
  code?: string;
}

interface CoupleDoc {
  _id: string;
  user1?: string;
  user2?: string;
  startDate?: number;
  status?: string;
}

interface AuthState {
  userId: string | null;
  coupleId: string;                   // 永远是 string，未配对时 ''
  gender: 'male' | 'female' | null;
  user: UserDoc | null;               // 当前用户实时文档
  partner: UserDoc | null;            // 伴侣实时文档
  couple: CoupleDoc | null;           // couple 文档（含 startDate 等）
  loading: boolean;
  setAuth: (userId: string, gender: 'male' | 'female') => void;
  clearAuth: () => void;
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

  function setAuth(uid: string, g: 'male' | 'female') {
    setUserId(uid);
    setBootstrapGender(g);
    AsyncStorage.multiSet([['userId', uid], ['gender', g]]);
  }

  function clearAuth() {
    setUserId(null);
    setUser(null);
    setCouple(null);
    setPartner(null);
    setBootstrapCoupleId('');
    setBootstrapGender(null);
    AsyncStorage.multiRemove(['userId', 'coupleId', 'gender']);
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
      setAuth,
      clearAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
