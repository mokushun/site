import { defineConfig } from 'vite';

// GitHub Pages の /game/physics-lab/ 配下でも動くよう、相対パスで出力する。
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});
