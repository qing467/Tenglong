/**
 * 网址规范化。
 * 用户填的网址常常没写协议，直接赋给 location 会变成相对路径
 * （如 chrome-extension://xx/bilibili.com），所以统一补成 https。
 */
export function normalizeUrl(u: string): string {
  const s = (u || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : 'https://' + s;
}
