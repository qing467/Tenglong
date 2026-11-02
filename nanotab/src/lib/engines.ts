/** 内置搜索引擎表（{q} 为查询占位符） */
export interface Engine {
  id: string;
  n: string;
  /** 徽标文字 */
  l: string;
  /** 品牌色 */
  c: string;
  /** 搜索地址模板 */
  url: string;
}

export const ENGINES: Engine[] = [
  { id: 'baidu', n: '百度', l: '百', c: '#2932E1', url: 'https://www.baidu.com/s?wd={q}' },
  { id: 'bing', n: '必应', l: 'B', c: '#1a73e8', url: 'https://www.bing.com/search?q={q}' },
  { id: 'google', n: '谷歌', l: 'G', c: '#EA4335', url: 'https://www.google.com/search?q={q}' },
  { id: 'yandex', n: 'Yandex', l: 'Y', c: '#FC3F1D', url: 'https://yandex.com/search/?text={q}' },
  { id: 'sogou', n: '搜狗搜索', l: 'S', c: '#F86600', url: 'https://www.sogou.com/web?query={q}' },
  { id: '360', n: '360 搜索', l: '360', c: '#19B955', url: 'https://www.so.com/s?q={q}' },
];

/** 新用户的默认引擎列表（内置表的副本，之后用户可增删排序） */
export function defaultEngines(): Engine[] {
  return ENGINES.map((e) => ({ ...e }));
}

/** 在用户列表里找引擎：找不到用第一个，列表为空则退回内置必应 */
export function engineIn(list: Engine[], id: string): Engine {
  return list.find((e) => e.id === id) ?? list[0] ?? ENGINES[1];
}

/** 引擎列表兜底：坏数据至少保留一个能用的引擎 */
export function normalizeEngines(list: unknown): Engine[] {
  if (!Array.isArray(list)) return defaultEngines();
  const ok = list.filter(
    (e): e is Engine =>
      !!e && typeof e.id === 'string' && typeof e.n === 'string' && typeof e.url === 'string' && e.url.includes('{q}'),
  );
  return ok.length ? ok : defaultEngines();
}

/** 判断输入是否是网址（支持 example.com / www.a.cn / http(s):// / 带端口与路径） */
export function isUrl(s: string): boolean {
  if (/\s/.test(s)) return false;
  if (/^https?:\/\//i.test(s)) return true;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(s);
}

/** 生成跳转地址：网址直开，否则走当前引擎 */
export function buildTarget(input: string, engine: Engine): string {
  const q = input.trim();
  if (isUrl(q)) return /^https?:\/\//i.test(q) ? q : 'https://' + q;
  return engine.url.replace('{q}', encodeURIComponent(q));
}
