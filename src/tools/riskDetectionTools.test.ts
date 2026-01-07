import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock only the external dependencies, not the RiskDetectionService
vi.mock('../utils/projectConfig');
vi.mock('../services/github');
vi.mock('../utils/logger', () => ({
  debug: vi.fn(),
}));

// Import after mocking
import {
  analyzeProjectRisksTool,
  analyzeIssueRisksTool,
  getAtRiskItemsTool,
} from './riskDetectionTools';

import * as projectConfig from '../utils/projectConfig';
import * as github from '../services/github';

describe('Risk Detection Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all risk detection tools', () => {
      const tools = [analyzeProjectRisksTool, analyzeIssueRisksTool, getAtRiskItemsTool];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });

  describe('analyzeProjectRisksTool', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should analyze project risks in quick mode by default', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      const now = new Date();
      const twentyDaysAgo = new Date(now);
      twentyDaysAgo.setDate(now.getDate() - 20);

      vi.mocked(github.listIssues).mockResolvedValue([
        {
          id: 1,
          node_id: 'node_1',
          number: 42,
          title: 'Stale issue',
          body: 'Test body',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/42',
          user: { login: 'author', html_url: 'https://github.com/author' },
          labels: [],
          created_at: twentyDaysAgo.toISOString(),
          updated_at: twentyDaysAgo.toISOString(),
        },
      ]);

      vi.mocked(github.listPullRequests).mockResolvedValue([]);

      const result = await analyzeProjectRisksTool.execute({});

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalOpen).toBe(1);
      expect(result.mode).toBe('quick');
    });

    it('should analyze project risks in comprehensive mode when requested', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      vi.mocked(github.listAllIssues).mockResolvedValue([]);
      vi.mocked(github.listAllPullRequests).mockResolvedValue([]);

      const result = await analyzeProjectRisksTool.execute({ comprehensive: true });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('comprehensive');
      expect(github.listAllIssues).toHaveBeenCalled();
      expect(github.listAllPullRequests).toHaveBeenCalled();
    });

    it('should return error when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await analyzeProjectRisksTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active project');
    });

    it('should detect stale issues and return them in risks array', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      const now = new Date();
      const twentyDaysAgo = new Date(now);
      twentyDaysAgo.setDate(now.getDate() - 20);

      vi.mocked(github.listIssues).mockResolvedValue([
        {
          id: 1,
          node_id: 'node_1',
          number: 42,
          title: 'Stale issue',
          body: 'Test body',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/42',
          user: { login: 'author', html_url: 'https://github.com/author' },
          labels: [],
          created_at: twentyDaysAgo.toISOString(),
          updated_at: twentyDaysAgo.toISOString(),
        },
      ]);

      vi.mocked(github.listPullRequests).mockResolvedValue([]);

      const result = await analyzeProjectRisksTool.execute({});

      expect(result.success).toBe(true);
      expect(result.risks).toBeDefined();
      expect(result.risks.length).toBeGreaterThan(0);
      expect(result.risks[0].signals.some((s: any) => s.type === 'stale')).toBe(true);
    });
  });

  describe('analyzeIssueRisksTool', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should analyze risks for a specific issue', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      const now = new Date();
      const twentyDaysAgo = new Date(now);
      twentyDaysAgo.setDate(now.getDate() - 20);

      vi.mocked(github.getIssueWithComments).mockResolvedValue({
        issue: {
          id: 1,
          node_id: 'node_1',
          number: 42,
          title: 'Stale issue',
          body: 'Test body',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/42',
          user: { login: 'author', html_url: 'https://github.com/author' },
          labels: [],
          created_at: twentyDaysAgo.toISOString(),
          updated_at: twentyDaysAgo.toISOString(),
        },
        comments: [],
      });

      const result = await analyzeIssueRisksTool.execute({ issueNumber: 42 });

      expect(result.success).toBe(true);
      expect(result.issue).toBeDefined();
      expect(result.issue.number).toBe(42);
      expect(result.signals).toBeDefined();
    });

    it('should return error for non-existent issue', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      vi.mocked(github.getIssueWithComments).mockRejectedValue(
        new Error('Issue not found')
      );

      const result = await analyzeIssueRisksTool.execute({ issueNumber: 999 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Issue not found');
    });
  });

  describe('getAtRiskItemsTool', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should filter risks by type', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      const now = new Date();
      const twentyDaysAgo = new Date(now);
      twentyDaysAgo.setDate(now.getDate() - 20);

      vi.mocked(github.listIssues).mockResolvedValue([
        {
          id: 1,
          node_id: 'node_1',
          number: 42,
          title: 'Stale issue',
          body: 'Test body',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/42',
          user: { login: 'author', html_url: 'https://github.com/author' },
          labels: [],
          created_at: twentyDaysAgo.toISOString(),
          updated_at: twentyDaysAgo.toISOString(),
        },
        {
          id: 2,
          node_id: 'node_2',
          number: 43,
          title: 'Blocked issue',
          body: 'blocked by #1',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/43',
          user: { login: 'author', html_url: 'https://github.com/author' },
          labels: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      vi.mocked(github.listPullRequests).mockResolvedValue([]);

      const result = await getAtRiskItemsTool.execute({ riskType: 'stale' });

      expect(result.success).toBe(true);
      expect(result.items).toBeDefined();
      // All returned items should have stale signals
      result.items.forEach((item: any) => {
        expect(item.signals.some((s: any) => s.type === 'stale')).toBe(true);
      });
    });

    it('should filter risks by severity', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      vi.mocked(github.listIssues).mockResolvedValue([]);
      vi.mocked(github.listPullRequests).mockResolvedValue([]);

      const result = await getAtRiskItemsTool.execute({ severity: 'critical' });

      expect(result.success).toBe(true);
      expect(result.items).toBeDefined();
    });

    it('should support comprehensive mode', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });

      vi.mocked(github.listAllIssues).mockResolvedValue([]);
      vi.mocked(github.listAllPullRequests).mockResolvedValue([]);

      const result = await getAtRiskItemsTool.execute({ comprehensive: true });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('comprehensive');
      expect(github.listAllIssues).toHaveBeenCalled();
    });
  });
});
