import { useCallback, useEffect, useState } from 'react';
import type { AppData } from '../types';
import { DEFAULT_DATA, STORAGE_KEY, flush, loadData, saveData } from '../lib/storage';

/**
 * 读取整份数据 + 写回。
 * 监听 chrome.storage.onChanged：另一个标签页改了数据，本页自动同步。
 */
export function useAppData() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadData().then((d) => {
      if (!alive) return;
      setData(d);
      setReady(true);
    });

    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !changes[STORAGE_KEY]) return;
      const next = changes[STORAGE_KEY].newValue as AppData | undefined;
      if (next) setData(next);
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, []);

  /** 改数据：接收旧数据，返回新数据（自动写盘 + 广播） */
  const update = useCallback((fn: (prev: AppData) => AppData, immediate = false) => {
    setData((prev) => {
      const next = fn(prev);
      if (next === prev) return prev;
      if (immediate) {
        // 立即写：引擎切换、提交搜索这类"马上要跳走"的操作
        saveData(next, 0);
      } else {
        saveData(next);
      }
      return next;
    });
  }, []);

  /** 只改 settings 的便捷方法 */
  const updateSettings = useCallback(
    (fn: (s: AppData['settings']) => AppData['settings'], immediate = false) => {
      update((prev) => ({ ...prev, settings: fn(prev.settings) }), immediate);
    },
    [update],
  );

  /** 写完再返回 Promise：跳转前必须用它，否则页面已卸载而写入丢失 */
  const setNow = useCallback(async (next: AppData) => {
    setData(next);
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: next });
    } catch {
      /* 写入失败也不阻断跳转 */
    }
  }, []);

  /** 整份替换并立即写盘：导入备份、恢复默认用（不防抖，避免与新数据打架） */
  const replace = useCallback(async (next: AppData) => {
    setData(next);
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: next });
    } catch {
      /* 忽略：界面已经是新数据了 */
    }
  }, []);

  /** 页面卸载前把防抖队列写干净 */
  useEffect(() => {
    const onLeave = () => flush();
    window.addEventListener('pagehide', onLeave);
    return () => window.removeEventListener('pagehide', onLeave);
  }, []);

  return { data, ready, update, updateSettings, setNow, replace };
}
