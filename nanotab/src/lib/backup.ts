import type { AppData } from '../types';
import { exportJson } from './storage';

/** 备份文件名：腾龙起始页-YYYYMMDD.json */
export function backupFileName(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `腾龙起始页-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.json`;
}

/** 把用户给的文件夹名清洗成合法路径段（浏览器不让用 \/:*?"<>| 等） */
function safeDir(dir: string): string {
  const s = (dir || '').trim().replace(/[\\/:*?"<>|]/g, '').replace(/^\.+|\.+$/g, '');
  return s || '腾龙起始页';
}

/**
 * 把整份数据备份到「下载」目录下的子文件夹。
 * 优先用 chrome.downloads.download（直接落盘，不弹框）；无此能力时回退到 a[download]。
 * 返回 true 表示已触发下载。
 */
export async function saveBackup(data: AppData, dir: string): Promise<boolean> {
  const json = exportJson(data);
  const name = backupFileName();
  const sub = safeDir(dir);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    const dl = (chrome as any)?.downloads;
    if (dl?.download) {
      await new Promise<void>((resolve, reject) => {
        dl.download(
          { url, filename: `${sub}/${name}`, saveAs: false },
          () => {
            if ((chrome as any).runtime?.lastError) reject(new Error('downloads 失败'));
            else resolve();
          },
        );
      });
      return true;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    return true;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
}

/** 周期（月）→ 毫秒；用 30 天近似一个月 */
export function backupSpanMs(every: 'off' | '1' | '3' | '6'): number {
  const months = every === '1' ? 1 : every === '3' ? 3 : every === '6' ? 6 : 0;
  return months * 30 * 864e5;
}
