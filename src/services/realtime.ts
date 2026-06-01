// src/services/realtime.ts
//
// 通用 TCB 实时监听包装器，处理 RN 环境下 watch() 的几种典型问题：
//   1. onError 触发 → 指数退避重连（1s → 2s → 4s → ... → 30s 上限）
//   2. App 从后台切回前台 → 强制重建 watch（iOS 后台 ~30s 后 WebSocket 会被系统暂停）
//   3. 组件卸载 → 关闭 watcher + 解绑 AppState 监听
import { AppState, AppStateStatus } from 'react-native';
import { authReady } from '../config/cloudbase';

export interface WatchOptions<T> {
  buildQuery: () => any;              // 工厂：每次重连重新构建（避免引用过期的 query 对象）
  mapper: (doc: any) => T;            // 单条文档映射
  onChange: (items: T[]) => void;     // 数据变更回调（已映射）
  debugLabel?: string;                // 日志前缀
}

const MAX_BACKOFF_MS = 30000;
const INITIAL_BACKOFF_MS = 1000;

export function watchCollection<T>(opts: WatchOptions<T>): () => void {
  const { buildQuery, mapper, onChange, debugLabel = 'watch' } = opts;

  let watcher: any = null;
  let cancelled = false;
  let backoff = INITIAL_BACKOFF_MS;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let lastAppState: AppStateStatus = AppState.currentState;

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function closeWatcher() {
    if (watcher) {
      try { watcher.close(); } catch (e) { /* ignore */ }
      watcher = null;
    }
  }

  function scheduleReconnect() {
    if (cancelled) return;
    clearReconnectTimer();
    closeWatcher();
    reconnectTimer = setTimeout(start, backoff);
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
  }

  async function start() {
    if (cancelled) return;
    clearReconnectTimer();
    closeWatcher();
    try {
      await authReady;
      if (cancelled) return;
      watcher = buildQuery().watch({
        onChange: (snapshot: any) => {
          backoff = INITIAL_BACKOFF_MS; // 成功推送后重置退避
          const docs = (snapshot?.docs as any[]) ?? [];
          onChange(docs.map(mapper));
        },
        onError: (err: any) => {
          console.warn(`[${debugLabel}] onError, reconnecting`, err);
          scheduleReconnect();
        },
      });
    } catch (e) {
      console.warn(`[${debugLabel}] start failed`, e);
      scheduleReconnect();
    }
  }

  const appStateSub = AppState.addEventListener('change', (state) => {
    // 从非 active 切回 active：强制重建 socket
    if (lastAppState !== 'active' && state === 'active') {
      backoff = INITIAL_BACKOFF_MS;
      start();
    }
    lastAppState = state;
  });

  start();

  return () => {
    cancelled = true;
    clearReconnectTimer();
    closeWatcher();
    appStateSub.remove();
  };
}
