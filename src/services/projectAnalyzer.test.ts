import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import type { Stats, Dirent } from 'fs';

// Auto-mock fs modules
vi.mock('fs/promises');
vi.mock('fs');

import {
  scanFiles,
  detectLanguage,
  detectLanguages,
  detectFrameworks,
  inferProjectType,
  identifyKeyFiles,
  analyzeDirectoryStructure,
  detectEntryPoints,
  LANGUAGE_EXTENSIONS,
  FRAMEWORK_INDICATORS,
} from './projectAnalyzer';

describe('projectAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  describe('LANGUAGE_EXTENSIONS', () => {
    it('should map common file extensions to languages', () => {
      expect(LANGUAGE_EXTENSIONS['.ts']).toBe('TypeScript');
      expect(LANGUAGE_EXTENSIONS['.tsx']).toBe('TypeScript');
      expect(LANGUAGE_EXTENSIONS['.js']).toBe('JavaScript');
      expect(LANGUAGE_EXTENSIONS['.py']).toBe('Python');
      expect(LANGUAGE_EXTENSIONS['.rs']).toBe('Rust');
      expect(LANGUAGE_EXTENSIONS['.go']).toBe('Go');
      expect(LANGUAGE_EXTENSIONS['.java']).toBe('Java');
    });
  });

  describe('FRAMEWORK_INDICATORS', () => {
    it('should have indicators for common frameworks', () => {
      expect(FRAMEWORK_INDICATORS).toHaveProperty('React');
      expect(FRAMEWORK_INDICATORS).toHaveProperty('Node.js');
      expect(FRAMEWORK_INDICATORS).toHaveProperty('Express');
      expect(FRAMEWORK_INDICATORS).toHaveProperty('FastAPI');
    });
  });

  describe('detectLanguage', () => {
    it('should detect TypeScript from .ts extension', () => {
      expect(detectLanguage('file.ts')).toBe('TypeScript');
      expect(detectLanguage('file.tsx')).toBe('TypeScript');
    });

    it('should detect JavaScript from .js extension', () => {
      expect(detectLanguage('file.js')).toBe('JavaScript');
      expect(detectLanguage('file.jsx')).toBe('JavaScript');
      expect(detectLanguage('file.mjs')).toBe('JavaScript');
    });

    it('should detect Python from .py extension', () => {
      expect(detectLanguage('file.py')).toBe('Python');
    });

    it('should detect other languages', () => {
      expect(detectLanguage('file.rs')).toBe('Rust');
      expect(detectLanguage('file.go')).toBe('Go');
      expect(detectLanguage('file.java')).toBe('Java');
      expect(detectLanguage('file.rb')).toBe('Ruby');
      expect(detectLanguage('file.php')).toBe('PHP');
    });

    it('should return null for unknown extensions', () => {
      expect(detectLanguage('file.xyz')).toBeNull();
      expect(detectLanguage('Makefile')).toBeNull();
    });
  });

  describe('detectLanguages', () => {
    it('should detect primary languages from file list', () => {
      const files = [
        { path: 'src/index.ts', extension: '.ts', lines: 100 },
        { path: 'src/utils.ts', extension: '.ts', lines: 200 },
        { path: 'src/app.tsx', extension: '.tsx', lines: 150 },
        { path: 'src/helper.js', extension: '.js', lines: 50 },
      ];

      const languages = detectLanguages(files as any);
      expect(languages[0]).toBe('TypeScript');
      expect(languages).toContain('JavaScript');
    });

    it('should order languages by line count', () => {
      const files = [
        { path: 'main.py', extension: '.py', lines: 500 },
        { path: 'lib.ts', extension: '.ts', lines: 100 },
        { path: 'helper.js', extension: '.js', lines: 50 },
      ];

      const languages = detectLanguages(files as any);
      expect(languages[0]).toBe('Python');
      expect(languages[1]).toBe('TypeScript');
    });

    it('should return empty array for no source files', () => {
      const files = [
        { path: 'README.md', extension: '.md', lines: 100 },
        { path: 'config.json', extension: '.json', lines: 50 },
      ];

      const languages = detectLanguages(files as any);
      expect(languages).toEqual([]);
    });
  });

  describe('detectFrameworks', () => {
    it('should detect React from dependencies', () => {
      const files = [{ path: 'package.json', extension: '.json' }];
      const packageJson = { dependencies: { react: '^18.0.0' } };

      const frameworks = detectFrameworks(files as any, packageJson);
      expect(frameworks).toContain('React');
    });

    it('should detect Express from dependencies', () => {
      const files = [{ path: 'package.json', extension: '.json' }];
      const packageJson = { dependencies: { express: '^4.18.0' } };

      const frameworks = detectFrameworks(files as any, packageJson);
      expect(frameworks).toContain('Express');
    });

    it('should detect multiple frameworks', () => {
      const files = [{ path: 'package.json', extension: '.json' }];
      const packageJson = {
        dependencies: {
          react: '^18.0.0',
          express: '^4.18.0',
          '@prisma/client': '^5.0.0',
        },
      };

      const frameworks = detectFrameworks(files as any, packageJson);
      expect(frameworks).toContain('React');
      expect(frameworks).toContain('Express');
      expect(frameworks).toContain('Prisma');
    });

    it('should detect Ink framework', () => {
      const files = [{ path: 'package.json', extension: '.json' }];
      const packageJson = { dependencies: { ink: '^4.0.0' } };

      const frameworks = detectFrameworks(files as any, packageJson);
      expect(frameworks).toContain('Ink');
    });

    it('should detect frameworks from file patterns', () => {
      const files = [
        { path: 'next.config.js', extension: '.js' },
        { path: 'package.json', extension: '.json' },
      ];
      const packageJson = { dependencies: {} };

      const frameworks = detectFrameworks(files as any, packageJson);
      expect(frameworks).toContain('Next.js');
    });

    it('should return empty array when no frameworks detected', () => {
      const files = [{ path: 'main.py', extension: '.py' }];

      const frameworks = detectFrameworks(files as any);
      expect(frameworks).toEqual([]);
    });
  });

  describe('inferProjectType', () => {
    it('should infer cli from Ink framework', () => {
      const frameworks = ['Ink'];
      expect(inferProjectType(frameworks, [])).toBe('cli');
    });

    it('should infer web-app from React', () => {
      const frameworks = ['React'];
      expect(inferProjectType(frameworks, [])).toBe('web-app');
    });

    it('should infer api-server from Express', () => {
      const frameworks = ['Express'];
      expect(inferProjectType(frameworks, [])).toBe('api-server');
    });

    it('should infer library from lib/src structure with root index', () => {
      const files = [{ path: 'index.ts' }, { path: 'src/utils.ts' }];
      expect(inferProjectType([], files as any)).toBe('library');
    });

    it('should return other when no indicators', () => {
      expect(inferProjectType([], [])).toBe('other');
    });
  });

  describe('identifyKeyFiles', () => {
    it('should identify entry points', () => {
      const files = [
        { path: 'src/index.ts', extension: '.ts' },
        { path: 'package.json', extension: '.json' },
      ];
      const packageJson = { main: 'src/index.ts' };

      const keyFiles = identifyKeyFiles(files as any, packageJson);

      expect(keyFiles.some(f => f.path === 'src/index.ts' && f.category === 'entry-point')).toBe(
        true
      );
    });

    it('should identify config files', () => {
      const files = [
        { path: 'tsconfig.json', extension: '.json' },
        { path: '.eslintrc.js', extension: '.js' },
        { path: 'vite.config.ts', extension: '.ts' },
      ];

      const keyFiles = identifyKeyFiles(files as any);

      expect(keyFiles.some(f => f.path === 'tsconfig.json' && f.category === 'config')).toBe(true);
      expect(keyFiles.some(f => f.category === 'build-config')).toBe(true);
    });

    it('should identify documentation files', () => {
      const files = [
        { path: 'README.md', extension: '.md' },
        { path: 'CHANGELOG.md', extension: '.md' },
      ];

      const keyFiles = identifyKeyFiles(files as any);

      expect(keyFiles.some(f => f.path === 'README.md' && f.category === 'documentation')).toBe(
        true
      );
    });

    it('should identify test setup files', () => {
      const files = [
        { path: 'vitest.config.ts', extension: '.ts' },
        { path: 'jest.config.js', extension: '.js' },
      ];

      const keyFiles = identifyKeyFiles(files as any);

      expect(keyFiles.some(f => f.category === 'test-setup')).toBe(true);
    });
  });

  describe('analyzeDirectoryStructure', () => {
    it('should analyze directories with file counts', () => {
      const files = [
        { path: 'src/index.ts', extension: '.ts', lines: 100 },
        { path: 'src/utils/helper.ts', extension: '.ts', lines: 50 },
        { path: 'src/utils/config.ts', extension: '.ts', lines: 75 },
        { path: 'tests/app.test.ts', extension: '.ts', lines: 200 },
      ];

      const structure = analyzeDirectoryStructure(files as any);

      expect(structure.some(d => d.path === 'src' && d.fileCount === 3)).toBe(true);
      expect(structure.some(d => d.path === 'tests' && d.fileCount === 1)).toBe(true);
    });

    it('should detect primary language per directory', () => {
      const files = [
        { path: 'src/app.ts', extension: '.ts', lines: 100 },
        { path: 'src/helper.ts', extension: '.ts', lines: 50 },
        { path: 'scripts/build.py', extension: '.py', lines: 75 },
      ];

      const structure = analyzeDirectoryStructure(files as any);

      expect(structure.find(d => d.path === 'src')?.primaryLanguage).toBe('TypeScript');
      expect(structure.find(d => d.path === 'scripts')?.primaryLanguage).toBe('Python');
    });

    it('should infer directory purposes', () => {
      const files = [
        { path: 'src/index.ts', extension: '.ts', lines: 100 },
        { path: 'tests/app.test.ts', extension: '.ts', lines: 50 },
        { path: 'docs/api.md', extension: '.md', lines: 200 },
      ];

      const structure = analyzeDirectoryStructure(files as any);

      expect(structure.find(d => d.path === 'src')?.purpose).toContain('Source');
      expect(structure.find(d => d.path === 'tests')?.purpose).toContain('Test');
      expect(structure.find(d => d.path === 'docs')?.purpose).toContain('Documentation');
    });
  });

  describe('detectEntryPoints', () => {
    it('should detect main from package.json', () => {
      const files = [{ path: 'src/index.ts', extension: '.ts' }];
      const packageJson = { main: 'src/index.ts' };

      const entryPoints = detectEntryPoints(files as any, packageJson);

      expect(entryPoints).toContain('src/index.ts');
    });

    it('should detect bin from package.json', () => {
      const files = [{ path: 'bin/cli.js', extension: '.js' }];
      const packageJson = { bin: { mycli: './bin/cli.js' } };

      const entryPoints = detectEntryPoints(files as any, packageJson);

      expect(entryPoints).toContain('bin/cli.js');
    });

    it('should detect common index files', () => {
      const files = [
        { path: 'index.ts', extension: '.ts' },
        { path: 'src/index.ts', extension: '.ts' },
      ];

      const entryPoints = detectEntryPoints(files as any);

      expect(entryPoints).toContain('index.ts');
    });
  });

  describe('scanFiles', () => {
    it('should scan files respecting ignore patterns', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const mockDirContents = [
        { name: 'index.ts', isDirectory: () => false, isFile: () => true },
        { name: 'utils.ts', isDirectory: () => false, isFile: () => true },
        { name: 'node_modules', isDirectory: () => true, isFile: () => false },
      ];

      vi.mocked(fsPromises.readdir).mockResolvedValue(mockDirContents as Dirent[]);

      vi.mocked(fsPromises.stat).mockResolvedValue({
        size: 1000,
        mtime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
      } as Stats);

      vi.mocked(fsPromises.readFile).mockResolvedValue('line1\nline2\nline3');

      const files = await scanFiles('/project', path => path.includes('node_modules'));

      expect(files.some(f => f.path === 'index.ts')).toBe(true);
      expect(files.some(f => f.name === 'node_modules')).toBe(false);
    });

    it('should count lines for text files', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'app.ts', isDirectory: () => false, isFile: () => true },
      ] as Dirent[]);

      vi.mocked(fsPromises.stat).mockResolvedValue({
        size: 100,
        mtime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
      } as Stats);

      vi.mocked(fsPromises.readFile).mockResolvedValue('line1\nline2\nline3\nline4\nline5');

      const files = await scanFiles('/project', () => false);

      expect(files[0].lines).toBe(5);
    });

    it('should handle empty directories', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readdir).mockResolvedValue([]);

      const files = await scanFiles('/project', () => false);

      expect(files).toEqual([]);
    });
  });
});
