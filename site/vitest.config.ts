import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, './src'),
  // `root` points at src for focused discovery, so pin the cache to the real
  // dependency directory instead of letting Vite create src/node_modules.
  cacheDir: path.resolve(__dirname, './node_modules/.vite'),
  // Benchmark artifacts are static test fixtures, not Vitest source. Disabling
  // Vite's public-directory scan keeps the 450 MB /test archive out of test discovery.
  publicDir: false,
  test: {
    include: ['**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
