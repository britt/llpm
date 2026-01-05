import { describe, it, expect } from 'vitest';
import {
  PROJECT_SCAN_VERSION,
  isProjectScan,
  createEmptyProjectScan,
  type ProjectScan,
  type ProjectOverview,
  type KeyFile,
} from './projectScan';

describe('projectScan types', () => {
  describe('PROJECT_SCAN_VERSION', () => {
    it('should be a semver string', () => {
      expect(PROJECT_SCAN_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should be version 1.0.0', () => {
      expect(PROJECT_SCAN_VERSION).toBe('1.0.0');
    });
  });

  describe('isProjectScan', () => {
    it('should return false for null', () => {
      expect(isProjectScan(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isProjectScan(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isProjectScan('string')).toBe(false);
      expect(isProjectScan(123)).toBe(false);
      expect(isProjectScan(true)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isProjectScan({})).toBe(false);
    });

    it('should return false for object missing required fields', () => {
      expect(isProjectScan({ version: '1.0.0' })).toBe(false);
      expect(isProjectScan({ version: '1.0.0', scannedAt: '2025-01-01' })).toBe(false);
    });

    it('should return true for valid ProjectScan', () => {
      const validScan = createEmptyProjectScan('test-id', 'Test Project', '/path/to/project');
      expect(isProjectScan(validScan)).toBe(true);
    });

    it('should return true for ProjectScan with all fields populated', () => {
      const fullScan: ProjectScan = {
        version: '1.0.0',
        scannedAt: '2025-01-04T00:00:00.000Z',
        projectId: 'test-project-123',
        projectName: 'Test Project',
        projectPath: '/home/user/projects/test',
        overview: {
          summary: 'A test project for testing',
          primaryLanguages: ['TypeScript', 'JavaScript'],
          frameworks: ['React', 'Node.js'],
          projectType: 'web-app',
          totalFiles: 150,
          totalLines: 10000,
          totalSize: 500000,
        },
        directoryStructure: [
          { path: 'src', purpose: 'Source code', fileCount: 50, primaryLanguage: 'TypeScript' },
          { path: 'tests', purpose: 'Test files', fileCount: 30, primaryLanguage: 'TypeScript' },
        ],
        keyFiles: [
          { path: 'src/index.ts', reason: 'Main entry point', category: 'entry-point' },
          { path: 'package.json', reason: 'Project configuration', category: 'config' },
        ],
        documentation: {
          readmeSummary: 'This is a test project',
          hasDocumentation: true,
          docsSummary: 'Documentation includes API reference',
          docFiles: ['docs/api.md', 'docs/getting-started.md'],
          inlineDocsCoverage: 'partial',
        },
        dependencies: {
          packageManager: 'npm',
          runtime: [
            { name: 'react', version: '^18.0.0', purpose: 'UI framework' },
          ],
          development: [
            { name: 'vitest', version: '^1.0.0', purpose: 'Testing framework' },
          ],
        },
        architecture: {
          description: 'A layered architecture with UI, services, and data layers',
          components: [
            {
              name: 'UI Layer',
              type: 'layer',
              description: 'React components',
              dependencies: ['Service Layer'],
              keyFiles: ['src/components/'],
            },
          ],
          mermaidDiagram: 'flowchart TD\n  UI --> Services',
        },
      };

      expect(isProjectScan(fullScan)).toBe(true);
    });
  });

  describe('createEmptyProjectScan', () => {
    it('should create a ProjectScan with provided values', () => {
      const scan = createEmptyProjectScan('my-project-123', 'My Project', '/path/to/my-project');

      expect(scan.projectId).toBe('my-project-123');
      expect(scan.projectName).toBe('My Project');
      expect(scan.projectPath).toBe('/path/to/my-project');
    });

    it('should set version to current PROJECT_SCAN_VERSION', () => {
      const scan = createEmptyProjectScan('id', 'name', '/path');
      expect(scan.version).toBe(PROJECT_SCAN_VERSION);
    });

    it('should set scannedAt to current timestamp', () => {
      const before = new Date().toISOString();
      const scan = createEmptyProjectScan('id', 'name', '/path');
      const after = new Date().toISOString();

      expect(scan.scannedAt >= before).toBe(true);
      expect(scan.scannedAt <= after).toBe(true);
    });

    it('should initialize overview with empty/default values', () => {
      const scan = createEmptyProjectScan('id', 'name', '/path');

      expect(scan.overview.summary).toBe('');
      expect(scan.overview.primaryLanguages).toEqual([]);
      expect(scan.overview.frameworks).toEqual([]);
      expect(scan.overview.projectType).toBe('other');
      expect(scan.overview.totalFiles).toBe(0);
      expect(scan.overview.totalLines).toBe(0);
      expect(scan.overview.totalSize).toBe(0);
    });

    it('should initialize arrays as empty', () => {
      const scan = createEmptyProjectScan('id', 'name', '/path');

      expect(scan.directoryStructure).toEqual([]);
      expect(scan.keyFiles).toEqual([]);
    });

    it('should initialize documentation with defaults', () => {
      const scan = createEmptyProjectScan('id', 'name', '/path');

      expect(scan.documentation.hasDocumentation).toBe(false);
      expect(scan.documentation.docFiles).toEqual([]);
      expect(scan.documentation.inlineDocsCoverage).toBe('none');
      expect(scan.documentation.readmeSummary).toBeUndefined();
      expect(scan.documentation.docsSummary).toBeUndefined();
    });

    it('should initialize dependencies with null package manager', () => {
      const scan = createEmptyProjectScan('id', 'name', '/path');

      expect(scan.dependencies.packageManager).toBeNull();
      expect(scan.dependencies.runtime).toEqual([]);
      expect(scan.dependencies.development).toEqual([]);
    });

    it('should initialize architecture with empty values', () => {
      const scan = createEmptyProjectScan('id', 'name', '/path');

      expect(scan.architecture.description).toBe('');
      expect(scan.architecture.components).toEqual([]);
      expect(scan.architecture.mermaidDiagram).toBeUndefined();
    });

    it('should create a valid ProjectScan that passes type guard', () => {
      const scan = createEmptyProjectScan('id', 'name', '/path');
      expect(isProjectScan(scan)).toBe(true);
    });
  });

  describe('Type definitions', () => {
    it('should allow valid ProjectOverview values', () => {
      const overview: ProjectOverview = {
        summary: 'A CLI tool',
        primaryLanguages: ['TypeScript'],
        frameworks: ['Ink', 'React'],
        projectType: 'cli',
        totalFiles: 100,
        totalLines: 5000,
        totalSize: 250000,
      };

      expect(overview.projectType).toBe('cli');
    });

    it('should allow all ProjectType values', () => {
      const types: Array<ProjectOverview['projectType']> = [
        'cli',
        'web-app',
        'api-server',
        'library',
        'monorepo',
        'documentation',
        'mobile-app',
        'desktop-app',
        'other',
      ];

      expect(types).toHaveLength(9);
    });

    it('should allow valid KeyFile values', () => {
      const keyFile: KeyFile = {
        path: 'src/index.ts',
        reason: 'Main entry point specified in package.json',
        summary: 'Application bootstrap and initialization',
        category: 'entry-point',
      };

      expect(keyFile.category).toBe('entry-point');
    });

    it('should allow all KeyFileCategory values', () => {
      const categories: Array<KeyFile['category']> = [
        'entry-point',
        'config',
        'documentation',
        'core-logic',
        'api-definition',
        'test-setup',
        'build-config',
        'schema',
      ];

      expect(categories).toHaveLength(8);
    });
  });
});
