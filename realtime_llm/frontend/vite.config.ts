import { defineConfig } from 'vite';

export default defineConfig({
  root: './', // ルートを指定（特に変更しなければこのままでOK）
  build: {
    outDir: 'dist', // ビルドファイルの出力先
  },
});
