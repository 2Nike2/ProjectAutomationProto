import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist', // これがフロントエンドのビルド先
    emptyOutDir: true,
  },
  server: {
    port: 3000 // フロントエンド用のポート。FastAPIとは別にする。
  }
})
