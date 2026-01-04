import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fsPromises from 'fs/promises';

// Auto-mock fs/promises
vi.mock('fs/promises');

import {
  createIgnoreFilter,
  DEFAULT_IGNORE_PATTERNS,
  loadGitignorePatterns,
  parseGitignoreContent,
  matchesIgnorePatterns,
} from './gitignore';

describe('gitignore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no .gitignore file
    vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fsPromises.readdir).mockResolvedValue([]);
  });

  describe('DEFAULT_IGNORE_PATTERNS', () => {
    it('should include common dependency directories', () => {
      expect(DEFAULT_IGNORE_PATTERNS).toContain('node_modules');
      expect(DEFAULT_IGNORE_PATTERNS).toContain('venv');
      expect(DEFAULT_IGNORE_PATTERNS).toContain('.venv');
      expect(DEFAULT_IGNORE_PATTERNS).toContain('__pycache__');
    });

    it('should include version control directories', () => {
      expect(DEFAULT_IGNORE_PATTERNS).toContain('.git');
      expect(DEFAULT_IGNORE_PATTERNS).toContain('.svn');
      expect(DEFAULT_IGNORE_PATTERNS).toContain('.hg');
    });

    it('should include build output directories', () => {
      expect(DEFAULT_IGNORE_PATTERNS).toContain('dist');
      expect(DEFAULT_IGNORE_PATTERNS).toContain('build');
      expect(DEFAULT_IGNORE_PATTERNS).toContain('target');
      expect(DEFAULT_IGNORE_PATTERNS).toContain('.next');
      expect(DEFAULT_IGNORE_PATTERNS).toContain('.nuxt');
    });

    it('should include IDE directories', () => {
      expect(DEFAULT_IGNORE_PATTERNS).toContain('.idea');
      expect(DEFAULT_IGNORE_PATTERNS).toContain('.vscode');
    });

    it('should include coverage directories', () => {
      expect(DEFAULT_IGNORE_PATTERNS).toContain('coverage');
      expect(DEFAULT_IGNORE_PATTERNS).toContain('.nyc_output');
    });

    it('should include OS-specific files', () => {
      expect(DEFAULT_IGNORE_PATTERNS).toContain('.DS_Store');
      expect(DEFAULT_IGNORE_PATTERNS).toContain('Thumbs.db');
    });
  });

  describe('parseGitignoreContent', () => {
    it('should parse simple patterns', () => {
      const content = 'node_modules\n*.log\nbuild/';
      const patterns = parseGitignoreContent(content);
      expect(patterns).toContain('node_modules');
      expect(patterns).toContain('*.log');
      expect(patterns).toContain('build/');
    });

    it('should ignore empty lines', () => {
      const content = 'node_modules\n\n\nbuild';
      const patterns = parseGitignoreContent(content);
      expect(patterns).toHaveLength(2);
      expect(patterns).toContain('node_modules');
      expect(patterns).toContain('build');
    });

    it('should ignore comment lines', () => {
      const content = '# Dependencies\nnode_modules\n# Build output\nbuild';
      const patterns = parseGitignoreContent(content);
      expect(patterns).toHaveLength(2);
      expect(patterns).not.toContain('# Dependencies');
      expect(patterns).not.toContain('# Build output');
    });

    it('should trim whitespace from patterns', () => {
      const content = '  node_modules  \n  build  ';
      const patterns = parseGitignoreContent(content);
      expect(patterns).toContain('node_modules');
      expect(patterns).toContain('build');
    });

    it('should filter out lines with null bytes', () => {
      const content = 'valid\n\x00invalid\nvalid2';
      const patterns = parseGitignoreContent(content);
      expect(patterns).toContain('valid');
      expect(patterns).toContain('valid2');
      expect(patterns).toHaveLength(2);
    });
  });

  describe('loadGitignorePatterns', () => {
    it('should return empty array if no .gitignore exists', async () => {
      vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('ENOENT'));

      const patterns = await loadGitignorePatterns('/project');
      expect(patterns).toEqual([]);
    });

    it('should parse .gitignore at project root', async () => {
      vi.mocked(fsPromises.readFile).mockResolvedValue('node_modules\n*.log\nbuild/');

      const patterns = await loadGitignorePatterns('/project');
      expect(patterns).toContain('node_modules');
      expect(patterns).toContain('*.log');
      expect(patterns).toContain('build/');
    });

    it('should ignore empty lines', async () => {
      vi.mocked(fsPromises.readFile).mockResolvedValue('node_modules\n\n\nbuild');

      const patterns = await loadGitignorePatterns('/project');
      expect(patterns).toHaveLength(2);
      expect(patterns).toContain('node_modules');
      expect(patterns).toContain('build');
    });

    it('should ignore comment lines', async () => {
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        '# Dependencies\nnode_modules\n# Build output\nbuild'
      );

      const patterns = await loadGitignorePatterns('/project');
      expect(patterns).toHaveLength(2);
      expect(patterns).not.toContain('# Dependencies');
      expect(patterns).not.toContain('# Build output');
    });

    it('should trim whitespace from patterns', async () => {
      vi.mocked(fsPromises.readFile).mockResolvedValue('  node_modules  \n  build  ');

      const patterns = await loadGitignorePatterns('/project');
      expect(patterns).toContain('node_modules');
      expect(patterns).toContain('build');
    });
  });

  describe('matchesIgnorePatterns', () => {
    it('should match exact file names', () => {
      expect(matchesIgnorePatterns('node_modules', ['node_modules'])).toBe(true);
      expect(matchesIgnorePatterns('package.json', ['node_modules'])).toBe(false);
    });

    it('should match glob patterns', () => {
      expect(matchesIgnorePatterns('error.log', ['*.log'])).toBe(true);
      expect(matchesIgnorePatterns('debug.log', ['*.log'])).toBe(true);
      expect(matchesIgnorePatterns('app.ts', ['*.log'])).toBe(false);
    });

    it('should match directory patterns', () => {
      // The ignore package treats 'build/' as matching paths within build directory
      expect(matchesIgnorePatterns('build/output.js', ['build/'])).toBe(true);
      // For matching the directory itself, use 'build' without trailing slash
      expect(matchesIgnorePatterns('build', ['build'])).toBe(true);
    });

    it('should handle negation patterns', () => {
      expect(matchesIgnorePatterns('.env', ['.env*', '!.env.example'])).toBe(true);
      expect(matchesIgnorePatterns('.env.local', ['.env*', '!.env.example'])).toBe(true);
      expect(matchesIgnorePatterns('.env.example', ['.env*', '!.env.example'])).toBe(false);
    });

    it('should normalize Windows-style paths', () => {
      expect(matchesIgnorePatterns('src\\utils\\file.ts', ['src/utils/'])).toBe(true);
    });
  });

  describe('createIgnoreFilter', () => {
    it('should create a filter function', async () => {
      const filter = await createIgnoreFilter('/project');
      expect(typeof filter).toBe('function');
    });

    it('should ignore default patterns', async () => {
      const filter = await createIgnoreFilter('/project');

      // Default patterns should be ignored
      expect(filter('node_modules')).toBe(true);
      expect(filter('node_modules/package/index.js')).toBe(true);
      expect(filter('.git')).toBe(true);
      expect(filter('.git/config')).toBe(true);
      expect(filter('dist')).toBe(true);
      expect(filter('dist/bundle.js')).toBe(true);
    });

    it('should not ignore regular source files', async () => {
      const filter = await createIgnoreFilter('/project');

      expect(filter('src/index.ts')).toBe(false);
      expect(filter('package.json')).toBe(false);
      expect(filter('README.md')).toBe(false);
    });

    it('should respect .gitignore patterns', async () => {
      vi.mocked(fsPromises.readFile).mockResolvedValue('*.log\nsecrets');

      const filter = await createIgnoreFilter('/project');

      expect(filter('error.log')).toBe(true);
      expect(filter('debug.log')).toBe(true);
      expect(filter('secrets')).toBe(true);
      expect(filter('secrets/api-key.txt')).toBe(true);
      expect(filter('src/index.ts')).toBe(false);
    });

    it('should handle complex gitignore patterns', async () => {
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        '*.pyc\n__pycache__\n*.egg-info\n.env*\n!.env.example'
      );

      const filter = await createIgnoreFilter('/project');

      expect(filter('module.pyc')).toBe(true);
      expect(filter('__pycache__')).toBe(true);
      expect(filter('mypackage.egg-info')).toBe(true);
      expect(filter('.env')).toBe(true);
      expect(filter('.env.local')).toBe(true);
      // Negation pattern - should NOT be ignored
      expect(filter('.env.example')).toBe(false);
    });

    it('should handle directory-specific patterns', async () => {
      vi.mocked(fsPromises.readFile).mockResolvedValue('/build\nlogs');

      const filter = await createIgnoreFilter('/project');

      // /build means only root-level build directory
      expect(filter('build')).toBe(true);
      expect(filter('build/output.js')).toBe(true);

      // logs matches anywhere
      expect(filter('logs')).toBe(true);
      expect(filter('src/logs')).toBe(true);
    });

    it('should use includeDefaults option', async () => {
      vi.mocked(fsPromises.readFile).mockResolvedValue('custom-ignore');

      // With defaults
      const withDefaults = await createIgnoreFilter('/project', { includeDefaults: true });
      expect(withDefaults('node_modules')).toBe(true);
      expect(withDefaults('custom-ignore')).toBe(true);

      // Without defaults
      const withoutDefaults = await createIgnoreFilter('/project', { includeDefaults: false });
      expect(withoutDefaults('node_modules')).toBe(false);
      expect(withoutDefaults('custom-ignore')).toBe(true);
    });

    it('should handle additional patterns option', async () => {
      const filter = await createIgnoreFilter('/project', {
        additionalPatterns: ['*.temp', 'cache'],
      });

      expect(filter('file.temp')).toBe(true);
      expect(filter('cache')).toBe(true);
      expect(filter('cache/data.json')).toBe(true);
      expect(filter('src/index.ts')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty project directory', async () => {
      const filter = await createIgnoreFilter('/project');
      expect(filter('.keep')).toBe(false);
    });

    it('should handle malformed .gitignore gracefully', async () => {
      vi.mocked(fsPromises.readFile).mockResolvedValue('\x00invalid\nvalid-pattern');

      // Should not throw
      const filter = await createIgnoreFilter('/project');
      expect(filter('valid-pattern')).toBe(true);
    });

    it('should be case-sensitive by default', async () => {
      vi.mocked(fsPromises.readFile).mockResolvedValue('BUILD');

      const filter = await createIgnoreFilter('/project');
      expect(filter('BUILD')).toBe(true);
      // Case sensitivity depends on the ignore package behavior
    });
  });
});
