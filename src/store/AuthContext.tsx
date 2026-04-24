// src/store/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  userId: string | null;
  coupleId: string | null;
  gender: 'male' | 'female' | null;
  loading: boolean;
  setAuth: (userId: string, coupleId: string, gender: 'male' | 'female') => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet(['userId', 'coupleId', 'gender']).then(pairs => {
      const uid = pairs[0][1];
      const cid = pairs[1][1];
      const g = pairs[2][1] as 'male' | 'female' | null;
      if (uid) {
        setUserId(uid);
        setCoupleId(cid ?? '');
        setGender(g);
      }
      setLoading(false);
    });
  }, []);

  const setAuth = (uid: string, cid: string, g: 'male' | 'female') => {
    setUserId(uid);
    setCoupleId(cid);
    setGender(g);
    AsyncStorage.multiSet([['userId', uid], ['coupleId', cid], ['gender', g]]);
  };

  const clearAuth = () => {
    setUserId(null);
    setCoupleId(null);
    setGender(null);
    AsyncStorage.multiRemove(['userId', 'coupleId', 'gender']);
  };

  return (
    <AuthContext.Provider value={{ userId, coupleId, gender, loading, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
