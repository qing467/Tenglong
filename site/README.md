# 腾龙起始页 · 官网

扩展的介绍页，纯静态（HTML + CSS + 原生 JS），无构建步骤、无外部依赖，可以直接托管在任何静态服务器上。

## 目录

```
site/
├─ index.html          单页站点
├─ assets/
│  ├─ style.css        样式（token 与扩展保持一致）
│  ├─ app.js           时钟、标签切换、入场动画、复制
│  ├─ icon*.png        扩展图标（tools/make_icons.py 生成）
│  ├─ mountain.jpg     内置壁纸「晨雾山脊」（首屏与预览区）
│  └─ lake.jpg         内置壁纸「静湖暮色」（预览区）
└─ README.md
```

## 部署到 GitHub Pages

### 方式一：GitHub Actions（仓库已内置）

仓库根目录的 `.github/workflows/pages.yml` 会在 `site/` 目录有改动并推送到 `main` 时自动发布。

1. 推送代码到 GitHub 的 `main` 分支
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**
3. 等待 Actions 跑完，访问 `https://<用户名>.github.io/<仓库名>/`

### 方式二：从分支目录发布

如果不想用 Actions：

1. 把 `site/` 重命名为 `docs/`（Pages 只支持根目录或 `docs/`）
2. **Settings → Pages → Source** 选择 **Deploy from a branch**
3. 分支选 `main`，目录选 `/docs`，保存

### 方式三：本地预览

```bash
cd site
python -m http.server 5173
# 浏览器打开 http://localhost:5173
```

## 本地改版提示

- 所有路径都是相对路径（`assets/...`），部署在子目录（如 `/nanotab/`）下也不会 404。
- 颜色、圆角、模糊等视觉参数集中在 `assets/style.css` 顶部的 `:root`，与扩展 `src/styles/global.css` 的 token 一一对应。
- 预览区的四个状态是在 `index.html` 里用真实 DOM 复刻的，改样式会同步反映到展示效果。
- 没有引入任何 CDN 字体或图标库，断网也能完整显示。

## 素材来源

本站不包含任何取自第三方的图片或图形资源：

| 素材 | 来源 |
| --- | --- |
| `mountain.jpg`、`lake.jpg` | 依据本项目需求生成的原创图片，可随项目一同分发 |
| `icon*.png` | `tools/make_icons.py` 程序化绘制（圆角渐变底 + 白色 N），无外部图形 |
| 预览区里的站点图标 | `nanotab/src/lib/sites.ts` 中手绘的 SVG 简笔图形，仅用作品牌色示意，非官方 logo |

页面文案、样式与交互逻辑均为本项目自行编写。
