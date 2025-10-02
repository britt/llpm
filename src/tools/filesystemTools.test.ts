import '../../test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  readProjectFile,
  listProjectDirectory,
  getProjectFileInfo,
  findProjectFiles
} from './filesystemTools';
import * as projectConfig from '../utils/projectConfig';
import type { Project } from '../types/project';

describe('filesystemTools', () => {
  let mockProjectDir: string;
  let mockProject: Project;

  beforeEach(async () => {
    // Create a temporary project directory
    mockProjectDir = join(tmpdir(), 'llpm-fs-test-' + Date.now());
    mkdirSync(mockProjectDir, { recursive: true });

    // Create test files
    await writeFile(join(mockProjectDir, 'README.md'), '# Test Project\nThis is a test project.');
    await writeFile(join(mockProjectDir, 'package.json'), '{"name": "test-project", "version": "1.0.0"}');
    await writeFile(join(mockProjectDir, 'index.js'), 'console.log("Hello, World!");');
    
    // Create subdirectory with files
    mkdirSync(join(mockProjectDir, 'src'), { recursive: true });
    await writeFile(join(mockProjectDir, 'src', 'main.ts'), 'export function main() { return "Hello"; }');
    await writeFile(join(mockProjectDir, 'src', 'utils.ts'), 'export const VERSION = "1.0.0";');

    mockProject = {
      id: 'test-project',
      name: 'Test Project',
      description: 'A test project',
      repository: 'test/repo',
      path: mockProjectDir,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Mock getCurrentProject
    vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(mockProject);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    
    // Clean up test directory
    if (existsSync(mockProjectDir)) {
      rmSync(mockProjectDir, { recursive: true, force: true });
    }
  });

  describe('readProjectFile', () => {
    it('should read a file in the project root', async () => {
      const result = await readProjectFile.execute({ path: 'README.md' });
      
      expect(result).toContain('File: README.md');
      expect(result).toContain('# Test Project');
      expect(result).toContain('This is a test project.');
    });

    it('should read a file in a subdirectory', async () => {
      const result = await readProjectFile.execute({ path: 'src/main.ts' });
      
      expect(result).toContain('File: src/main.ts');
      expect(result).toContain('export function main()');
    });

    it('should handle absolute paths within project', async () => {
      const absolutePath = join(mockProjectDir, 'package.json');
      const result = await readProjectFile.execute({ path: absolutePath });
      
      expect(result).toContain('File: package.json');
      expect(result).toContain('"name": "test-project"');
    });

    it('should reject paths outside project directory', async () => {
      const result = await readProjectFile.execute({ path: '../../../etc/passwd' });
      
      expect(result).toContain('Error');
      expect(result).toContain('outside the current project directory');
    });

    it('should handle non-existent files', async () => {
      const result = await readProjectFile.execute({ path: 'nonexistent.txt' });
      
      expect(result).toContain('Error');
      expect(result).toContain('does not exist');
    });

    it('should handle no active project', async () => {
      vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(null);
      
      const result = await readProjectFile.execute({ path: 'README.md' });
      
      expect(result).toContain('No active project set');
    });
  });

  describe('listProjectDirectory', () => {
    it('should list files in project root', async () => {
      const result = await listProjectDirectory.execute({ path: '.' });
      
      expect(result).toContain('Directory listing: .');
      expect(result).toContain('📄 README.md');
      expect(result).toContain('📄 package.json');
      expect(result).toContain('📄 index.js');
      expect(result).toContain('📁 src/');
    });

    it('should list files in subdirectory', async () => {
      const result = await listProjectDirectory.execute({ path: 'src' });
      
      expect(result).toContain('Directory listing: src');
      expect(result).toContain('📄 src/main.ts');
      expect(result).toContain('📄 src/utils.ts');
    });

    it('should handle recursive listing', async () => {
      const result = await listProjectDirectory.execute({ 
        path: '.', 
        recursive: true 
      });
      
      expect(result).toContain('📄 src/main.ts');
      expect(result).toContain('📄 src/utils.ts');
    });

    it('should exclude hidden files by default', async () => {
      // Create a hidden file
      await writeFile(join(mockProjectDir, '.hidden'), 'hidden content');
      
      const result = await listProjectDirectory.execute({ path: '.' });
      
      expect(result).not.toContain('.hidden');
    });

    it('should include hidden files when requested', async () => {
      // Create a hidden file
      await writeFile(join(mockProjectDir, '.hidden'), 'hidden content');
      
      const result = await listProjectDirectory.execute({ 
        path: '.', 
        includeHidden: true 
      });
      
      expect(result).toContain('📄 .hidden');
    });
  });

  describe('getProjectFileInfo', () => {
    it('should get info for a file', async () => {
      const result = await getProjectFileInfo.execute({ path: 'README.md' });
      
      expect(result).toContain('File Info: README.md');
      expect(result).toContain('Type: file');
      expect(result).toContain('Size:');
      expect(result).toContain('Modified:');
      expect(result).toContain('Readable: true');
    });

    it('should get info for a directory', async () => {
      const result = await getProjectFileInfo.execute({ path: 'src' });
      
      expect(result).toContain('File Info: src');
      expect(result).toContain('Type: directory');
    });
  });

  describe('findProjectFiles', () => {
    it('should find files by pattern', async () => {
      const result = await findProjectFiles.execute({ pattern: '*.ts' });
      
      expect(result).toContain('Found');
      expect(result).toContain('main.ts');
      expect(result).toContain('utils.ts');
    });

    it('should find files with glob pattern', async () => {
      const result = await findProjectFiles.execute({ pattern: 'src/*.ts' });
      
      expect(result).toContain('src/main.ts');
      expect(result).toContain('src/utils.ts');
    });

    it('should limit results', async () => {
      const result = await findProjectFiles.execute({ 
        pattern: '*', 
        maxResults: 2 
      });
      
      const lines = result.split('\n').filter(line => line.includes('📄'));
      expect(lines.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all filesystem tools', () => {
      const tools = [
        readProjectFile,
        listProjectDirectory,
        getProjectFileInfo,
        findProjectFiles
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });
});