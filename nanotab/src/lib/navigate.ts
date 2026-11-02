import { normalizeUrl } from './favicon';

/**
 * 打开网址：扩展页里优先用 chrome.tabs.update（最可靠，不受页面卸载影响），
 * 失败再回退到 location.href。
 * tabs.update 不需要额外权限；非扩展环境（直接打开 html）会自动走回退分支。
 */
export function navigate(input: string): void {
  // 用户填的网址可能没写协议，直接赋给 location 会变成相对路径（如 chrome-extension://xx/bilibili.com）
  const url = normalizeUrl(input);
  if (!url) return;

  const fallback = () => {
    try {
      window.location.assign(url);
    } catch {
      window.location.href = url;
    }
  };
  try {
    const p = chrome.tabs?.update({ url });
    if (p && typeof (p as Promise<unknown>).catch === 'function') {
      (p as Promise<unknown>).catch(fallback);
      return;
    }
    fallback();
  } catch {
    fallback();
  }
}
