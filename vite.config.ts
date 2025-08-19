/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    },
    // Ensure DOM globals are available
    environmentOptions: {
      jsdom: {
        resources: 'usable'
      }
    }
  },
  esbuild: {
    target: 'node14'
  }
});
