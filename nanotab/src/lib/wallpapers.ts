/** 预设壁纸：无 src 的走 CSS 类（.wp-*），有 src 的用内置图片；light 表示浅色底 */
export const PRESETS: { id: string; n: string; light: boolean; src?: string }[] = [
  { id: 'wp-black', n: '纯黑', light: false },
  { id: 'wp-white', n: '纯白', light: true },
  { id: 'wp-mountain', n: '晨雾山脊', light: false, src: 'wallpapers/mountain.jpg' },
  { id: 'wp-lake', n: '静湖暮色', light: false, src: 'wallpapers/lake.jpg' },
];

export function presetById(id: string) {
  return PRESETS.find((p) => p.id === id);
}

/** 预设壁纸是否浅色：只有纯白需要把文字反成深色 */
export function isPresetLight(id: string): boolean {
  return !!presetById(id)?.light;
}

/**
 * 采样图片平均亮度，判断是否为浅色图（浅色 → 时钟/搜索框改用深色字）。
 * 跨域图片画到 canvas 会污染、读像素抛错，这里一律兜底为「深色底」。
 */
export function autoLight(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 8;
        c.height = 8;
        const g = c.getContext('2d');
        if (!g) return resolve(false);
        g.drawImage(img, 0, 0, 8, 8);
        const d = g.getImageData(0, 0, 8, 8).data;
        let sum = 0;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          sum += (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
          n++;
        }
        resolve(n > 0 && sum / n > 170);
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/* ---------------- 本地图片：压缩后入库 ----------------
 * 手机拍的照片动辄 5~10MB，直接转 dataURL 会：
 *   1) 撑爆 chrome.storage.local 的写入上限 → set 抛错 → 壁纸静默丢失（刷新回退）
 *   2) 让整份数据的每次防抖写入都变得很慢
 * 所以统一先缩到最长边 2560 + JPEG，压不进目标体积再降质量 / 继续缩边。
 */
const MAX_EDGE = 2560;
const MIN_EDGE = 720;
const TARGET_CHARS = 1.1 * 1024 * 1024; // dataURL 字符数上限（约 800KB 原图）

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片解码失败'));
    img.src = src;
  });
}

function paint(img: HTMLImageElement, edge: number): HTMLCanvasElement {
  const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('浏览器不支持图片处理');
  // 先铺底色：带透明的 PNG 转 JPEG 不会变成黑块
  g.fillStyle = '#0e1420';
  g.fillRect(0, 0, w, h);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, w, h);
  return c;
}

/**
 * 把用户选的图片压成可直接存盘的 dataURL（JPEG）。
 * 输出一般 200~800KB，稳定落在 storage 配额内。
 */
export async function compressImage(f: File): Promise<string> {
  if (!/^image\//.test(f.type)) throw new Error('不是图片文件');
  const url = URL.createObjectURL(f);
  try {
    const img = await loadImage(url);
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('图片无法识别');
    let edge = MAX_EDGE;
    let quality = 0.86;
    let out = '';
    for (let i = 0; i < 14; i++) {
      out = paint(img, edge).toDataURL('image/jpeg', quality);
      if (out.length <= TARGET_CHARS) return out;
      if (quality > 0.6) quality = Math.round((quality - 0.08) * 100) / 100;
      else edge = Math.round(edge * 0.82);
      if (edge < MIN_EDGE) break;
    }
    if (out.length > TARGET_CHARS) throw new Error('图片过大');
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
