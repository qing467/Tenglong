# 腾龙起始页 · NanoTab

一个替换浏览器新标签页的起始页扩展：壁纸、时钟、搜索、捷径坞，**全部逻辑跑在本地**，没有服务器、没有账号、没有埋点，断网照常打开。

官网：<https://qing467.github.io/Tenglong/>

## 特性

- **三态交互**：静默态只留壁纸与胶囊搜索框，交互后展开搜索框与捷径坞
- **搜索**：内置 6 个引擎，可自建、改名、拖拽排序，`Alt + 1~9` 切换，历史记录可自动清理
- **捷径坞**：内置 23 个常用站点，右键编辑、拖拽排序，支持收纳夹分组
- **壁纸**：纯色、内置图片、本地上传（自动压到 2560px）、图片 URL，按平均亮度自动切换浅深色文字
- **数据**：`chrome.storage.local` 单键存储，支持导出 / 导入 JSON 备份，升级自动迁移

## 目录

```
nanotab/   扩展源码（React 19 + Vite，Manifest V3）
site/      官网单页（纯静态，无构建步骤）
docs/      需求、技术选型与 UI 规范
tools/     图标生成脚本
```

## 安装

```bash
cd nanotab
npm install
npm run build          # 产物在 nanotab/dist
```

打开 `chrome://extensions`（Edge 为 `edge://extensions`）→ 开启右上角「开发者模式」→ **加载已解压的扩展程序** → 选择 `nanotab/dist`。

> 本地自签名的 CRX 会被 Chrome 拒绝安装（`CRX_REQUIRED_PROOF_MISSING`），只能用「加载已解压」的方式。

## 官网

`site/` 是零依赖的静态页面，`.github/workflows/pages.yml` 会在 `site/` 变更并推送到 `main` 时自动发布到 GitHub Pages；也可以在仓库 **Settings → Pages → Source** 里选 **GitHub Actions** 后手动触发。

本地预览：`cd site && python -m http.server 5173`。

## 素材来源

| 素材 | 来源 |
| --- | --- |
| `mountain.jpg`、`lake.jpg` | 为本项目生成的原创图片 |
| `icon*.png` | `tools/make_icons.py` 程序化绘制（圆角渐变底 + 白色 N） |
| 内置站点图标 | `nanotab/src/lib/sites.ts` 中手绘的 SVG 简笔图形，仅用作品牌色示意 |

## 许可

未附开源许可证，代码与文档保留所有权利，仅供阅读参考。
