import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'process.env.CI': JSON.stringify(process.env.CI),
    'process.env.NODE_ENV': JSON.stringify('test')
  },
  resolve: {
    alias: {
      'bun:sqlite': new URL('./test/mocks/bun-sqlite.js', import.meta.url).pathname
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    // Shorter timeouts in CI to prevent hanging
    testTimeout: process.env.CI === 'true' ? 15000 : 30000, // 15s in CI, 30s locally
    hookTimeout: process.env.CI === 'true' ? 10000 : 30000, // 10s in CI, 30s locally
    // Exclude performance tests, node modules, worktrees, and docker subdirectories
    exclude: [
      '**/node_modules/**',
      '**/*.d.ts',
      '**/*.performance.test.*',
      'docker/**/*.test.*',
      '.worktrees/**',
      // Exclude ink-testing-library tests in CI due to yoga-layout WASM issues
      ...(process.env.CI === 'true' ? ['**/ModelSelector.test.tsx'] : []),
    ],
    // Force tests to run in single thread in CI to avoid resource contention
    // threads: process.env.CI === 'true' ? false : true,
    // Add pool options for CI stability
    pool: process.env.CI === 'true' ? 'forks' : 'threads',
    poolOptions: process.env.CI === 'true' ? {
      forks: {
        singleFork: true,
      }
    } : undefined,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: 'coverage',
      exclude: [
        // Configuration files
        'vitest.config.ts',
        'test/setup.ts',
        '**/*.config.{js,ts}',
        
        // Build and output directories
        'dist/**',
        'build/**',
        'coverage/**',
        
        // Test files themselves
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        
        // Node modules
        'node_modules/**',
        
        // Specific files to exclude
        'scripts/**',
        'bin/**',
        
        // Type definition files
        '**/*.d.ts'
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 30,
          lines: 25,
          statements: 25
        },
        // Per-file thresholds for critical modules that have tests
        'src/commands/clear.ts': {
          branches: 70,
          functions: 100,
          lines: 80,
          statements: 80
        },
        'src/commands/debug.ts': {
          branches: 85,
          functions: 100,
          lines: 85,
          statements: 85
        },
        'src/commands/help.ts': {
          branches: 50,
          functions: 100,
          lines: 85,
          statements: 85
        },
        'src/utils/systemPrompt.ts': {
          branches: 88,
          functions: 20,
          lines: 17,
          statements: 17
        }
      },
      // Additional coverage options
      skipFull: false,
      all: true,
      // Include source files for coverage even if not tested
      include: ['src/**/*.{js,ts,jsx,tsx}']
    }
  }
});