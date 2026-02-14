import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReadlineInterface } from '../prompts';
import type { Project } from '../../types/project';
vi.mock('../../utils/projectConfig', () => ({
  addProject: vi.fn(),
  listProjects: vi.fn().mockResolvedValue([]),
}));

import { setupFirstProject, type ProjectStepDeps } from './project';
import { addProject, listProjects } from '../../utils/projectConfig';

function createMockRl(answers: string[]): ReadlineInterface {
  let callIndex = 0;
  return {
    question: vi.fn((_prompt: string, cb: (answer: string) => void) => {
      const answer = answers[callIndex] ?? '';
      callIndex++;
      cb(answer);
    }),
    close: vi.fn(),
  };
}

const fakeProject: Project = {
  id: 'my-app-123',
  name: 'My App',
  repository: 'https://github.com/owner/my-app',
  github_repo: 'owner/my-app',
  path: '/tmp/my-app',
  description: 'A test project',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

function createDeps(pathExists: boolean | boolean[] = true): ProjectStepDeps {
  if (Array.isArray(pathExists)) {
    let callIndex = 0;
    return {
      checkPathExists: vi.fn(() => {
        const result = pathExists[callIndex] ?? true;
        callIndex++;
        return result;
      }),
    };
  }
  return {
    checkPathExists: vi.fn().mockReturnValue(pathExists),
  };
}

describe('project step', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(addProject).mockResolvedValue(fakeProject);
    vi.mocked(listProjects).mockResolvedValue([]);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should create a project with provided details', async () => {
    const rl = createMockRl(['My App', 'owner/my-app', '/tmp/my-app', 'A test project']);
    const result = await setupFirstProject(rl, false, createDeps(true));

    expect(result.success).toBe(true);
    expect(addProject).toHaveBeenCalledWith(expect.objectContaining({
      name: 'My App',
      repository: 'owner/my-app',
      path: '/tmp/my-app',
      description: 'A test project',
    }));
  });

  it('should create a project with empty description', async () => {
    const rl = createMockRl(['My App', 'owner/my-app', '/tmp/my-app', '']);
    const result = await setupFirstProject(rl, false, createDeps(true));

    expect(result.success).toBe(true);
    expect(addProject).toHaveBeenCalledWith(expect.objectContaining({
      name: 'My App',
      description: undefined,
    }));
  });

  it('should re-prompt when name is empty', async () => {
    const rl = createMockRl(['', 'My App', 'owner/my-app', '/tmp/my-app', '']);
    const result = await setupFirstProject(rl, false, createDeps(true));

    expect(result.success).toBe(true);
    expect(addProject).toHaveBeenCalledWith(expect.objectContaining({
      name: 'My App',
    }));
  });

  it('should re-prompt when repo is empty', async () => {
    const rl = createMockRl(['My App', '', 'owner/my-app', '/tmp/my-app', '']);
    const result = await setupFirstProject(rl, false, createDeps(true));

    expect(result.success).toBe(true);
    expect(addProject).toHaveBeenCalledWith(expect.objectContaining({
      repository: 'owner/my-app',
    }));
  });

  it('should re-prompt when path does not exist', async () => {
    const rl = createMockRl(['My App', 'owner/my-app', '/bad/path', '/good/path', '']);
    const result = await setupFirstProject(rl, false, createDeps([false, true]));

    expect(result.success).toBe(true);
    expect(addProject).toHaveBeenCalledWith(expect.objectContaining({
      path: '/good/path',
    }));
  });

  it('should skip if projects exist and force is false', async () => {
    vi.mocked(listProjects).mockResolvedValue([fakeProject]);

    const rl = createMockRl(['n']);
    const result = await setupFirstProject(rl, false, createDeps(true));

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(addProject).not.toHaveBeenCalled();
  });

  it('should create project when force is true even if projects exist', async () => {
    vi.mocked(listProjects).mockResolvedValue([fakeProject]);

    const rl = createMockRl(['New App', 'owner/new-app', '/tmp/new-app', '']);
    const result = await setupFirstProject(rl, true, createDeps(true));

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(addProject).toHaveBeenCalled();
  });
});
