import type { Engine } from './lib/engines';

/** 主题：light = 跟随壁纸；dark = 主动开启的黑暗模式 */
export type Theme = 'light' | 'dark';

/** 历史自动清除周期 */
export type ClearSpan = 'never' | 'day' | 'week' | 'month';

/** 壁纸：preset = 内置渐变类名；url / local = 自定义图片（base64 或 http） */
export interface Wallpaper {
  type: 'preset' | 'url' | 'local';
  /** preset 时为 CSS 类名；url / local 时为图片地址或 dataURL */
  value: string;
  /** 自定义图片取样出的亮度：true 表示浅色图（文字需转深色） */
  light?: boolean;
}

/** 捷径坞里的一项 */
export interface DockItem {
  /** 稳定唯一 id（不用数组下标，避免删除/排序后引用错乱） */
  id: string;
  /** 显示名称 */
  n: string;
  /** 网址 */
  u: string;
  /** favicon 地址；内置精美图标不填 */
  icon?: string;
  /** 内置图标序号（用于还原手工图标与品牌底色） */
  b?: number;
  /** 有此字段即为「收纳夹」：里面是收进去的站点（收纳夹只出现在捷径坞根层，不嵌套） */
  items?: DockItem[];
}

export interface Settings {
  theme: Theme;
  /** 24 小时制 */
  h24: boolean;
  /** 显示秒钟 */
  sec: boolean;
  clear: ClearSpan;
  /** 上次清除历史的时间戳 */
  clearLast: number;
  /** 当前搜索引擎 id */
  engine: string;
  /** 搜索引擎列表（可在设置里增删改排序，默认 = 内置 6 个） */
  engines: Engine[];
  wallpaper: Wallpaper;
  /** 自动备份频率：关闭 / 1 / 3 / 6 个月 */
  backupEvery: 'off' | '1' | '3' | '6';
  /** 备份存放于「下载」目录下的子文件夹名 */
  backupDir: string;
  /** 上次自动或手动备份的时间戳 */
  backupLast: number;
}

export interface AppData {
  v: 1;
  settings: Settings;
  dock: DockItem[];
  history: string[];
  /** 内置站点版本：升级后自动补上新增的内置站点，且只补一次 */
  dockRev: number;
}

/* ---------- 内置站点（M4 捷径坞使用，先定义好数据结构） ---------- */
export interface BuiltinSite {
  n: string;
  u: string;
  /** 品牌底色 */
  bg: string;
  /** 手工 SVG 图标（字符串形式内联） */
  svg: string;
}
