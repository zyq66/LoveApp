// src/store/AuthContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface AuthState {
  userId: string | null;
  coupleId: string | null;
  setAuth: (userId: string, coupleId: string) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);

  const setAuth = (uid: string, cid: string) => {
    setUserId(uid);
    setCoupleId(cid);
  };
  const clearAuth = () => {
    setUserId(null);
    setCoupleId(null);
  };

  return (
    <AuthContext.Provider value={{ userId, coupleId, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
