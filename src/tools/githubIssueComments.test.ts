import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGitHubIssueWithCommentsTool } from './githubIssueTools';
import * as github from '../services/github';
import * as projectConfig from '../utils/projectConfig';

vi.mock('../services/github');
vi.mock('../utils/projectConfig');

describe('getGitHubIssueWithCommentsTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock project config
    vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
      name: 'test-project',
      github_repo: 'test-owner/test-repo',
      metadata: {}
    });
  });

  it('should have correct schema properties', () => {
    expect(getGitHubIssueWithCommentsTool.parameters).toBeDefined();
    expect(getGitHubIssueWithCommentsTool.description).toContain('issue with all its comments');
  });

  it('should validate required parameters', () => {
    const validResult = getGitHubIssueWithCommentsTool.parameters.safeParse({
      issueNumber: 123
    });
    expect(validResult.success).toBe(true);
  });

  it('should validate optional parameters', () => {
    const validResult = getGitHubIssueWithCommentsTool.parameters.safeParse({
      issueNumber: 123,
      includeComments: false,
      commentsPerPage: 50,
      page: 2
    });
    expect(validResult.success).toBe(true);
  });

  it('should reject invalid issue number', () => {
    const invalidResult = getGitHubIssueWithCommentsTool.parameters.safeParse({
      issueNumber: 'not-a-number'
    });
    expect(invalidResult.success).toBe(false);
  });

  it('should fetch issue with comments successfully', async () => {
    const mockIssue = {
      id: 1,
      node_id: 'node_123',
      number: 123,
      title: 'Test Issue',
      body: 'Test body',
      state: 'open' as const,
      html_url: 'https://github.com/test-owner/test-repo/issues/123',
      user: {
        login: 'testuser',
        html_url: 'https://github.com/testuser'
      },
      labels: [{ name: 'bug', color: 'red' }],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z'
    };

    const mockComments = [
      {
        id: 1,
        node_id: 'comment_1',
        body: 'First comment',
        user: {
          login: 'commenter1',
          html_url: 'https://github.com/commenter1'
        },
        created_at: '2025-01-01T01:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/123#issuecomment-1'
      }
    ];

    vi.mocked(github.getIssueWithComments).mockResolvedValue({
      issue: mockIssue,
      comments: mockComments,
      pagination: {
        page: 1,
        per_page: 100,
        total: 1,
        has_next_page: false
      }
    });

    const result = await getGitHubIssueWithCommentsTool.execute({
      issueNumber: 123
    });

    expect(result.success).toBe(true);
    expect(result.issue?.number).toBe(123);
    expect(result.issue?.title).toBe('Test Issue');
    expect(result.comments).toHaveLength(1);
    expect(result.comments?.[0].body).toBe('First comment');
    expect(result.pagination?.total_comments).toBe(1);
  });

  it('should handle pagination correctly', async () => {
    const mockIssue = {
      id: 1,
      node_id: 'node_123',
      number: 123,
      title: 'Test Issue',
      body: 'Test body',
      state: 'open' as const,
      html_url: 'https://github.com/test-owner/test-repo/issues/123',
      user: {
        login: 'testuser',
        html_url: 'https://github.com/testuser'
      },
      labels: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z'
    };

    vi.mocked(github.getIssueWithComments).mockResolvedValue({
      issue: mockIssue,
      comments: [],
      pagination: {
        page: 2,
        per_page: 50,
        total: 150,
        has_next_page: true
      }
    });

    const result = await getGitHubIssueWithCommentsTool.execute({
      issueNumber: 123,
      commentsPerPage: 50,
      page: 2
    });

    expect(result.success).toBe(true);
    expect(result.pagination?.page).toBe(2);
    expect(result.pagination?.per_page).toBe(50);
    expect(result.pagination?.has_next_page).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(github.getIssueWithComments).mockRejectedValue(
      new Error('API rate limit exceeded')
    );

    const result = await getGitHubIssueWithCommentsTool.execute({
      issueNumber: 123
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('API rate limit exceeded');
  });

  it('should handle missing project configuration', async () => {
    vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

    const result = await getGitHubIssueWithCommentsTool.execute({
      issueNumber: 123
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No active project');
  });
});
