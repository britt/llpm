import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GapAnalyzer } from './gapAnalyzer';
import type { Question } from '../types/questions';
import type { GitHubIssue, GitHubIssueComment } from './github';

// Mock dependencies
vi.mock('../utils/projectConfig', () => ({
  getCurrentProject: vi.fn(),
}));

vi.mock('./projectScanBackend', () => ({
  loadProjectScan: vi.fn(),
}));

vi.mock('./github', () => ({
  listIssues: vi.fn(),
  getIssueWithComments: vi.fn(),
}));

vi.mock('./notesBackend', () => ({
  getNotesBackend: vi.fn(),
}));

describe('GapAnalyzer', () => {
  let analyzer: GapAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new GapAnalyzer();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(analyzer).toBeInstanceOf(GapAnalyzer);
    });
  });

  describe('analyzeIssue', () => {
    it('should return questions for issue with missing acceptance criteria', async () => {
      const mockIssue: GitHubIssue = {
        id: 1,
        node_id: 'node_1',
        number: 42,
        title: 'Add feature X',
        body: 'We should add feature X.',
        state: 'open',
        labels: [],
        user: { login: 'author', html_url: 'https://github.com/author' },
        html_url: 'https://github.com/owner/repo/issues/42',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const result = await analyzer.analyzeIssue(mockIssue, []);

      expect(result.questions.length).toBeGreaterThan(0);
      expect(result.questions.some(q => q.category === 'requirements')).toBe(true);
    });

    it('should detect missing labels', async () => {
      const mockIssue: GitHubIssue = {
        id: 2,
        node_id: 'node_2',
        number: 43,
        title: 'Bug: Something is broken',
        body: '## Description\nSomething is broken.\n\n## Acceptance Criteria\n- [ ] It should work',
        state: 'open',
        labels: [],
        user: { login: 'author', html_url: 'https://github.com/author' },
        html_url: 'https://github.com/owner/repo/issues/43',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const result = await analyzer.analyzeIssue(mockIssue, []);

      expect(result.questions.some(q =>
        q.question.toLowerCase().includes('label')
      )).toBe(true);
    });

    it('should return empty array when issue has all information', async () => {
      // Use a recent date to avoid stale issue detection
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5); // 5 days ago

      const mockIssue: GitHubIssue = {
        id: 3,
        node_id: 'node_3',
        number: 44,
        title: 'Well documented feature',
        body: `## Description
This is a detailed description of the feature we need to implement. It covers all the necessary background and context.

## Acceptance Criteria
- [ ] Feature X works correctly
- [ ] Tests are passing
- [ ] Documentation is updated

## Technical Notes
Some technical details here.`,
        state: 'open',
        labels: [{ name: 'enhancement', color: 'blue' }],
        user: { login: 'author', html_url: 'https://github.com/author' },
        html_url: 'https://github.com/owner/repo/issues/44',
        created_at: recentDate.toISOString(),
        updated_at: recentDate.toISOString(),
        assignee: { login: 'someone', html_url: 'https://github.com/someone' },
      };

      const result = await analyzer.analyzeIssue(mockIssue, []);

      expect(result.questions.length).toBe(0);
    });

    it('should detect missing assignee on open issues', async () => {
      const mockIssue: GitHubIssue = {
        id: 4,
        node_id: 'node_4',
        number: 45,
        title: 'Feature request',
        body: '## Description\nAdd a feature.\n\n## Acceptance Criteria\n- [ ] Works',
        state: 'open',
        labels: [{ name: 'enhancement', color: 'blue' }],
        user: { login: 'author', html_url: 'https://github.com/author' },
        html_url: 'https://github.com/owner/repo/issues/45',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        assignee: null,
      };

      const result = await analyzer.analyzeIssue(mockIssue, []);

      expect(result.questions.some(q =>
        q.question.toLowerCase().includes('assign')
      )).toBe(true);
    });

    it('should detect stale issues (30+ days)', async () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const mockIssue: GitHubIssue = {
        id: 5,
        node_id: 'node_5',
        number: 46,
        title: 'Old issue',
        body: '## Description\nAn old issue.\n\n## Acceptance Criteria\n- [ ] Works',
        state: 'open',
        labels: [{ name: 'bug', color: 'red' }],
        user: { login: 'author', html_url: 'https://github.com/author' },
        html_url: 'https://github.com/owner/repo/issues/46',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: thirtyOneDaysAgo.toISOString(),
        assignee: { login: 'someone', html_url: 'https://github.com/someone' },
      };

      const result = await analyzer.analyzeIssue(mockIssue, []);

      expect(result.questions.some(q =>
        q.question.toLowerCase().includes('still relevant')
      )).toBe(true);
    });

    it('should detect unanswered questions in comments', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);

      const mockIssue: GitHubIssue = {
        id: 6,
        node_id: 'node_6',
        number: 47,
        title: 'Feature with questions',
        body: `## Description
This is a detailed feature request with clear requirements and context.

## Acceptance Criteria
- [ ] Feature works correctly
- [ ] Tests are passing`,
        state: 'open',
        labels: [{ name: 'enhancement', color: 'blue' }],
        user: { login: 'author', html_url: 'https://github.com/author' },
        html_url: 'https://github.com/owner/repo/issues/47',
        created_at: recentDate.toISOString(),
        updated_at: recentDate.toISOString(),
        assignee: { login: 'someone', html_url: 'https://github.com/someone' },
      };

      const commentsWithQuestions: GitHubIssueComment[] = [
        {
          id: 1,
          node_id: 'comment_1',
          body: 'What database should we use for this feature?',
          user: { login: 'developer', html_url: 'https://github.com/developer' },
          html_url: 'https://github.com/owner/repo/issues/47#issuecomment-1',
          created_at: recentDate.toISOString(),
          updated_at: recentDate.toISOString(),
        },
        {
          id: 2,
          node_id: 'comment_2',
          body: 'Should this work on mobile devices?',
          user: { login: 'reviewer', html_url: 'https://github.com/reviewer' },
          html_url: 'https://github.com/owner/repo/issues/47#issuecomment-2',
          created_at: recentDate.toISOString(),
          updated_at: recentDate.toISOString(),
        },
      ];

      const result = await analyzer.analyzeIssue(mockIssue, commentsWithQuestions);

      // Should detect unanswered questions in comments
      expect(result.questions.some(q =>
        q.question.toLowerCase().includes('unanswered') ||
        q.context.toLowerCase().includes('question')
      )).toBe(true);
    });

    it('should not flag comments without questions', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);

      const mockIssue: GitHubIssue = {
        id: 7,
        node_id: 'node_7',
        number: 48,
        title: 'Feature with resolved discussion',
        body: `## Description
This is a detailed feature request with clear requirements and context.

## Acceptance Criteria
- [ ] Feature works correctly
- [ ] Tests are passing`,
        state: 'open',
        labels: [{ name: 'enhancement', color: 'blue' }],
        user: { login: 'author', html_url: 'https://github.com/author' },
        html_url: 'https://github.com/owner/repo/issues/48',
        created_at: recentDate.toISOString(),
        updated_at: recentDate.toISOString(),
        assignee: { login: 'someone', html_url: 'https://github.com/someone' },
      };

      const commentsWithoutQuestions: GitHubIssueComment[] = [
        {
          id: 1,
          node_id: 'comment_1',
          body: 'Great idea! I think this will improve the user experience.',
          user: { login: 'developer', html_url: 'https://github.com/developer' },
          html_url: 'https://github.com/owner/repo/issues/48#issuecomment-1',
          created_at: recentDate.toISOString(),
          updated_at: recentDate.toISOString(),
        },
        {
          id: 2,
          node_id: 'comment_2',
          body: 'LGTM, ready to implement.',
          user: { login: 'reviewer', html_url: 'https://github.com/reviewer' },
          html_url: 'https://github.com/owner/repo/issues/48#issuecomment-2',
          created_at: recentDate.toISOString(),
          updated_at: recentDate.toISOString(),
        },
      ];

      const result = await analyzer.analyzeIssue(mockIssue, commentsWithoutQuestions);

      // Should not flag issues with non-question comments
      expect(result.questions.some(q =>
        q.question.toLowerCase().includes('unanswered')
      )).toBe(false);
    });
  });

  describe('checkAcceptanceCriteria', () => {
    it('should return true when acceptance criteria present', () => {
      const body = '## Description\nDo X\n\n## Acceptance Criteria\n- [ ] Thing works';
      expect(analyzer.checkAcceptanceCriteria(body)).toBe(true);
    });

    it('should return false when acceptance criteria missing', () => {
      const body = 'Just do the thing please';
      expect(analyzer.checkAcceptanceCriteria(body)).toBe(false);
    });

    it('should detect alternative acceptance criteria formats', () => {
      expect(analyzer.checkAcceptanceCriteria('**AC:**\n- works')).toBe(true);
      expect(analyzer.checkAcceptanceCriteria('Done when:\n- works')).toBe(true);
      expect(analyzer.checkAcceptanceCriteria('Definition of Done\n- works')).toBe(true);
    });

    it('should detect acceptance criteria via checkboxes', () => {
      expect(analyzer.checkAcceptanceCriteria('- [ ] Item 1\n- [x] Item 2')).toBe(true);
      expect(analyzer.checkAcceptanceCriteria('* [ ] Task')).toBe(true);
      expect(analyzer.checkAcceptanceCriteria('No checkboxes here')).toBe(false);
    });

    it('should handle null body', () => {
      expect(analyzer.checkAcceptanceCriteria(null)).toBe(false);
    });
  });

  describe('checkVagueDescription', () => {
    it('should flag very short descriptions', () => {
      expect(analyzer.checkVagueDescription('Fix it')).toBe(true);
      expect(analyzer.checkVagueDescription('Bug')).toBe(true);
    });

    it('should not flag detailed descriptions', () => {
      const detailed = `
        ## Problem
        When the user clicks the submit button, the form data is not being validated
        before sending to the server. This causes 500 errors when required fields are missing.

        ## Expected Behavior
        The form should validate all required fields client-side before submission.
      `;
      expect(analyzer.checkVagueDescription(detailed)).toBe(false);
    });

    it('should handle null body', () => {
      expect(analyzer.checkVagueDescription(null)).toBe(true);
    });

    it('should flag descriptions with vague words like "maybe", "might", "unclear"', () => {
      const vagueWithMaybe = 'This feature should maybe add a new button to the dashboard. The implementation details are provided below with specific requirements and acceptance criteria for the team.';
      const vagueWithMight = 'We might need to update the API endpoint. The current implementation has specific issues that need to be addressed according to the requirements document.';
      const vagueWithUnclear = 'The requirements are unclear but we should proceed anyway. Here are some detailed steps for the implementation that the team should follow carefully.';
      const vagueWithPossibly = 'This could possibly fix the bug in the login flow. The detailed analysis shows multiple potential causes that need investigation by the team.';
      const vagueWithProbably = 'We should probably refactor this module at some point. The current codebase has specific technical debt issues documented in the architecture notes.';

      expect(analyzer.checkVagueDescription(vagueWithMaybe)).toBe(true);
      expect(analyzer.checkVagueDescription(vagueWithMight)).toBe(true);
      expect(analyzer.checkVagueDescription(vagueWithUnclear)).toBe(true);
      expect(analyzer.checkVagueDescription(vagueWithPossibly)).toBe(true);
      expect(analyzer.checkVagueDescription(vagueWithProbably)).toBe(true);
    });

    it('should not flag descriptions that are detailed without vague language', () => {
      const clearDescription = `
        ## Problem
        The login form submits data without client-side validation. This results in
        unnecessary server requests and poor user experience when fields are empty.

        ## Solution
        Add client-side validation using the existing form validation library.

        ## Acceptance Criteria
        - Email field validates format on blur
        - Password field requires minimum 8 characters
        - Submit button disabled until form is valid
      `;
      expect(analyzer.checkVagueDescription(clearDescription)).toBe(false);
    });
  });

  describe('prioritizeQuestions', () => {
    it('should sort questions by priority (high first)', () => {
      const questions: Question[] = [
        { id: '1', category: 'process', priority: 'low', question: 'Q1', context: 'C1', source: { type: 'issue', reference: '#1' } },
        { id: '2', category: 'requirements', priority: 'high', question: 'Q2', context: 'C2', source: { type: 'issue', reference: '#2' } },
        { id: '3', category: 'documentation', priority: 'medium', question: 'Q3', context: 'C3', source: { type: 'issue', reference: '#3' } },
      ];

      const sorted = analyzer.prioritizeQuestions(questions);

      expect(sorted[0].priority).toBe('high');
      expect(sorted[1].priority).toBe('medium');
      expect(sorted[2].priority).toBe('low');
    });

    it('should handle empty array', () => {
      const sorted = analyzer.prioritizeQuestions([]);
      expect(sorted).toEqual([]);
    });
  });

  describe('analyzeProjectContext', () => {
    it('should suggest running project scan when not available', async () => {
      const { getCurrentProject } = await import('../utils/projectConfig');
      const { loadProjectScan } = await import('./projectScanBackend');

      vi.mocked(getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        path: '/path/to/project',
        github_repo: 'owner/repo',
      });
      vi.mocked(loadProjectScan).mockResolvedValue(null);

      const result = await analyzer.analyzeProjectContext();

      expect(result.projectScanAvailable).toBe(false);
      expect(result.questions.some(q =>
        q.question.toLowerCase().includes('project scan') ||
        q.suggestedAction?.toLowerCase().includes('scan')
      )).toBe(true);
    });

    it('should analyze architecture when project scan available', async () => {
      const { getCurrentProject } = await import('../utils/projectConfig');
      const { loadProjectScan } = await import('./projectScanBackend');

      vi.mocked(getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        path: '/path/to/project',
        github_repo: 'owner/repo',
      });
      vi.mocked(loadProjectScan).mockResolvedValue({
        version: '1.0.0',
        scannedAt: '2025-01-01T00:00:00Z',
        projectId: 'test-project',
        projectName: 'Test Project',
        projectPath: '/path/to/project',
        overview: {
          summary: '',
          primaryLanguages: ['TypeScript'],
          frameworks: [],
          projectType: 'cli',
          totalFiles: 100,
          totalLines: 5000,
          totalSize: 250000,
        },
        directoryStructure: [],
        keyFiles: [
          { path: 'src/index.ts', reason: 'Entry point', category: 'entry-point' },
        ],
        documentation: {
          hasDocumentation: false,
          docFiles: [],
          inlineDocsCoverage: 'none',
        },
        dependencies: {
          packageManager: 'bun',
          runtime: [],
          development: [],
        },
        architecture: {
          description: '',
          components: [],
        },
      });

      const result = await analyzer.analyzeProjectContext();

      expect(result.projectScanAvailable).toBe(true);
      // Should generate questions about missing docs
      expect(result.questions.some(q => q.category === 'documentation')).toBe(true);
    });

    it('should return error when no project is set', async () => {
      const { getCurrentProject } = await import('../utils/projectConfig');
      vi.mocked(getCurrentProject).mockResolvedValue(null);

      const result = await analyzer.analyzeProjectContext();

      expect(result.projectName).toBe('Unknown');
      expect(result.questions.some(q =>
        q.question.toLowerCase().includes('no active project')
      )).toBe(true);
    });
  });
});
