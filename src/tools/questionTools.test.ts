import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateProjectQuestionsTool,
  generateIssueQuestionsTool,
  identifyInformationGapsTool,
  suggestClarificationsTool,
} from './questionTools';
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
      repository: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
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
      repository: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    });
    vi.mocked(loadProjectScan).mockResolvedValue(null);
    vi.mocked(listIssues).mockResolvedValue([
      {
        number: 1,
        title: 'Test Issue',
        body: 'Short',
        state: 'open',
        labels: [],
        user: { login: 'test', html_url: 'https://github.com/test' },
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
      repository: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    });
    vi.mocked(loadProjectScan).mockResolvedValue(null);
    vi.mocked(listIssues).mockResolvedValue([
      {
        number: 1,
        title: 'Test Issue',
        body: 'Short',
        state: 'open',
        labels: [],
        user: { login: 'test', html_url: 'https://github.com/test' },
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
      repository: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
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
      repository: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
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
      repository: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    });
    vi.mocked(getIssueWithComments).mockResolvedValue({
      issue: {
        number: 42,
        title: 'Test Issue',
        body: 'Short description',
        state: 'open',
        labels: [],
        user: { login: 'test', html_url: 'https://github.com/test' },
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

describe('suggestClarificationsTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct schema definition', () => {
    expect(suggestClarificationsTool.inputSchema).toBeDefined();
  });

  it('should suggest clarifications for draft issue missing acceptance criteria', async () => {
    const result = await suggestClarificationsTool.execute({
      draft_type: 'issue',
      content: 'Fix the bug',
    });

    expect(result.success).toBe(true);
    expect(result.clarifications.length).toBeGreaterThan(0);
    expect(result.clarifications.some((c: Question) =>
      c.question.toLowerCase().includes('acceptance criteria') ||
      c.question.toLowerCase().includes('detail')
    )).toBe(true);
  });

  it('should suggest reproduction steps for bug reports', async () => {
    const result = await suggestClarificationsTool.execute({
      draft_type: 'issue',
      content: 'There is a bug when clicking the button. It crashes.',
      title: 'Bug: Button crash',
    });

    expect(result.success).toBe(true);
    expect(result.clarifications.some((c: Question) =>
      c.question.toLowerCase().includes('reproduce')
    )).toBe(true);
  });

  it('should suggest linked issue for PR drafts', async () => {
    const result = await suggestClarificationsTool.execute({
      draft_type: 'pr',
      content: 'Added new feature for user profiles.',
      title: 'Add user profiles',
    });

    expect(result.success).toBe(true);
    expect(result.clarifications.some((c: Question) =>
      c.question.toLowerCase().includes('issue')
    )).toBe(true);
  });

  it('should approve well-formed issue draft', async () => {
    const result = await suggestClarificationsTool.execute({
      draft_type: 'issue',
      content: `## Problem
The login form does not validate email format before submission.

## Expected Behavior
Email should be validated client-side with appropriate error messages.

## Acceptance Criteria
- [ ] Email format is validated on blur
- [ ] Error message shows for invalid emails
- [ ] Form cannot submit with invalid email

## Steps to Reproduce
1. Go to /login
2. Enter "invalid-email" in email field
3. Click submit
4. Observe no validation error`,
      title: 'Bug: Missing email validation on login form',
    });

    expect(result.success).toBe(true);
    // Well-formed issue should have fewer clarifications
    expect(result.clarifications.length).toBeLessThan(3);
  });
});

describe('identifyInformationGapsTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct schema definition', () => {
    expect(identifyInformationGapsTool.inputSchema).toBeDefined();
  });

  it('should return error when no project is set', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    vi.mocked(getCurrentProject).mockResolvedValue(null);

    const result = await identifyInformationGapsTool.execute({ target: 'readme' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No active project');
  });

  it('should analyze readme for gaps', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    vi.mocked(getCurrentProject).mockResolvedValue({
      id: 'test-project',
      name: 'Test Project',
      path: '/tmp/test-project-does-not-exist',
      github_repo: 'owner/repo',
      repository: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    });

    const result = await identifyInformationGapsTool.execute({ target: 'readme' });

    expect(result.success).toBe(true);
    expect(result.target).toBe('readme');
    // Should detect missing README since path doesn't exist
    expect(result.gaps.length).toBeGreaterThan(0);
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect multiple gap types from a poorly written issue', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    const { getIssueWithComments } = await import('../services/github');

    vi.mocked(getCurrentProject).mockResolvedValue({
      id: 'test-project',
      name: 'Test Project',
      path: '/path/to/project',
      github_repo: 'owner/repo',
      repository: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    });

    // Poorly written issue: vague, no acceptance criteria, no labels, stale
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 45); // 45 days ago

    vi.mocked(getIssueWithComments).mockResolvedValue({
      issue: {
        number: 99,
        title: 'Bug',
        body: 'Fix it',
        state: 'open',
        labels: [],
        user: { login: 'test', html_url: 'https://github.com/test' },
        html_url: 'https://github.com/owner/repo/issues/99',
        created_at: staleDate.toISOString(),
        updated_at: staleDate.toISOString(),
      },
      comments: [],
      pagination: { page: 1, per_page: 100, total: 0, has_next_page: false },
    });

    const result = await generateIssueQuestionsTool.execute({ issue_number: 99 });

    expect(result.success).toBe(true);
    // Should detect: missing acceptance criteria, vague description, no labels, stale
    expect(result.questions.length).toBeGreaterThanOrEqual(3);

    const categories = result.questions.map((q: Question) => q.category);
    expect(categories).toContain('requirements'); // vague/missing AC
    expect(categories).toContain('process'); // missing labels or stale
  });

  it('should not flag a well-written issue', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    const { getIssueWithComments } = await import('../services/github');

    vi.mocked(getCurrentProject).mockResolvedValue({
      id: 'test-project',
      name: 'Test Project',
      path: '/path/to/project',
      github_repo: 'owner/repo',
      repository: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    });

    // Well-written issue
    vi.mocked(getIssueWithComments).mockResolvedValue({
      issue: {
        number: 100,
        title: 'Add email validation to login form',
        body: `## Problem
The login form does not validate email format before submission.

## Expected Behavior
Email should be validated client-side with appropriate error messages.

## Acceptance Criteria
- [ ] Email format is validated on blur
- [ ] Error message shows for invalid emails
- [ ] Form cannot submit with invalid email`,
        state: 'open',
        labels: [{ name: 'enhancement' }, { name: 'frontend' }],
        assignee: { login: 'developer' },
        user: { login: 'test', html_url: 'https://github.com/test' },
        html_url: 'https://github.com/owner/repo/issues/100',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      comments: [],
      pagination: { page: 1, per_page: 100, total: 0, has_next_page: false },
    });

    const result = await generateIssueQuestionsTool.execute({ issue_number: 100 });

    expect(result.success).toBe(true);
    // Well-written issue should have minimal or no questions
    expect(result.questions.length).toBeLessThanOrEqual(1);
  });

  it('should combine project and issue analysis', async () => {
    const { getCurrentProject } = await import('../utils/projectConfig');
    const { loadProjectScan } = await import('../services/projectScanBackend');
    const { listIssues } = await import('../services/github');

    vi.mocked(getCurrentProject).mockResolvedValue({
      id: 'test-project',
      name: 'Test Project',
      path: '/path/to/project',
      github_repo: 'owner/repo',
      repository: '',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    });

    // Project scan with documentation gaps
    vi.mocked(loadProjectScan).mockResolvedValue({
      version: '1.0.0',
      scannedAt: new Date().toISOString(),
      projectId: 'test-project',
      projectName: 'Test Project',
      projectPath: '/path/to/project',
      overview: {
        summary: 'A test project',
        primaryLanguages: ['TypeScript'],
        frameworks: [],
        projectType: 'cli',
        totalFiles: 10,
        totalLines: 1000,
        totalSize: 50000,
      },
      directoryStructure: [],
      keyFiles: [
        { path: 'src/index.ts', reason: 'Entry point', category: 'entry-point' },
        { path: 'src/main.ts', reason: 'Main logic', category: 'core-logic' },
      ],
      documentation: {
        hasDocumentation: false,
        docFiles: [],
        inlineDocsCoverage: 'none',
      },
      dependencies: {
        packageManager: 'npm',
        runtime: [],
        development: [],
      },
      architecture: {
        description: '',
        components: [],
      },
    });

    // Some issues with gaps
    vi.mocked(listIssues).mockResolvedValue([
      {
        number: 1,
        title: 'Vague issue',
        body: 'stuff',
        state: 'open',
        labels: [],
        user: { login: 'test', html_url: 'https://github.com/test' },
        html_url: 'https://github.com/owner/repo/issues/1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      },
    ]);

    const result = await generateProjectQuestionsTool.execute({
      max_questions: 50,
    });

    expect(result.success).toBe(true);
    expect(result.projectScanAvailable).toBe(true);

    // Should have questions from both project scan and issues
    const categories = result.questions.map((q: Question) => q.category);
    expect(categories).toContain('documentation'); // from project scan
    expect(categories).toContain('requirements'); // from issue analysis
  });
});
