import { BUILTIN_SITES } from './sites';

/**
 * 统一的 App 图标视觉：所有站点（内置 + 用户新增）都走同一套
 * 「正方形圆角底 + 品牌色渐变 + 白色字形/图形」，
 * 不再直接铺网站的 16px favicon —— 那种图放大后发糊，是整排图标难看的主因。
 *
 * 新增站点没有品牌资料，就按域名哈希稳定取一组品牌色 + 名称首字，
 * 保证它和已适配的站点长得像同一个图标集，且刷新多少次颜色都不变。
 */

/** 统一叠一层高光（左上亮、右下暗），让纯色底也有 App 图标那种体积感 */
export const SHEEN =
  'linear-gradient(150deg, rgba(255,255,255,.30), rgba(255,255,255,0) 46%, rgba(0,0,0,.12))';

/** 自动适配用的品牌色板（成对渐变，16 组足够让同类站点错开） */
const PALETTE: [string, string][] = [
  ['#FF7A8A', '#EE4056'],
  ['#FF9E5A', '#F0682A'],
  ['#FFC65C', '#EDA02A'],
  ['#94D96C', '#4FA63C'],
  ['#5BD1A5', '#26A47C'],
  ['#5AC8E8', '#2A93C9'],
  ['#6FA9FF', '#3B6FE0'],
  ['#8C8CF5', '#5B4BE0'],
  ['#B78CF5', '#8A4BE0'],
  ['#F58CD0', '#D648A4'],
  ['#B0A69C', '#7C7168'],
  ['#8C97A8', '#5C6675'],
  ['#6FBF8F', '#3E8E63'],
  ['#E2695E', '#B23A31'],
  ['#5FA8A0', '#357870'],
  ['#7E8CE0', '#4A5AB8'],
];

/** FNV-1a：同一域名永远得到同一个下标 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hostOf(url: string): string {
  try {
    return new URL(/^[a-z]+:\/\//i.test(url) ? url : 'https://' + url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^[a-z]+:\/\//i, '').split('/')[0].replace(/^www\./, '');
  }
}

/** 图标里的字：中文取第一个汉字，英文取第一个字母大写，都没有才退回域名 */
export function glyphOf(name: string, url = ''): string {
  const n = (name || '').trim();
  const zh = n.match(/[\u4e00-\u9fa5]/);
  if (zh) return zh[0];
  const en = n.match(/[A-Za-z0-9]/);
  if (en) return en[0].toUpperCase();
  const he = hostOf(url).match(/[A-Za-z0-9]/);
  return he ? he[0].toUpperCase() : '·';
}

/** 底色是否偏浅（浅底上必须用深色字，否则看不见） */
function isLight(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 255;
  const g = (v >> 8) & 255;
  const b = v & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 176;
}

/**
 * 老数据里存过 `<站点>/favicon.ico` 这种"自动抓的"地址。
 * 它们就是放大后发糊的那类图，渲染时一律忽略，改走 appIconOf 生成的图标；
 * 用户手动填的图标（任意其它地址）依旧尊重。
 */
export function isAutoFavicon(icon: string | undefined, url: string): boolean {
  if (!icon) return false;
  if (!/\/favicon\.(ico|png|svg)$/i.test(icon)) return false;
  const h = hostOf(url);
  return !h || icon.includes(h);
}

export interface AppIcon {
  /** 可直接喂给 style.background 的完整值 */
  bg: string;
  /** 卡片里要显示的字 */
  glyph: string;
  /** 字的颜色 */
  fg: string;
  /** 内置站点的 SVG（有就优先用它，比单字更有辨识度） */
  svg?: string;
}

export function appIconOf(item: { n: string; u: string; b?: number }): AppIcon {
  const built = typeof item.b === 'number' ? BUILTIN_SITES[item.b] : undefined;
  if (built) {
    return {
      bg: `${SHEEN}, ${built.bg}`,
      glyph: glyphOf(item.n, item.u),
      fg: isLight(built.bg) ? '#2b3138' : '#fff',
      svg: built.svg,
    };
  }
  const [from, to] = PALETTE[hash(hostOf(item.u) || item.n) % PALETTE.length];
  return {
    bg: `${SHEEN}, linear-gradient(145deg, ${from}, ${to})`,
    glyph: glyphOf(item.n, item.u),
    fg: '#fff',
  };
}
