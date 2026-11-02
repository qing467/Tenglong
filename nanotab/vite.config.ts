import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 关键：关闭文件名 hash。manifest.json 里写死 newtab.js / popup.js / background.js，
// 若输出带 hash（newtab-a3f2.js）扩展将加载失败。
export default defineConfig({
  // 关键：资源用相对路径。扩展运行在 chrome-extension://<id>/ 下，
  // 绝对路径 '/newtab.js' 在部分场景会解析失败，'.' 更稳。
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    emptyOutDir: true,
    rollupOptions: {
      // 没有后台逻辑就不声明 service worker：少一个进程，也避免空 chunk 警告
      input: {
        newtab: 'newtab.html',
        popup: 'popup.html',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
