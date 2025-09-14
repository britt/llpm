import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSystemPrompt } from './systemPrompt';
import * as projectConfig from './projectConfig';
import type { Project } from '../types/project';

// Mock the projectConfig module
vi.mock('./projectConfig', () => ({
  getCurrentProject: vi.fn()
}));

// Mock fs/promises
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn()
  };
});

// Mock fs
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    existsSync: vi.fn(() => false)
  };
});

describe('System Prompt Project Context', () => {
  const mockProject1: Project = {
    id: 'project-1',
    name: 'Test Project 1',
    repository: 'https://github.com/user/project1',
    github_repo: 'user/project1',
    path: '/path/to/project1',
    description: 'First test project',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const mockProject2: Project = {
    id: 'project-2',
    name: 'Test Project 2',
    repository: 'https://github.com/user/project2',
    github_repo: 'user/project2',
    path: '/path/to/project2',
    description: 'Second test project',
    projectBoardId: 'board-123',
    projectBoardNumber: 5,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should inject project context when a project is active', async () => {
    vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject1);

    const prompt = await getSystemPrompt();

    expect(prompt).toContain('## 🎯 Current Active Project: Test Project 1');
    expect(prompt).toContain('**ID**: project-1');
    expect(prompt).toContain('**Description**: First test project');
    expect(prompt).toContain('**GitHub Repository**: user/project1');
    expect(prompt).toContain('**Repository URL**: https://github.com/user/project1');
    expect(prompt).toContain('**Local Path**: /path/to/project1');
  });

  it('should include project board information when available', async () => {
    vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject2);

    const prompt = await getSystemPrompt();

    expect(prompt).toContain('## 🎯 Current Active Project: Test Project 2');
    expect(prompt).toContain('**GitHub Project Board**: #5 (board-123)');
  });

  it('should not inject project context when no project is active', async () => {
    vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

    const prompt = await getSystemPrompt();

    expect(prompt).not.toContain('## 🎯 Current Active Project:');
    expect(prompt).toContain('## 🎯 Active Project Context'); // Should still have the section description
  });

  it('should update project context when switching projects', async () => {
    // First project
    vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject1);
    let prompt = await getSystemPrompt();
    expect(prompt).toContain('Test Project 1');
    expect(prompt).not.toContain('Test Project 2');

    // Switch to second project
    vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject2);
    prompt = await getSystemPrompt();
    expect(prompt).toContain('Test Project 2');
    expect(prompt).not.toContain('Test Project 1');

    // Switch back to first project
    vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject1);
    prompt = await getSystemPrompt();
    expect(prompt).toContain('Test Project 1');
    expect(prompt).not.toContain('Test Project 2');
  });

  it('should handle missing repository gracefully', async () => {
    const projectWithoutRepo: Project = {
      ...mockProject1,
      repository: '',
      github_repo: undefined
    };
    vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(projectWithoutRepo);

    const prompt = await getSystemPrompt();
    
    expect(prompt).toContain('## 🎯 Current Active Project: Test Project 1');
    expect(prompt).not.toContain('**GitHub Repository**');
    expect(prompt).not.toContain('**Repository URL**');
  });

  it('should handle missing description gracefully', async () => {
    const projectWithoutDesc: Project = {
      ...mockProject1,
      description: undefined
    };
    vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(projectWithoutDesc);

    const prompt = await getSystemPrompt();
    
    expect(prompt).toContain('## 🎯 Current Active Project: Test Project 1');
    expect(prompt).toContain('**Description**: No description provided');
  });

  it('should handle errors in getCurrentProject gracefully', async () => {
    vi.mocked(projectConfig.getCurrentProject).mockRejectedValue(new Error('Failed to get project'));

    const prompt = await getSystemPrompt();
    
    // Should still return a valid prompt without project context
    expect(prompt).toContain('## 🎯 Active Project Context');
    expect(prompt).not.toContain('## 🎯 Current Active Project:');
  });
});