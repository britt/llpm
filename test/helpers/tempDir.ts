import { randomUUID } from 'crypto';
import { mkdirSync, existsSync, rmSync } from 'fs';

export interface TempDir {
  path: string;
  cleanup: () => void;
}

/**
 * Creates a temporary directory for testing with automatic cleanup.
 *
 * @param prefix - Optional prefix for the directory name (default: 'llpm-test')
 * @returns Object with directory path and cleanup function
 *
 * @example
 * ```typescript
 * const tempDir = createTempDir();
 * writeFileSync(`${tempDir.path}/test.txt`, 'content');
 * // ... test code ...
 * tempDir.cleanup(); // Removes directory and all contents
 * ```
 */
export function createTempDir(prefix = 'llpm-test'): TempDir {
  const path = `/tmp/${prefix}-${randomUUID()}`;

  // Create the directory
  mkdirSync(path, { recursive: true });

  // Create cleanup function
  const cleanup = () => {
    try {
      if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
      }
    } catch (error) {
      // Silently ignore cleanup errors
      // This prevents test failures due to permission issues or race conditions
      console.warn(`Failed to cleanup temp dir ${path}:`, error);
    }
  };

  return { path, cleanup };
}
