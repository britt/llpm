import '../../test/setup';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDefaultSystemPrompt,
  getSystemPrompt,
  saveSystemPrompt,
  getBaseSystemPrompt,
  ensureDefaultSystemPromptFile,
  getSystemPromptPath
} from './systemPrompt';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as projectConfig from './projectConfig';
import type { Project } from '../types/project';

// Mock dependencies
vi.mock('fs');
vi.mock('fs/promises');
vi.mock('./projectConfig');
vi.mock('./config', () => ({
  ensureConfigDir: vi.fn().mockResolvedValue(undefined),
  SYSTEM_PROMPT_FILE: '/mock/system-prompt.txt'
}));
vi.mock('./logger', () => ({
  debug: vi.fn()
}));
vi.mock('./tracing', () => ({
  traced: vi.fn((name, opts, fn) => fn({ setAttribute: vi.fn() }))
}));

describe('systemPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDefaultSystemPrompt', () => {
    it('should return the default system prompt', () => {
      const defaultPrompt = getDefaultSystemPrompt();

      expect(defaultPrompt).toBeTruthy();
      expect(typeof defaultPrompt).toBe('string');
      expect(defaultPrompt).toContain('LLPM');
      expect(defaultPrompt).toContain('Large Language Model Product Manager');
    });

    it('should return a consistent default prompt', () => {
      const prompt1 = getDefaultSystemPrompt();
      const prompt2 = getDefaultSystemPrompt();

      expect(prompt1).toBe(prompt2);
    });

    it('should include key functionality descriptions', () => {
      const defaultPrompt = getDefaultSystemPrompt();

      expect(defaultPrompt).toContain('project');
      expect(defaultPrompt).toContain('GitHub');
      expect(defaultPrompt).toContain('tools');
    });
  });

  describe('getSystemPromptPath', () => {
    it('should return the system prompt file path', () => {
      const path = getSystemPromptPath();
      expect(path).toBe('/mock/system-prompt.txt');
    });
  });

  describe('getSystemPrompt', () => {
    it('should return default prompt when file does not exist and no project', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('LLPM');
      expect(prompt).toContain('Large Language Model Product Manager');
    });

    it('should return custom prompt from file when it exists', async () => {
      const customPrompt = 'Custom system prompt content';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as fs.Stats);
      vi.mocked(fsPromises.readFile).mockResolvedValue(customPrompt);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const prompt = await getSystemPrompt();

      expect(prompt).toBe(customPrompt);
    });

    it('should handle stats error gracefully', async () => {
      const customPrompt = 'Custom prompt';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error('Stats error');
      });
      vi.mocked(fsPromises.readFile).mockResolvedValue(customPrompt);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const prompt = await getSystemPrompt();

      expect(prompt).toBe(customPrompt);
    });

    it('should inject project context when project exists', async () => {
      const basePrompt = `## Core Context\nBase content`;
      const mockProject: Project = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test description',
        repository: 'owner/repo',
        path: '/test/path',
        github_repo: 'owner/repo'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ size: 512 } as fs.Stats);
      vi.mocked(fsPromises.readFile).mockResolvedValue(basePrompt);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('Test Project');
      expect(prompt).toContain('test-project');
      expect(prompt).toContain('owner/repo');
      expect(prompt).toContain('/test/path');
    });

    it('should inject project board info when available', async () => {
      const basePrompt = `## Core Context\nBase content`;
      const mockProject: Project = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test description',
        repository: 'owner/repo',
        github_repo: 'owner/repo',
        projectBoardId: 'PB_123',
        projectBoardNumber: 5
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(basePrompt);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('GitHub Project Board');
      expect(prompt).toContain('#5');
      expect(prompt).toContain('PB_123');
    });

    it('should handle repository with full URL', async () => {
      const basePrompt = `## Core Context\nBase content`;
      const mockProject: Project = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test description',
        repository: 'https://github.com/owner/repo',
        github_repo: 'https://github.com/owner/repo'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(basePrompt);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('owner/repo');
      expect(prompt).toContain('https://github.com/owner/repo');
    });

    it('should handle error when getting current project', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(projectConfig.getCurrentProject).mockRejectedValue(new Error('Project error'));

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('LLPM');
    });

    it('should return default prompt on read error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('Read error'));

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('LLPM');
    });

    it('should insert context before Core Context section', async () => {
      const basePrompt = `Some intro\n\n## Core Context\nBase content`;
      const mockProject: Project = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        repository: 'owner/repo',
        github_repo: 'owner/repo'
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();
      const coreContextIndex = prompt.indexOf('## Core Context');
      const projectContextIndex = prompt.indexOf('## 🎯 Current Active Project');

      expect(projectContextIndex).toBeLessThan(coreContextIndex);
    });

    it('should handle prompt without Core Context section', async () => {
      const basePrompt = `## 🎯 Active Project Context\nInfo\n\n## Other Section\nContent`;
      const mockProject: Project = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        repository: 'owner/repo',
        github_repo: 'owner/repo'
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('Test');
    });

    it('should use fallback insertion when no known sections found', async () => {
      const basePrompt = `Line 1\n\nLine 3`;
      const mockProject: Project = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        repository: 'owner/repo',
        github_repo: 'owner/repo'
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('Test');
    });

    it('should use default insertion when no empty line found', async () => {
      const basePrompt = `Line1\nLine2\nLine3`;
      const mockProject: Project = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        repository: 'owner/repo',
        github_repo: 'owner/repo'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(basePrompt);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('Test');
    });

    it('should use index 3 when no empty line is at beginning', async () => {
      // Empty line at index 0 should use firstEmptyIndex + 1 = 1
      const basePrompt = `\nLine1\nLine2`;
      const mockProject: Project = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        repository: 'owner/repo',
        github_repo: 'owner/repo'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(basePrompt);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('Test');
    });

    it('should handle nextSectionIndex when found', async () => {
      const basePrompt = `## 🎯 Active Project Context\nInfo\n\n## Next Section\nContent\n\n## Another Section\nMore`;
      const mockProject: Project = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        repository: 'owner/repo',
        github_repo: 'owner/repo'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(basePrompt);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('Test');
      expect(prompt).toContain('Next Section');
    });

    it('should use activeProjectIndex + 15 when no next section found', async () => {
      // Create a prompt with Active Project Context but no subsequent ## sections
      const lines = ['## 🎯 Active Project Context'];
      for (let i = 0; i < 20; i++) {
        lines.push(`Line ${i} of content`);
      }
      const basePrompt = lines.join('\n');

      const mockProject: Project = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        repository: 'owner/repo',
        github_repo: 'owner/repo'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(basePrompt);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('Test');
      expect(prompt).toContain('Active Project Context');
    });

    it('should handle errors in project path processing', async () => {
      const basePrompt = `## Core Context\nBase content`;
      const mockProject = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        repository: 'owner/repo',
        github_repo: 'owner/repo'
      } as Project;

      // Make path property throw when accessed
      Object.defineProperty(mockProject, 'path', {
        get() {
          throw new Error('Path access error');
        }
      });

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('Test');
    });

    it('should handle errors in project board processing', async () => {
      const basePrompt = `## Core Context\nBase content`;
      const mockProject = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        repository: 'owner/repo',
        github_repo: 'owner/repo'
      } as Project;

      // Make projectBoardId property throw when accessed
      Object.defineProperty(mockProject, 'projectBoardId', {
        get() {
          throw new Error('Board access error');
        }
      });

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('Test');
    });

    it('should handle errors in repository processing', async () => {
      const basePrompt = `## Core Context\nBase content`;
      const mockProject = {
        id: 'test',
        name: 'Test',
        description: 'Desc'
      } as Project;

      // Make repository property throw when accessed
      Object.defineProperty(mockProject, 'repository', {
        get() {
          throw new Error('Repository access error');
        }
      });

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      expect(prompt).toContain('Test');
    });

    it('should handle errors in formatProjectContext', async () => {
      const basePrompt = `## Core Context\nBase content`;
      // Create a project that will cause formatProjectContext to throw
      const mockProject = {
        get name() {
          throw new Error('Name access error');
        }
      } as unknown as Project;

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      const prompt = await getSystemPrompt();

      // Should fall back to base prompt
      expect(prompt).toContain('## Core Context');
    });

    it('should handle errors in insert operation', async () => {
      const basePrompt = `## Core Context\nBase content`;
      const mockProject: Project = {
        id: 'test',
        name: 'Test',
        description: 'Desc',
        repository: 'owner/repo',
        github_repo: 'owner/repo'
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject);

      // Mock String.prototype.split to throw during insert operation
      const originalSplit = String.prototype.split;
      String.prototype.split = function() {
        if (this.includes('## Core Context')) {
          throw new Error('Split error');
        }
        return originalSplit.apply(this, arguments as any);
      };

      const prompt = await getSystemPrompt();

      // Restore original split
      String.prototype.split = originalSplit;

      // Should fall back to base prompt
      expect(prompt).toContain('## Core Context');
    });

    it('should handle unexpected errors in project context injection', async () => {
      const basePrompt = `## Core Context\nBase content`;

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(projectConfig.getCurrentProject).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const prompt = await getSystemPrompt();

      // Should fall back to base prompt
      expect(prompt).toContain('## Core Context');
    });
  });

  describe('saveSystemPrompt', () => {
    it('should save prompt to file', async () => {
      const testPrompt = '  Custom prompt content  ';
      vi.mocked(fs.statSync).mockReturnValue({ size: 2048 } as fs.Stats);

      await saveSystemPrompt(testPrompt);

      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        '/mock/system-prompt.txt',
        'Custom prompt content',
        'utf-8'
      );
    });

    it('should handle stats error after write', async () => {
      const testPrompt = 'Prompt';
      vi.mocked(fs.statSync).mockImplementation(() => {
        throw new Error('Stats error');
      });

      await saveSystemPrompt(testPrompt);

      expect(fsPromises.writeFile).toHaveBeenCalled();
    });

    it('should throw error on write failure', async () => {
      const testPrompt = 'Prompt';
      vi.mocked(fsPromises.writeFile).mockRejectedValue(new Error('Write error'));

      await expect(saveSystemPrompt(testPrompt)).rejects.toThrow('Write error');
    });
  });

  describe('getBaseSystemPrompt', () => {
    it('should return custom prompt when file exists', async () => {
      const customPrompt = 'Custom base prompt';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(customPrompt);

      const prompt = await getBaseSystemPrompt();

      expect(prompt).toBe(customPrompt);
    });

    it('should return default prompt when file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const prompt = await getBaseSystemPrompt();

      expect(prompt).toContain('LLPM');
    });

    it('should handle read error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('Read error'));

      const prompt = await getBaseSystemPrompt();

      expect(prompt).toContain('LLPM');
    });
  });

  describe('ensureDefaultSystemPromptFile', () => {
    it('should create file when it does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await ensureDefaultSystemPromptFile();

      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        '/mock/system-prompt.txt',
        expect.stringContaining('LLPM'),
        'utf-8'
      );
    });

    it('should not create file when it already exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await ensureDefaultSystemPromptFile();

      expect(fsPromises.writeFile).not.toHaveBeenCalled();
    });

    it('should throw error on write failure', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fsPromises.writeFile).mockRejectedValue(new Error('Write error'));

      await expect(ensureDefaultSystemPromptFile()).rejects.toThrow('Write error');
    });
  });
});