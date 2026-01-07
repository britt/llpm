import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing command
vi.mock('../utils/projectConfig');
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

// Mock GitHub services
vi.mock('../services/github', () => ({
  getIssueWithComments: vi.fn(),
}));

// Mock RiskDetectionService
vi.mock('../services/riskDetectionService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/riskDetectionService')>();
  return {
    ...actual,
    RiskDetectionService: vi.fn().mockImplementation(() => ({
      detectStaleSignals: vi.fn().mockReturnValue([]),
      detectBlockedSignals: vi.fn().mockReturnValue([]),
      detectDeadlineSignals: vi.fn().mockReturnValue([]),
      detectScopeSignals: vi.fn().mockReturnValue([]),
      detectAssignmentSignals: vi.fn().mockReturnValue([]),
    })),
  };
});

import { issueCommand } from './issue';
import * as projectConfig from '../utils/projectConfig';
import * as github from '../services/github';
import { RiskDetectionService } from '../services/riskDetectionService';

describe('Issue Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic properties', () => {
    it('should have correct name and description', () => {
      expect(issueCommand.name).toBe('issue');
      expect(issueCommand.description).toBeDefined();
    });
  });

  describe('No arguments', () => {
    it('should show help when no arguments provided', async () => {
      const result = await issueCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Issue Commands');
    });
  });

  describe('Help subcommand', () => {
    it('should show help when help argument is passed', async () => {
      const result = await issueCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Issue Commands');
      expect(result.content).toContain('risks');
    });
  });

  describe('Risks subcommand', () => {
    it('should fail when no issue number provided', async () => {
      const result = await issueCommand.execute(['risks']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when invalid issue number provided', async () => {
      const result = await issueCommand.execute(['risks', 'abc']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Invalid issue number');
    });

    it('should fail when no project with github_repo is active', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await issueCommand.execute(['risks', '123']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('No active project with GitHub repository');
    });

    it('should analyze issue risks successfully', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        path: '/test/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.getIssueWithComments).mockResolvedValue({
        issue: {
          number: 123,
          title: 'Test Issue',
          state: 'open',
          html_url: 'http://example.com/123',
          updated_at: new Date().toISOString(),
          body: 'Test body',
        } as any,
        comments: []
      });

      const result = await issueCommand.execute(['risks', '123']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Issue #123');
      expect(result.content).toContain('Test Issue');
    });

    it('should show risks when detected', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        path: '/test/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.getIssueWithComments).mockResolvedValue({
        issue: {
          number: 123,
          title: 'Stale Issue',
          state: 'open',
          html_url: 'http://example.com/123',
          updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          body: 'Test body',
        } as any,
        comments: []
      });

      // Mock risk detection to return a stale signal
      vi.mocked(RiskDetectionService).mockImplementation(() => ({
        detectStaleSignals: vi.fn().mockReturnValue([
          { type: 'stale', description: 'No activity for 30 days', value: 30, severity: 'critical' }
        ]),
        detectBlockedSignals: vi.fn().mockReturnValue([]),
        detectDeadlineSignals: vi.fn().mockReturnValue([]),
        detectScopeSignals: vi.fn().mockReturnValue([]),
        detectAssignmentSignals: vi.fn().mockReturnValue([]),
      }) as any);

      const result = await issueCommand.execute(['risks', '123']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No activity for 30 days');
    });

    it('should show healthy status when no risks detected', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        path: '/test/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.getIssueWithComments).mockResolvedValue({
        issue: {
          number: 123,
          title: 'Healthy Issue',
          state: 'open',
          html_url: 'http://example.com/123',
          updated_at: new Date().toISOString(),
          body: 'Test body',
        } as any,
        comments: []
      });

      // Reset mock to return no risks
      vi.mocked(RiskDetectionService).mockImplementation(() => ({
        detectStaleSignals: vi.fn().mockReturnValue([]),
        detectBlockedSignals: vi.fn().mockReturnValue([]),
        detectDeadlineSignals: vi.fn().mockReturnValue([]),
        detectScopeSignals: vi.fn().mockReturnValue([]),
        detectAssignmentSignals: vi.fn().mockReturnValue([]),
      }) as any);

      const result = await issueCommand.execute(['risks', '123']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('healthy');
    });

    it('should handle GitHub API errors gracefully', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        path: '/test/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.getIssueWithComments).mockRejectedValue(new Error('Issue not found'));

      const result = await issueCommand.execute(['risks', '123']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed');
    });
  });

  describe('Direct issue number (shorthand)', () => {
    it('should analyze risks when just number is provided', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        path: '/test/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.getIssueWithComments).mockResolvedValue({
        issue: {
          number: 42,
          title: 'Direct Issue',
          state: 'open',
          html_url: 'http://example.com/42',
          updated_at: new Date().toISOString(),
          body: 'Test body',
        } as any,
        comments: []
      });

      const result = await issueCommand.execute(['42']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Issue #42');
    });
  });

  describe('Unknown subcommand', () => {
    it('should fail for unknown subcommand', async () => {
      const result = await issueCommand.execute(['unknown']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unknown');
    });
  });
});
