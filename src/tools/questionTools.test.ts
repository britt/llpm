import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateProjectQuestionsTool, generateIssueQuestionsTool } from './questionTools';
import type { Question } from '../types/questions';

vi.mock('../utils/projectConfig', () => ({
  getCurrentProject: vi.fn(),
}));

vi.mock('../services/projectScanBackend', () => ({
  loadProjectScan: vi.fn(),
}));

vi.mock('../services/github', () => ({
  listIssues: vi.fn(),
  getIssueWithComments: vi.fn(),
}));

describe('generateProjectQuestionsTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct schema definition', () => {
    expect(generateProjectQuestionsTool.inputSchema).toBeDefined();
  });

  it('should return error when no project is set', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    vi.mocked(getCurrentProject).mockResolvedValue(null);

    const result = await generateProjectQuestionsTool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toContain('No active project');
  });

  it('should return questions for valid project', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    const { loadProjectScan } = await import('../services/projectScanBackend');
    const { listIssues } = await import('../services/github');

    vi.mocked(getCurrentProject).mockResolvedValue({
      id: 'test-project',
      name: 'Test Project',
      path: '/path/to/project',
      github_repo: 'owner/repo',
    });
    vi.mocked(loadProjectScan).mockResolvedValue(null);
    vi.mocked(listIssues).mockResolvedValue([]);

    const result = await generateProjectQuestionsTool.execute({});

    expect(result.success).toBe(true);
    expect(result.questions).toBeDefined();
    expect(Array.isArray(result.questions)).toBe(true);
  });

  it('should filter by category when specified', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    const { loadProjectScan } = await import('../services/projectScanBackend');
    const { listIssues } = await import('../services/github');

    vi.mocked(getCurrentProject).mockResolvedValue({
      id: 'test-project',
      name: 'Test Project',
      path: '/path/to/project',
      github_repo: 'owner/repo',
    });
    vi.mocked(loadProjectScan).mockResolvedValue(null);
    vi.mocked(listIssues).mockResolvedValue([
      {
        number: 1,
        title: 'Test Issue',
        body: 'Short',
        state: 'open',
        labels: [],
        user: { login: 'test' },
        html_url: 'https://github.com/owner/repo/issues/1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      },
    ]);

    const result = await generateProjectQuestionsTool.execute({
      categories: ['requirements'],
    });

    expect(result.success).toBe(true);
    result.questions.forEach((q: Question) => {
      expect(q.category).toBe('requirements');
    });
  });

  it('should filter by min_priority when specified', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    const { loadProjectScan } = await import('../services/projectScanBackend');
    const { listIssues } = await import('../services/github');

    vi.mocked(getCurrentProject).mockResolvedValue({
      id: 'test-project',
      name: 'Test Project',
      path: '/path/to/project',
      github_repo: 'owner/repo',
    });
    vi.mocked(loadProjectScan).mockResolvedValue(null);
    vi.mocked(listIssues).mockResolvedValue([
      {
        number: 1,
        title: 'Test Issue',
        body: 'Short',
        state: 'open',
        labels: [],
        user: { login: 'test' },
        html_url: 'https://github.com/owner/repo/issues/1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      },
    ]);

    const result = await generateProjectQuestionsTool.execute({
      min_priority: 'high',
    });

    expect(result.success).toBe(true);
    result.questions.forEach((q: Question) => {
      expect(q.priority).toBe('high');
    });
  });

  it('should continue gracefully when GitHub issue analysis fails', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    const { loadProjectScan } = await import('../services/projectScanBackend');
    const { listIssues } = await import('../services/github');

    vi.mocked(getCurrentProject).mockResolvedValue({
      id: 'test-project',
      name: 'Test Project',
      path: '/path/to/project',
      github_repo: 'owner/repo',
    });
    vi.mocked(loadProjectScan).mockResolvedValue(null);
    vi.mocked(listIssues).mockRejectedValue(new Error('GitHub API error'));

    const result = await generateProjectQuestionsTool.execute({
      include_issues: true,
    });

    // Should still succeed with project context questions only
    expect(result.success).toBe(true);
    expect(result.questions).toBeDefined();
  });

  it('should handle unexpected errors gracefully', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');

    vi.mocked(getCurrentProject).mockRejectedValue(new Error('Unexpected error'));

    const result = await generateProjectQuestionsTool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to generate questions');
  });
});

describe('generateIssueQuestionsTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct schema definition', () => {
    expect(generateIssueQuestionsTool.inputSchema).toBeDefined();
  });

  it('should return error when no project is set', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    vi.mocked(getCurrentProject).mockResolvedValue(null);

    const result = await generateIssueQuestionsTool.execute({ issue_number: 42 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No active project');
  });

  it('should return error when project has no GitHub repo', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    vi.mocked(getCurrentProject).mockResolvedValue({
      id: 'test-project',
      name: 'Test Project',
      path: '/path/to/project',
      github_repo: undefined,
    });

    const result = await generateIssueQuestionsTool.execute({ issue_number: 42 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('GitHub repository');
  });

  it('should return questions for a specific issue', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    const { getIssueWithComments } = await import('../services/github');

    vi.mocked(getCurrentProject).mockResolvedValue({
      id: 'test-project',
      name: 'Test Project',
      path: '/path/to/project',
      github_repo: 'owner/repo',
    });
    vi.mocked(getIssueWithComments).mockResolvedValue({
      issue: {
        number: 42,
        title: 'Test Issue',
        body: 'Short description',
        state: 'open',
        labels: [],
        user: { login: 'test' },
        html_url: 'https://github.com/owner/repo/issues/42',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      },
      comments: [],
      pagination: { page: 1, per_page: 100, total: 0, has_next_page: false },
    });

    const result = await generateIssueQuestionsTool.execute({ issue_number: 42 });

    expect(result.success).toBe(true);
    expect(result.issueNumber).toBe(42);
    expect(result.issueTitle).toBe('Test Issue');
    expect(result.questions).toBeDefined();
    expect(result.questions.length).toBeGreaterThan(0);
  });
});
