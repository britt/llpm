import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';

// Auto-mock fs modules
vi.mock('fs/promises');
vi.mock('fs');

// Mock config module
vi.mock('../utils/config', () => ({
  getLlpmConfigDir: vi.fn(() => '/home/user/.llpm'),
}));

import {
  loadProjectScan,
  saveProjectScan,
  deleteProjectScan,
  projectScanExists,
  getProjectScanPath,
  listProjectScans,
  generateProjectMarkdown,
} from './projectScanBackend';
import { createEmptyProjectScan } from '../types/projectScan';

describe('projectScanBackend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  describe('getProjectScanPath', () => {
    it('should return the path to project.json for a project ID', () => {
      const path = getProjectScanPath('my-project-123');
      expect(path).toBe('/home/user/.llpm/projects/my-project-123/project.json');
    });

    it('should handle project IDs with special characters', () => {
      const path = getProjectScanPath('my-project_v1.0');
      expect(path).toBe('/home/user/.llpm/projects/my-project_v1.0/project.json');
    });
  });

  describe('loadProjectScan', () => {
    it('should return null if scan file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await loadProjectScan('nonexistent-project');
      expect(result).toBeNull();
    });

    it('should load and parse a valid project scan', async () => {
      const mockScan = createEmptyProjectScan('test-id', 'Test Project', '/path/to/project');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(mockScan));

      const result = await loadProjectScan('test-id');
      expect(result).toEqual(mockScan);
    });

    it('should return null for invalid JSON', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue('not valid json');

      const result = await loadProjectScan('test-id');
      expect(result).toBeNull();
    });

    it('should return null for invalid ProjectScan structure', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({ foo: 'bar' }));

      const result = await loadProjectScan('test-id');
      expect(result).toBeNull();
    });

    it('should return null on read error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('Read error'));

      const result = await loadProjectScan('test-id');
      expect(result).toBeNull();
    });
  });

  describe('saveProjectScan', () => {
    it('should save a project scan to JSON', async () => {
      const scan = createEmptyProjectScan('test-id', 'Test Project', '/path/to/project');

      vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);

      await saveProjectScan(scan);

      expect(fsPromises.mkdir).toHaveBeenCalledWith(
        '/home/user/.llpm/projects/test-id',
        { recursive: true }
      );
      expect(fsPromises.writeFile).toHaveBeenCalledTimes(2); // JSON and Markdown
    });

    it('should create directory if it does not exist', async () => {
      const scan = createEmptyProjectScan('new-project', 'New Project', '/path');

      vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);

      await saveProjectScan(scan);

      expect(fsPromises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('new-project'),
        { recursive: true }
      );
    });

    it('should also generate markdown file', async () => {
      const scan = createEmptyProjectScan('test-id', 'Test Project', '/path');

      vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);

      await saveProjectScan(scan);

      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('project.json'),
        expect.any(String),
        'utf-8'
      );
      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('project.md'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should throw on write error', async () => {
      const scan = createEmptyProjectScan('test-id', 'Test Project', '/path');

      vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fsPromises.writeFile).mockRejectedValue(new Error('Write error'));

      await expect(saveProjectScan(scan)).rejects.toThrow('Write error');
    });
  });

  describe('deleteProjectScan', () => {
    it('should delete the project scan file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.rm).mockResolvedValue(undefined);

      await deleteProjectScan('test-id');

      expect(fsPromises.rm).toHaveBeenCalledWith(
        expect.stringContaining('test-id'),
        { recursive: true }
      );
    });

    it('should not throw if scan does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Should not throw
      await deleteProjectScan('nonexistent');
    });
  });

  describe('projectScanExists', () => {
    it('should return true if scan file exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      expect(projectScanExists('test-id')).toBe(true);
    });

    it('should return false if scan file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(projectScanExists('test-id')).toBe(false);
    });
  });

  describe('listProjectScans', () => {
    it('should return empty array if projects directory does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await listProjectScans();
      expect(result).toEqual([]);
    });

    it('should list all projects with scans', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        const pathStr = String(path);
        if (pathStr.endsWith('projects')) return true;
        if (pathStr.includes('project.json')) return true;
        return false;
      });

      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'project-1', isDirectory: () => true, isFile: () => false } as any,
        { name: 'project-2', isDirectory: () => true, isFile: () => false } as any,
        { name: 'not-a-dir.txt', isDirectory: () => false, isFile: () => true } as any,
      ]);

      const result = await listProjectScans();
      expect(result).toEqual(['project-1', 'project-2']);
    });

    it('should skip directories without project.json', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        const pathStr = String(path);
        if (pathStr.endsWith('projects')) return true;
        if (pathStr.includes('project-1/project.json')) return true;
        if (pathStr.includes('project-2/project.json')) return false;
        return false;
      });

      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'project-1', isDirectory: () => true, isFile: () => false } as any,
        { name: 'project-2', isDirectory: () => true, isFile: () => false } as any,
      ]);

      const result = await listProjectScans();
      expect(result).toEqual(['project-1']);
    });
  });

  describe('generateProjectMarkdown', () => {
    it('should generate markdown from a project scan', () => {
      const scan = createEmptyProjectScan('test-id', 'Test Project', '/path/to/project');

      const markdown = generateProjectMarkdown(scan);

      expect(markdown).toContain('# Test Project');
      expect(markdown).toContain('/path/to/project');
    });

    it('should include overview section', () => {
      const scan = createEmptyProjectScan('test-id', 'Test Project', '/path');
      scan.overview.summary = 'A comprehensive test project';
      scan.overview.primaryLanguages = ['TypeScript', 'JavaScript'];
      scan.overview.frameworks = ['React', 'Node.js'];
      scan.overview.projectType = 'web-app';

      const markdown = generateProjectMarkdown(scan);

      expect(markdown).toContain('A comprehensive test project');
      expect(markdown).toContain('TypeScript');
      expect(markdown).toContain('React');
      expect(markdown).toContain('web-app');
    });

    it('should include key files section', () => {
      const scan = createEmptyProjectScan('test-id', 'Test Project', '/path');
      scan.keyFiles = [
        { path: 'src/index.ts', reason: 'Entry point', category: 'entry-point' },
        { path: 'package.json', reason: 'Package config', category: 'config' },
      ];

      const markdown = generateProjectMarkdown(scan);

      expect(markdown).toContain('src/index.ts');
      expect(markdown).toContain('Entry point');
      expect(markdown).toContain('package.json');
    });

    it('should include architecture section', () => {
      const scan = createEmptyProjectScan('test-id', 'Test Project', '/path');
      scan.architecture.description = 'A layered MVC architecture';
      scan.architecture.components = [
        {
          name: 'UI Layer',
          type: 'layer',
          description: 'React components',
          dependencies: ['Service Layer'],
          keyFiles: ['src/components/'],
        },
      ];

      const markdown = generateProjectMarkdown(scan);

      expect(markdown).toContain('A layered MVC architecture');
      expect(markdown).toContain('UI Layer');
    });

    it('should include mermaid diagram if available', () => {
      const scan = createEmptyProjectScan('test-id', 'Test Project', '/path');
      scan.architecture.mermaidDiagram = 'flowchart TD\n  A --> B';

      const markdown = generateProjectMarkdown(scan);

      expect(markdown).toContain('```mermaid');
      expect(markdown).toContain('flowchart TD');
    });

    it('should include dependencies section', () => {
      const scan = createEmptyProjectScan('test-id', 'Test Project', '/path');
      scan.dependencies.packageManager = 'npm';
      scan.dependencies.runtime = [
        { name: 'react', version: '^18.0.0', purpose: 'UI framework' },
      ];
      scan.dependencies.development = [
        { name: 'vitest', version: '^1.0.0', purpose: 'Testing' },
      ];

      const markdown = generateProjectMarkdown(scan);

      expect(markdown).toContain('npm');
      expect(markdown).toContain('react');
      expect(markdown).toContain('vitest');
    });

    it('should include documentation section', () => {
      const scan = createEmptyProjectScan('test-id', 'Test Project', '/path');
      scan.documentation.readmeSummary = 'This project does amazing things';
      scan.documentation.hasDocumentation = true;
      scan.documentation.docFiles = ['docs/api.md', 'docs/guide.md'];

      const markdown = generateProjectMarkdown(scan);

      expect(markdown).toContain('This project does amazing things');
      expect(markdown).toContain('docs/api.md');
    });
  });
});
