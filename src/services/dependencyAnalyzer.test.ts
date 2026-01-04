import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';

// Auto-mock fs modules
vi.mock('fs/promises');
vi.mock('fs');

import {
  detectPackageManager,
  parsePackageJson,
  parseRequirementsTxt,
  parsePyProjectToml,
  parseGoMod,
  parseCargoToml,
  inferDependencyPurpose,
  analyzeDependencies,
  COMMON_DEPENDENCY_PURPOSES,
  type DependencyInfo,
  type ParsedDependency,
} from './dependencyAnalyzer';
import type { FileInfo } from './projectAnalyzer';

describe('dependencyAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  describe('detectPackageManager', () => {
    it('should detect npm from package-lock.json', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'package.json', name: 'package.json' },
        { path: 'package-lock.json', name: 'package-lock.json' },
      ];
      expect(detectPackageManager(files as FileInfo[])).toBe('npm');
    });

    it('should detect yarn from yarn.lock', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'package.json', name: 'package.json' },
        { path: 'yarn.lock', name: 'yarn.lock' },
      ];
      expect(detectPackageManager(files as FileInfo[])).toBe('yarn');
    });

    it('should detect pnpm from pnpm-lock.yaml', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'package.json', name: 'package.json' },
        { path: 'pnpm-lock.yaml', name: 'pnpm-lock.yaml' },
      ];
      expect(detectPackageManager(files as FileInfo[])).toBe('pnpm');
    });

    it('should detect bun from bun.lockb', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'package.json', name: 'package.json' },
        { path: 'bun.lockb', name: 'bun.lockb' },
      ];
      expect(detectPackageManager(files as FileInfo[])).toBe('bun');
    });

    it('should detect pip from requirements.txt', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'requirements.txt', name: 'requirements.txt' },
      ];
      expect(detectPackageManager(files as FileInfo[])).toBe('pip');
    });

    it('should detect poetry from pyproject.toml with poetry section', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'pyproject.toml', name: 'pyproject.toml' },
        { path: 'poetry.lock', name: 'poetry.lock' },
      ];
      expect(detectPackageManager(files as FileInfo[])).toBe('poetry');
    });

    it('should detect cargo from Cargo.toml', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'Cargo.toml', name: 'Cargo.toml' },
      ];
      expect(detectPackageManager(files as FileInfo[])).toBe('cargo');
    });

    it('should detect go modules from go.mod', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'go.mod', name: 'go.mod' },
      ];
      expect(detectPackageManager(files as FileInfo[])).toBe('go');
    });

    it('should return null for unknown projects', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'main.c', name: 'main.c' },
      ];
      expect(detectPackageManager(files as FileInfo[])).toBeNull();
    });
  });

  describe('parsePackageJson', () => {
    it('should parse dependencies from package.json', () => {
      const packageJson = {
        dependencies: {
          'react': '^18.0.0',
          'express': '~4.18.0',
        },
      };

      const deps = parsePackageJson(packageJson);
      expect(deps.runtime).toHaveLength(2);
      expect(deps.runtime.find(d => d.name === 'react')?.version).toBe('^18.0.0');
      expect(deps.runtime.find(d => d.name === 'express')?.version).toBe('~4.18.0');
    });

    it('should parse devDependencies', () => {
      const packageJson = {
        devDependencies: {
          'vitest': '^1.0.0',
          'typescript': '^5.0.0',
        },
      };

      const deps = parsePackageJson(packageJson);
      expect(deps.development).toHaveLength(2);
      expect(deps.development.find(d => d.name === 'vitest')).toBeDefined();
      expect(deps.development.find(d => d.name === 'typescript')).toBeDefined();
    });

    it('should parse peerDependencies', () => {
      const packageJson = {
        peerDependencies: {
          'react': '>=17.0.0',
        },
      };

      const deps = parsePackageJson(packageJson);
      expect(deps.peer).toHaveLength(1);
      expect(deps.peer[0].name).toBe('react');
    });

    it('should infer purposes for known dependencies', () => {
      const packageJson = {
        dependencies: {
          'react': '^18.0.0',
          'express': '^4.18.0',
        },
        devDependencies: {
          'vitest': '^1.0.0',
          'eslint': '^8.0.0',
        },
      };

      const deps = parsePackageJson(packageJson);
      expect(deps.runtime.find(d => d.name === 'react')?.purpose).toContain('UI');
      expect(deps.runtime.find(d => d.name === 'express')?.purpose).toContain('server');
      expect(deps.development.find(d => d.name === 'vitest')?.purpose).toContain('testing');
      expect(deps.development.find(d => d.name === 'eslint')?.purpose).toContain('linting');
    });

    it('should handle empty package.json', () => {
      const deps = parsePackageJson({});
      expect(deps.runtime).toEqual([]);
      expect(deps.development).toEqual([]);
      expect(deps.peer).toEqual([]);
    });
  });

  describe('parseRequirementsTxt', () => {
    it('should parse simple requirements', () => {
      const content = `
flask==2.0.0
requests>=2.25.0
numpy
`;
      const deps = parseRequirementsTxt(content);
      expect(deps).toHaveLength(3);
      expect(deps.find(d => d.name === 'flask')?.version).toBe('==2.0.0');
      expect(deps.find(d => d.name === 'requests')?.version).toBe('>=2.25.0');
      expect(deps.find(d => d.name === 'numpy')?.version).toBeUndefined();
    });

    it('should ignore comments', () => {
      const content = `
# This is a comment
flask==2.0.0
# Another comment
requests>=2.25.0
`;
      const deps = parseRequirementsTxt(content);
      expect(deps).toHaveLength(2);
    });

    it('should ignore -r and -e flags', () => {
      const content = `
-r requirements-dev.txt
-e git+https://github.com/user/repo.git
flask==2.0.0
`;
      const deps = parseRequirementsTxt(content);
      expect(deps).toHaveLength(1);
      expect(deps[0].name).toBe('flask');
    });

    it('should handle version specifiers with extras', () => {
      const content = `
requests[security]>=2.25.0
celery[redis]==5.0.0
`;
      const deps = parseRequirementsTxt(content);
      expect(deps).toHaveLength(2);
      expect(deps[0].name).toBe('requests');
      expect(deps[1].name).toBe('celery');
    });
  });

  describe('parsePyProjectToml', () => {
    it('should parse poetry dependencies', () => {
      const content = `
[tool.poetry.dependencies]
python = "^3.9"
flask = "^2.0.0"
requests = "^2.25.0"

[tool.poetry.dev-dependencies]
pytest = "^7.0.0"
black = "^22.0.0"
`;
      const deps = parsePyProjectToml(content);
      expect(deps.runtime).toHaveLength(2); // Excludes python
      expect(deps.development).toHaveLength(2);
      expect(deps.runtime.find(d => d.name === 'flask')).toBeDefined();
      expect(deps.development.find(d => d.name === 'pytest')).toBeDefined();
    });

    it('should handle PEP 621 format', () => {
      const content = `
[project]
dependencies = [
    "flask>=2.0.0",
    "requests>=2.25.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
]
`;
      const deps = parsePyProjectToml(content);
      expect(deps.runtime).toHaveLength(2);
      expect(deps.development).toHaveLength(1);
    });

    it('should handle empty file', () => {
      const deps = parsePyProjectToml('');
      expect(deps.runtime).toEqual([]);
      expect(deps.development).toEqual([]);
    });
  });

  describe('parseGoMod', () => {
    it('should parse go.mod require statements', () => {
      const content = `
module github.com/user/project

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/stretchr/testify v1.8.4
)
`;
      const deps = parseGoMod(content);
      expect(deps).toHaveLength(2);
      expect(deps.find(d => d.name === 'github.com/gin-gonic/gin')?.version).toBe('v1.9.1');
    });

    it('should parse single-line require', () => {
      const content = `
module github.com/user/project

go 1.21

require github.com/gin-gonic/gin v1.9.1
`;
      const deps = parseGoMod(content);
      expect(deps).toHaveLength(1);
      expect(deps[0].name).toBe('github.com/gin-gonic/gin');
    });

    it('should ignore indirect dependencies', () => {
      const content = `
module github.com/user/project

require (
    github.com/gin-gonic/gin v1.9.1
    golang.org/x/sys v0.10.0 // indirect
)
`;
      const deps = parseGoMod(content);
      expect(deps).toHaveLength(1);
    });
  });

  describe('parseCargoToml', () => {
    it('should parse Cargo.toml dependencies', () => {
      const content = `
[package]
name = "myproject"
version = "0.1.0"

[dependencies]
serde = "1.0"
tokio = { version = "1.0", features = ["full"] }

[dev-dependencies]
criterion = "0.5"
`;
      const deps = parseCargoToml(content);
      expect(deps.runtime).toHaveLength(2);
      expect(deps.development).toHaveLength(1);
      expect(deps.runtime.find(d => d.name === 'serde')?.version).toBe('1.0');
      expect(deps.runtime.find(d => d.name === 'tokio')?.version).toBe('1.0');
    });

    it('should handle git dependencies', () => {
      const content = `
[dependencies]
my-lib = { git = "https://github.com/user/my-lib" }
`;
      const deps = parseCargoToml(content);
      expect(deps.runtime).toHaveLength(1);
      expect(deps.runtime[0].name).toBe('my-lib');
    });
  });

  describe('inferDependencyPurpose', () => {
    it('should infer purpose for React', () => {
      const purpose = inferDependencyPurpose('react');
      expect(purpose).toContain('UI');
    });

    it('should infer purpose for testing libraries', () => {
      expect(inferDependencyPurpose('vitest')).toContain('testing');
      expect(inferDependencyPurpose('jest')).toContain('testing');
      expect(inferDependencyPurpose('pytest')).toContain('testing');
    });

    it('should infer purpose for bundlers', () => {
      expect(inferDependencyPurpose('webpack')).toContain('bundler');
      expect(inferDependencyPurpose('vite')).toContain('bundler');
      expect(inferDependencyPurpose('esbuild')).toContain('bundler');
    });

    it('should infer purpose for linters', () => {
      expect(inferDependencyPurpose('eslint')).toContain('linting');
      expect(inferDependencyPurpose('prettier')).toContain('formatting');
    });

    it('should return null for unknown packages', () => {
      expect(inferDependencyPurpose('my-obscure-package')).toBeNull();
    });
  });

  describe('COMMON_DEPENDENCY_PURPOSES', () => {
    it('should have purposes for common packages', () => {
      expect(COMMON_DEPENDENCY_PURPOSES['react']).toBeDefined();
      expect(COMMON_DEPENDENCY_PURPOSES['express']).toBeDefined();
      expect(COMMON_DEPENDENCY_PURPOSES['typescript']).toBeDefined();
    });
  });

  describe('analyzeDependencies', () => {
    it('should analyze Node.js project dependencies', async () => {
      const files: Partial<FileInfo>[] = [
        { path: 'package.json', name: 'package.json' },
        { path: 'package-lock.json', name: 'package-lock.json' },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          dependencies: { react: '^18.0.0' },
          devDependencies: { vitest: '^1.0.0' },
        })
      );

      const analysis = await analyzeDependencies('/project', files as FileInfo[]);

      expect(analysis.packageManager).toBe('npm');
      expect(analysis.runtime.length).toBeGreaterThan(0);
      expect(analysis.development.length).toBeGreaterThan(0);
    });

    it('should analyze Python project dependencies', async () => {
      const files: Partial<FileInfo>[] = [
        { path: 'requirements.txt', name: 'requirements.txt' },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue('flask==2.0.0\nrequests>=2.25.0');

      const analysis = await analyzeDependencies('/project', files as FileInfo[]);

      expect(analysis.packageManager).toBe('pip');
      expect(analysis.runtime.length).toBe(2);
    });

    it('should handle missing dependency files gracefully', async () => {
      const files: Partial<FileInfo>[] = [
        { path: 'src/main.ts', name: 'main.ts' },
      ];

      const analysis = await analyzeDependencies('/project', files as FileInfo[]);

      expect(analysis.packageManager).toBeNull();
      expect(analysis.runtime).toEqual([]);
      expect(analysis.development).toEqual([]);
    });

    it('should handle file read errors', async () => {
      const files: Partial<FileInfo>[] = [
        { path: 'package.json', name: 'package.json' },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('Read error'));

      const analysis = await analyzeDependencies('/project', files as FileInfo[]);

      expect(analysis.runtime).toEqual([]);
    });

    it('should return total dependency count', async () => {
      const files: Partial<FileInfo>[] = [
        { path: 'package.json', name: 'package.json' },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        JSON.stringify({
          dependencies: { react: '^18.0.0', express: '^4.0.0' },
          devDependencies: { vitest: '^1.0.0' },
        })
      );

      const analysis = await analyzeDependencies('/project', files as FileInfo[]);

      expect(analysis.totalCount).toBe(3);
    });
  });
});
