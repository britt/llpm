import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { createTempDir } from './tempDir';

describe('createTempDir', () => {
  const createdDirs: Array<{ path: string; cleanup: () => void }> = [];

  afterEach(() => {
    // Clean up all created directories
    createdDirs.forEach(dir => {
      try {
        dir.cleanup();
      } catch (error) {
        // Ignore cleanup errors in afterEach
      }
    });
    createdDirs.length = 0;
  });

  it('should create a temporary directory', () => {
    const tempDir = createTempDir();
    createdDirs.push(tempDir);

    expect(existsSync(tempDir.path)).toBe(true);
    expect(tempDir.path).toMatch(/^\/tmp\/llpm-test-/);
  });

  it('should create directory with custom prefix', () => {
    const tempDir = createTempDir('custom-prefix');
    createdDirs.push(tempDir);

    expect(existsSync(tempDir.path)).toBe(true);
    expect(tempDir.path).toMatch(/^\/tmp\/custom-prefix-/);
  });

  it('should create unique directories on multiple calls', () => {
    const dir1 = createTempDir();
    const dir2 = createTempDir();
    createdDirs.push(dir1, dir2);

    expect(dir1.path).not.toBe(dir2.path);
    expect(existsSync(dir1.path)).toBe(true);
    expect(existsSync(dir2.path)).toBe(true);
  });

  it('should cleanup directory and its contents', () => {
    const tempDir = createTempDir();

    // Create a file in the temp directory
    const testFile = `${tempDir.path}/test.txt`;
    writeFileSync(testFile, 'test content');

    expect(existsSync(testFile)).toBe(true);

    // Cleanup
    tempDir.cleanup();

    expect(existsSync(tempDir.path)).toBe(false);
  });

  it('should cleanup nested directories', () => {
    const tempDir = createTempDir();

    // Create nested structure
    const nestedDir = `${tempDir.path}/nested/deep`;
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(`${nestedDir}/file.txt`, 'content');

    expect(existsSync(`${nestedDir}/file.txt`)).toBe(true);

    // Cleanup
    tempDir.cleanup();

    expect(existsSync(tempDir.path)).toBe(false);
  });

  it('should not throw if cleanup called multiple times', () => {
    const tempDir = createTempDir();
    createdDirs.push(tempDir);

    expect(() => {
      tempDir.cleanup();
      tempDir.cleanup();
      tempDir.cleanup();
    }).not.toThrow();
  });

  it('should not throw if directory already deleted', () => {
    const tempDir = createTempDir();

    // Manually delete the directory
    tempDir.cleanup();

    // Try to cleanup again
    expect(() => tempDir.cleanup()).not.toThrow();
  });
});
