// src/store/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  userId: string | null;
  coupleId: string | null;
  loading: boolean;
  setAuth: (userId: string, coupleId: string) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setAuth = (uid: string, cid: string) => {
    setUserId(uid);
    setCoupleId(cid);
    AsyncStorage.multiSet([['userId', uid], ['coupleId', cid]]);
  };

  const clearAuth = () => {
    setUserId(null);
    setCoupleId(null);
    AsyncStorage.multiRemove(['userId', 'coupleId']);
  };

  return (
    <AuthContext.Provider value={{ userId, coupleId, loading, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
