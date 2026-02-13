import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('package.json distribution configuration', () => {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, 'package.json'), 'utf-8')
  );

  it('should have no runtime dependencies since the CLI is bundled', () => {
    // dist/llpm.js is a self-contained bundle built by `bun build`.
    // Listing dependencies causes `bun install -g` to install them
    // unnecessarily, which can fail and wastes time/disk.
    expect(pkg.dependencies).toBeUndefined();
  });

  it('should have no peerDependencies for a bundled CLI tool', () => {
    // TypeScript is a build-time dependency only; requiring it as a
    // peer dependency of a pre-built CLI makes no sense and causes
    // "incorrect peer dependency" warnings on install.
    expect(pkg.peerDependencies).toBeUndefined();
  });

  it('should include dist/llpm.js in published files', () => {
    expect(pkg.files).toContain('dist/llpm.js');
  });

  it('should include bin/llpm.cjs in published files', () => {
    expect(pkg.files).toContain('bin/llpm.cjs');
  });

  it('should have build dependencies in devDependencies', () => {
    // Core build-time deps that produce the bundle
    expect(pkg.devDependencies).toHaveProperty('react');
    expect(pkg.devDependencies).toHaveProperty('ink');
    expect(pkg.devDependencies).toHaveProperty('ai');
    expect(pkg.devDependencies).toHaveProperty('zod');
  });
});
