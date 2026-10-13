import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['js/tests/**/*.test.js'],
    globals: true,
    setupFiles: ['js/tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['js/**/*.js'],
      exclude: ['js/tests/**', 'js/demo-data.js', '**/node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'js'),
    },
  },
});
