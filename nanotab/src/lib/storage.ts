import type { AppData, ClearSpan, DockItem } from '../types';
import { BUILTIN_SITES, SITES_REV, defaultDock } from './sites';
import { defaultEngines, normalizeEngines } from './engines';

/** 单一存储 key：整体读写，简单且够用（chrome.storage.local 上限 10MB） */
export const STORAGE_KEY = 'nanotab_data_v1';

export const DEFAULT_DATA: AppData = {
  v: 1,
  settings: {
    theme: 'light',
    h24: true,
    sec: true,
    clear: 'never',
    clearLast: Date.now(),
    engine: 'bing',
    engines: defaultEngines(),
    wallpaper: { type: 'preset', value: 'wp-mountain', light: false },
    backupEvery: 'off',
    backupDir: '腾龙起始页',
    backupLast: 0,
  },
  dock: [],
  history: [],
  dockRev: SITES_REV,
};

/** 捷径坞列表：递归清洗（收纳夹内部也是同一套结构） */
function dockList(raw: unknown): DockItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is DockItem => !!x && typeof x.n === 'string')
    .map((x) => ({
      id: typeof x.id === 'string' && x.id ? x.id : 's' + Math.random().toString(36).slice(2, 10),
      n: x.n,
      // 内置项若网址丢失（旧存档 / 手工改过），按内置序号自愈补齐
      u:
        typeof x.u === 'string' && x.u
          ? x.u
          : typeof x.b === 'number' && BUILTIN_SITES[x.b]
            ? BUILTIN_SITES[x.b].u
            : '',
      icon: typeof x.icon === 'string' ? x.icon : undefined,
      b: typeof x.b === 'number' ? x.b : undefined,
      // 收纳夹：内部站点同样清洗一遍；非数组（坏数据）当普通站点处理
      items: Array.isArray(x.items) ? dockList(x.items) : undefined,
    }));
}

/** 补齐缺失字段：旧存档 / 手工改过的数据也能安全打开 */
function normalize(raw: unknown): AppData {
  const d = (raw ?? {}) as Partial<AppData>;
  const s = (d.settings ?? {}) as Partial<AppData['settings']>;
  const w = (s.wallpaper ?? {}) as Partial<AppData['settings']['wallpaper']>;
  const spans: ClearSpan[] = ['never', 'day', 'week', 'month'];
  const dock = dockList(d.dock);
  // 引擎列表与当前引擎必须对齐：导入的旧存档可能指向已被删除的引擎
  const engines = normalizeEngines(s.engines);
  const engine =
    typeof s.engine === 'string' && engines.some((e) => e.id === s.engine) ? s.engine : engines[0].id;
  return {
    v: 1,
    settings: {
      theme: s.theme === 'dark' ? 'dark' : 'light',
      h24: s.h24 !== false,
      sec: s.sec !== false,
      clear: spans.includes(s.clear as ClearSpan) ? (s.clear as ClearSpan) : 'never',
      clearLast: typeof s.clearLast === 'number' ? s.clearLast : Date.now(),
      engine,
      // 旧存档没有 engines → 补内置 6 个；有但全是坏数据 → 同样回退内置
      engines,
      wallpaper: {
        type: w.type === 'url' || w.type === 'local' ? w.type : 'preset',
        // 旧版预设 id 迁移（壁纸素材换代后，用户原来的选择仍然生效）
        value:
          w.value === 'wp-samurai'
            ? 'wp-mountain'
            : typeof w.value === 'string' && w.value
              ? w.value
              : 'wp-mountain',
        light: !!w.light,
      },
      backupEvery: ['off', '1', '3', '6'].includes(s.backupEvery as string)
        ? (s.backupEvery as AppData['settings']['backupEvery'])
        : 'off',
      backupDir: typeof s.backupDir === 'string' && s.backupDir ? s.backupDir : '腾龙起始页',
      backupLast: typeof s.backupLast === 'number' ? s.backupLast : 0,
    },
    dock,
    history: Array.isArray(d.history) ? d.history.filter((x) => typeof x === 'string').slice(0, 20) : [],
    dockRev: typeof d.dockRev === 'number' ? d.dockRev : 1,
  };
}

export async function loadData(): Promise<AppData> {
  try {
    const got = await chrome.storage.local.get(STORAGE_KEY);
    // 从未存过 → 新用户，铺内置站点；存过（哪怕是空数组）→ 尊重用户删空的结果
    if (got[STORAGE_KEY] === undefined) {
      return normalize({ ...DEFAULT_DATA, dock: defaultDock(), dockRev: SITES_REV });
    }
    const data = normalize(got[STORAGE_KEY]);
    const migrated = migrateSites(data);
    // 迁移结果写回一次，避免每次打开都重算，也让 dockRev 落盘
    if (migrated !== data) void chrome.storage.local.set({ [STORAGE_KEY]: migrated });
    return migrated;
  } catch {
    return normalize({ ...DEFAULT_DATA, dock: defaultDock(), dockRev: SITES_REV });
  }
}

/**
 * 内置站点升级：补齐新增项，放在末尾。
 * 只补一次（写入 dockRev），用户之后主动删掉的不会再被加回来。
 */
function migrateSites(data: AppData): AppData {
  if (data.dockRev >= SITES_REV) return data;
  const have = new Set(data.dock.map((x) => x.b).filter((v): v is number => typeof v === 'number'));
  const add = BUILTIN_SITES.map((s, i) => ({ s, i }))
    .filter(({ i }) => !have.has(i))
    .map(({ s, i }) => ({ id: 'b' + i, n: s.n, u: s.u, icon: '', b: i }));
  return { ...data, dock: add.length ? [...data.dock, ...add] : data.dock, dockRev: SITES_REV };
}

/* ---------- 写入：防抖，避免连续操作重复写盘 ---------- */
let timer: number | null = null;
let pending: AppData | null = null;
/** 写盘彻底失败时的回调（配额满等），由 App 注册成 Toast，避免"改了但没存上"无声无息 */
let onSaveError: (() => void) | null = null;

export function setSaveErrorHandler(fn: (() => void) | null): void {
  onSaveError = fn;
}

export function saveData(data: AppData, debounce = 150): void {
  pending = data;
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    flush();
  }, debounce);
}

/** 立即写入（关闭页面、切换引擎等关键操作用） */
export function flush(): void {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  if (!pending) return;
  const data = pending;
  pending = null;
  chrome.storage.local
    .set({ [STORAGE_KEY]: data })
    .catch(() => {
      // 配额不足：先丢历史再试一次，设置与捷径优先保住
      chrome.storage.local
        .set({ [STORAGE_KEY]: { ...data, history: data.history.slice(0, 5) } })
        .catch(() => onSaveError?.());
    });
}

/** 导出 / 导入备份（M7 完整界面，这里先把数据通道做好） */
export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function parseBackup(text: string): AppData | null {
  try {
    return normalize(JSON.parse(text));
  } catch {
    return null;
  }
}
