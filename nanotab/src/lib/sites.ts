import type { BuiltinSite } from '../types';

/** 手绘文字图标（兜底用：favicon 抓取失败时露出首字） */
export function textSvg(s: string, size = 13, fill = '#4b5563'): string {
  const esc = String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<svg class="logo" viewBox="0 0 24 24"><text x="12" y="16.6" text-anchor="middle" font-size="${size}" font-weight="700" fill="${fill}" font-family="PingFang SC,Microsoft YaHei,Segoe UI,sans-serif">${esc}</text></svg>`;
}

/**
 * 内置站点：手工 SVG 图标（品牌色底 + 图形充满卡片）。
 * 顺序即默认展示顺序；索引写入存档的 `b` 字段，用于还原图标。
 */
export const BUILTIN_SITES: BuiltinSite[] = [
  {
    n: 'bilibili',
    u: 'https://www.bilibili.com',
    bg: '#FB7299',
    svg: `<svg class="logo" viewBox="0 0 40 40"><g fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"><rect x="7" y="12" width="26" height="19" rx="6"/><path d="M13.5 7.5 17.5 12M26.5 7.5 22.5 12"/></g><circle cx="15.5" cy="21.5" r="2" fill="#fff"/><circle cx="24.5" cy="21.5" r="2" fill="#fff"/></svg>`,
  },
  {
    n: 'DeepSeek',
    u: 'https://chat.deepseek.com',
    bg: '#4D6BFE',
    svg: `<svg class="logo" viewBox="0 0 40 40"><circle cx="18.5" cy="22" r="8.5" fill="#fff"/><path d="M26.5 15.5 34 10l-2 9.5z" fill="#fff"/><circle cx="15.5" cy="20" r="1.5" fill="#4D6BFE"/></svg>`,
  },
  {
    n: '豆包',
    u: 'https://www.doubao.com',
    bg: '#FFFFFF',
    svg: `<svg class="logo" viewBox="0 0 40 40"><defs><linearGradient id="db" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6C8CFF"/><stop offset="1" stop-color="#B58CFF"/></linearGradient></defs><circle cx="20" cy="20" r="11.5" fill="url(#db)"/><circle cx="16.2" cy="18" r="1.7" fill="#fff"/><circle cx="23.8" cy="18" r="1.7" fill="#fff"/><path d="M16 24.5c2.6 2.1 5.4 2.1 8 0" stroke="#fff" stroke-width="2.1" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    n: 'ChatGPT',
    u: 'https://chatgpt.com',
    bg: '#0E0E10',
    svg: `<svg class="logo" viewBox="0 0 40 40"><g fill="none" stroke="#fff" stroke-width="2.3" stroke-linejoin="round"><path d="M20 9.5 26.5 13.5v7.5L20 25l-6.5-4v-7.5z"/><path d="M20 17.5 26.5 21.5v7.5L20 33l-6.5-4v-7.5z" opacity=".55"/></g></svg>`,
  },
  {
    n: '飞书文档',
    u: 'https://www.feishu.cn',
    bg: '#3370FF',
    svg: `<svg class="logo" viewBox="0 0 40 40"><path d="M10 27 30 13l-7.5 15-4.6-5.2z" fill="#fff"/><path d="M30 13 17.9 22.8" stroke="#3370FF" stroke-width="1.8"/></svg>`,
  },
  { n: '52pojie', u: 'https://www.52pojie.cn', bg: '#2E4A63', svg: textSvg('52', 14.5) },
  {
    n: '优酷',
    u: 'https://www.youku.com',
    bg: '#1FB4E8',
    svg: `<svg class="logo" viewBox="0 0 40 40"><circle cx="20" cy="20" r="11" fill="none" stroke="#fff" stroke-width="3.2"/><path d="M17 14.5 26 20l-9 5.5z" fill="#fff"/></svg>`,
  },
  { n: '百度贴吧', u: 'https://tieba.baidu.com', bg: '#3385FF', svg: textSvg('贴', 15) },
  {
    n: '腾讯视频',
    u: 'https://v.qq.com',
    bg: '#FF6A00',
    svg: `<svg class="logo" viewBox="0 0 40 40"><path d="M14 11.5 28.5 20 14 28.5z" fill="#fff"/></svg>`,
  },
  {
    n: '爱奇艺',
    u: 'https://www.iqiyi.com',
    bg: '#00BE06',
    svg: `<svg class="logo" viewBox="0 0 40 40"><g fill="#fff"><rect x="10" y="12" width="3.6" height="16" rx="1.4"/><rect x="16.4" y="9" width="3.6" height="22" rx="1.4"/><rect x="22.8" y="12" width="3.6" height="16" rx="1.4"/><circle cx="30" cy="26" r="2"/></g></svg>`,
  },
  {
    n: 'github',
    u: 'https://github.com',
    bg: '#24292F',
    svg: `<svg class="logo" viewBox="0 0 24 24"><path fill="#fff" d="M12 3a9 9 0 0 0-2.86 17.53c.45.08.61-.2.61-.43v-1.6c-2.4.52-2.98-1.05-2.98-1.05-.4-.95-.98-1.2-.98-1.2-.8-.55.06-.54.06-.54.9.06 1.36.92 1.36.92.79 1.35 2.08 1 2.58.76.08-.6.31-.98.56-1.2-2-.23-4.1-1-4.1-4.4 0-1 .34-1.8.9-2.4-.09-.23-.4-1.14.09-2.38 0 0 .74-.24 2.46.91a8.5 8.5 0 0 1 4.48 0c1.72-1.15 2.46-.91 2.46-.91.49 1.24.18 2.15.09 2.38.56.6.9 1.4.9 2.4 0 3.4-2.1 4.17-4.1 4.4.32.28.6.82.6 1.64v2.44c0 .23.16.51.61.43A9 9 0 0 0 12 3z"/></svg>`,
  },
  {
    n: '微博',
    u: 'https://weibo.com',
    bg: '#E6162D',
    svg: `<svg class="logo" viewBox="0 0 40 40"><path d="M9 13l3.6 13.5L20 17l7.4 9.5L31 13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    n: '蓝奏云',
    u: 'https://www.lanzou.com',
    bg: '#4C8BF5',
    svg: `<svg class="logo" viewBox="0 0 40 40"><path d="M13.5 27h13.5a4.8 4.8 0 0 0 .3-9.55 7 7 0 0 0-13.3-1.5A5.1 5.1 0 0 0 13.5 27z" fill="#fff"/></svg>`,
  },
  {
    n: 'quicker',
    u: 'https://quicker.cool',
    bg: '#2E86DE',
    svg: `<svg class="logo" viewBox="0 0 40 40"><path d="M23 8 12.5 23h6L16 32l11-15.5H21z" fill="#fff"/></svg>`,
  },
  {
    n: '微信读书',
    u: 'https://weread.qq.com',
    bg: '#1AAD19',
    svg: `<svg class="logo" viewBox="0 0 40 40"><path d="M20 12.5c2.6-2 5.6-2.6 9-2.6v19.4c-3.4 0-6.4.6-9 2.6-2.6-2-5.6-2.6-9-2.6V9.9c3.4 0 6.4.6 9 2.6z" fill="#fff"/><path d="M20 12.5v19.4" stroke="#1AAD19" stroke-width="1.6"/></svg>`,
  },
  { n: '知乎', u: 'https://www.zhihu.com', bg: '#0084FF', svg: textSvg('知', 15) },
  { n: 'Steam', u: 'https://store.steampowered.com', bg: '#1B2838', svg: textSvg('S', 16) },
  {
    n: 'QQ邮箱',
    u: 'https://mail.qq.com',
    bg: '#FF7A00',
    svg: `<svg class="logo" viewBox="0 0 40 40"><rect x="8" y="13" width="24" height="15" rx="2.6" fill="#fff"/><path d="M9.5 14.5 20 22l10.5-7.5" fill="none" stroke="#FF7A00" stroke-width="2"/></svg>`,
  },
  { n: '豆瓣', u: 'https://www.douban.com', bg: '#00B51D', svg: textSvg('豆', 15) },
  {
    n: '网易云音乐',
    u: 'https://music.163.com',
    bg: '#C20C0C',
    svg: `<svg class="logo" viewBox="0 0 40 40"><circle cx="20" cy="20" r="10" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M24.5 13.5v10.8a3.4 3.4 0 1 1-2.4-3.24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  },
  /* ---- 追加站点：放在末尾，保证已有存档的 b 序号（0~19）不变 ---- */
  {
    n: '江苏省自学考试',
    u: 'https://www.jseea.cn',
    bg: '#2C6DB5',
    svg: textSvg('苏', 14),
  },
  {
    n: '酷家乐',
    u: 'https://www.kujiale.com',
    bg: '#FF6A00',
    svg: textSvg('酷', 14),
  },
  {
    n: 'HP 驱动下载',
    u: 'https://support.hp.com/cn-zh/drivers',
    bg: '#0096D6',
    svg: textSvg('HP', 13),
  },
];

/**
 * 内置站点版本号。**新增内置站点时必须 +1**：
 * 老存档升级后会补齐新增项（仅补一次，用户之后删掉就不会再加回来）。
 * 1 = 最初 20 项；2 = 追加江苏省自学考试 / 酷家乐 / HP 驱动
 */
export const SITES_REV = 2;

/** 新用户默认展示内置全部站点 */
export function defaultDock() {
  return BUILTIN_SITES.map((s, i) => ({ id: 'b' + i, n: s.n, u: s.u, icon: '', b: i }));
}
