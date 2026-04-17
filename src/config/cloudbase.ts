// Polyfill localStorage / sessionStorage for React Native
function makeStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}
if (typeof (global as any).localStorage === 'undefined') {
  (global as any).localStorage = makeStorage();
}
if (typeof (global as any).sessionStorage === 'undefined') {
  (global as any).sessionStorage = makeStorage();
}

import cloudbase from '@cloudbase/js-sdk';

export const app = cloudbase.init({
  env: 'loveapp-d0gwjimribc470041',
});

// 匿名登录 — 导出 Promise，供服务层 await
export const authReady: Promise<void> = app
  .auth({ persistence: 'none' })
  .anonymousAuthProvider()
  .signIn()
  .then(() => { console.log('[TCB] auth ready'); })
  .catch((e: any) => { console.warn('[TCB] auth failed', e); });

export const db = app.database();
