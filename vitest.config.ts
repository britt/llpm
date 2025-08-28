import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000, // 30 second global timeout for all tests
    hookTimeout: 30000, // 30 second timeout for hooks (beforeEach, afterEach, etc.)
    // Exclude performance tests in CI environments
    exclude: process.env.CI === 'true' 
      ? ['**/*.performance.test.*', '**/node_modules/**', '**/*.d.ts']
      : ['**/node_modules/**', '**/*.d.ts'],
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
          lines: 30,
          statements: 30
        },
        // Per-file thresholds for critical modules that have tests
        'src/commands/clear.ts': {
          branches: 95,
          functions: 100,
          lines: 100,
          statements: 100
        },
        'src/commands/debug.ts': {
          branches: 90,
          functions: 100,
          lines: 100,
          statements: 100
        },
        'src/commands/help.ts': {
          branches: 95,
          functions: 100,
          lines: 100,
          statements: 100
        },
        'src/utils/systemPrompt.ts': {
          branches: 90,
          functions: 100,
          lines: 94,
          statements: 94
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