/* eslint-disable @typescript-eslint/no-unused-vars */
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
import type { Skill } from '../types/skills';

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

// Mock SkillRegistry
const mockSkills: Skill[] = [];
const mockSkillRegistry = {
  getAllSkills: vi.fn(() => mockSkills)
};

vi.mock('../services/SkillRegistry', () => ({
  getSkillRegistry: vi.fn(() => mockSkillRegistry)
}));

describe('systemPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSkills.length = 0; // Clear mock skills array
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
      const __basePrompt = `Some intro\n\n## Core Context\nBase content`;
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
      const __basePrompt = `## 🎯 Active Project Context\nInfo\n\n## Other Section\nContent`;
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
      const __basePrompt = `Line 1\n\nLine 3`;
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
      const __basePrompt = `## Core Context\nBase content`;
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
      const __basePrompt = `## Core Context\nBase content`;
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
      const __basePrompt = `## Core Context\nBase content`;
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
      const __basePrompt = `## Core Context\nBase content`;
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
      const __basePrompt = `## Core Context\nBase content`;
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
      String.prototype.split = function () {
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
      const __basePrompt = `## Core Context\nBase content`;

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

  describe('Skills Injection', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);
    });

    it('should inject all enabled skills with instructions into system prompt', async () => {
      // Create 5 mock skills all with instructions
      const skills: Skill[] = [
        {
          name: 'mermaid-diagrams',
          description: 'Create Mermaid diagrams',
          instructions:
            'When creating flowcharts, sequence diagrams, or any visual diagrams in markdown',
          content: 'Skill content',
          source: 'project',
          path: '/path/to/skill',
          enabled: true
        },
        {
          name: 'stakeholder-updates',
          description: 'Craft stakeholder communications',
          instructions:
            'When writing status updates, communicating delays, or sharing launch announcements',
          content: 'Skill content',
          source: 'project',
          path: '/path/to/skill',
          enabled: true
        },
        {
          name: 'user-story-template',
          description: 'Write user stories',
          instructions:
            'When creating new features, writing GitHub issues, or documenting user requirements',
          content: 'Skill content',
          source: 'project',
          path: '/path/to/skill',
          enabled: true
        },
        {
          name: 'brainstorming',
          description: 'Brainstorm ideas',
          instructions: 'When asked to brainstorm, or to help design anything',
          content: 'Skill content',
          source: 'personal',
          path: '/path/to/skill',
          enabled: true
        },
        {
          name: 'writing-clearly-and-concisely',
          description: 'Write clear prose',
          instructions:
            'When asked to write a longer text or document, or when asked to review or edit text',
          content: 'Skill content',
          source: 'personal',
          path: '/path/to/skill',
          enabled: true
        }
      ];

      // Add all skills to mock
      mockSkills.push(...skills);

      const prompt = await getSystemPrompt();

      // Verify Skills section exists
      expect(prompt).toContain('<Skills>');
      expect(prompt).toContain('## Available Skills');
      expect(prompt).toContain('</Skills>');

      // Verify all 5 skills are listed
      expect(prompt).toContain(
        'When creating flowcharts, sequence diagrams, or any visual diagrams in markdown load the `mermaid-diagrams` skill'
      );
      expect(prompt).toContain(
        'When writing status updates, communicating delays, or sharing launch announcements load the `stakeholder-updates` skill'
      );
      expect(prompt).toContain(
        'When creating new features, writing GitHub issues, or documenting user requirements load the `user-story-template` skill'
      );
      expect(prompt).toContain(
        'When asked to brainstorm, or to help design anything load the `brainstorming` skill'
      );
      expect(prompt).toContain(
        'When asked to write a longer text or document, or when asked to review or edit text load the `writing-clearly-and-concisely` skill'
      );
    });

    it('should not inject skills without instructions', async () => {
      const skills: Skill[] = [
        {
          name: 'skill-with-instructions',
          description: 'Has instructions',
          instructions: 'When doing something',
          content: 'Content',
          source: 'project',
          path: '/path',
          enabled: true
        },
        {
          name: 'skill-without-instructions',
          description: 'No instructions',
          // No instructions field
          content: 'Content',
          source: 'project',
          path: '/path',
          enabled: true
        }
      ];

      mockSkills.push(...skills);

      const prompt = await getSystemPrompt();

      // Should include skill with instructions
      expect(prompt).toContain('skill-with-instructions');

      // Should NOT include skill without instructions
      expect(prompt).not.toContain('skill-without-instructions');
    });

    it('should not inject disabled skills', async () => {
      const skills: Skill[] = [
        {
          name: 'enabled-skill',
          description: 'Enabled',
          instructions: 'When enabled',
          content: 'Content',
          source: 'project',
          path: '/path',
          enabled: true
        },
        {
          name: 'disabled-skill',
          description: 'Disabled',
          instructions: 'When disabled',
          content: 'Content',
          source: 'project',
          path: '/path',
          enabled: false // Disabled
        }
      ];

      mockSkills.push(...skills);

      const prompt = await getSystemPrompt();

      // Should include enabled skill
      expect(prompt).toContain('enabled-skill');

      // Should NOT include disabled skill
      expect(prompt).not.toContain('disabled-skill');
    });

    it('should not inject skills section when no skills have instructions', async () => {
      const skills: Skill[] = [
        {
          name: 'skill-1',
          description: 'Skill 1',
          // No instructions
          content: 'Content',
          source: 'project',
          path: '/path',
          enabled: true
        },
        {
          name: 'skill-2',
          description: 'Skill 2',
          // No instructions
          content: 'Content',
          source: 'project',
          path: '/path',
          enabled: true
        }
      ];

      mockSkills.push(...skills);

      const prompt = await getSystemPrompt();

      // Should NOT include Skills section at all
      expect(prompt).not.toContain('<Skills>');
      expect(prompt).not.toContain('## Available Skills');
    });

    it('should insert skills section after </Tools> tag', async () => {
      const skills: Skill[] = [
        {
          name: 'test-skill',
          description: 'Test',
          instructions: 'When testing',
          content: 'Content',
          source: 'project',
          path: '/path',
          enabled: true
        }
      ];

      mockSkills.push(...skills);

      const prompt = await getSystemPrompt();

      // Find positions of key sections
      const toolsEndPos = prompt.indexOf('</Tools>');
      const skillsStartPos = prompt.indexOf('<Skills>');
      const responsesStartPos = prompt.indexOf('<Responses>');

      // Verify order: </Tools> -> <Skills> -> <Responses>
      expect(toolsEndPos).toBeGreaterThan(-1);
      expect(skillsStartPos).toBeGreaterThan(toolsEndPos);
      expect(responsesStartPos).toBeGreaterThan(skillsStartPos);
    });
  });
});
