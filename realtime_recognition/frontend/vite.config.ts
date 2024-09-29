import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  base: '/static/',
  build: {
      outDir: '../backend/static',
      emptyOutDir: true,
  },
  server: {
      port: 3000
  }
})