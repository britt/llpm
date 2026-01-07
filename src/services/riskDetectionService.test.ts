import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RiskDetectionService,
  type RiskConfig,
  type RiskSignal,
  type RiskItem,
  type RiskAnalysisResult,
} from './riskDetectionService';
import type { GitHubIssue, GitHubPullRequest } from './github';

// Mock dependencies
vi.mock('./github', () => ({
  listIssues: vi.fn(),
  listPullRequests: vi.fn(),
  getIssueWithComments: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  debug: vi.fn(),
  getVerbose: vi.fn().mockReturnValue(false),
}));

describe('RiskDetectionService', () => {
  let service: RiskDetectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RiskDetectionService();
  });

  describe('constructor', () => {
    it('should create an instance with default config', () => {
      expect(service).toBeInstanceOf(RiskDetectionService);
    });

    it('should accept custom config', () => {
      const customConfig: Partial<RiskConfig> = {
        staleDays: 7,
        deadlineWarningDays: 3,
      };
      const customService = new RiskDetectionService(customConfig);
      expect(customService).toBeInstanceOf(RiskDetectionService);
    });
  });

  describe('stale item detection', () => {
    describe('detectStaleIssues', () => {
      it('should detect issues with no activity for 14+ days as stale', () => {
        const now = new Date();
        const sixteenDaysAgo = new Date(now);
        sixteenDaysAgo.setDate(now.getDate() - 16);

        const staleIssue: GitHubIssue = {
          id: 1,
          node_id: 'node_1',
          number: 42,
          title: 'Old issue',
          body: 'This issue has been inactive',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/42',
          user: { login: 'author', html_url: 'https://github.com/author' },
          labels: [],
          created_at: sixteenDaysAgo.toISOString(),
          updated_at: sixteenDaysAgo.toISOString(),
        };

        const signals = service.detectStaleSignals(staleIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('stale');
        expect(signals[0].severity).toBe('warning');
        expect(signals[0].description).toContain('16');
      });

      it('should not flag recently active items as stale', () => {
        const now = new Date();
        const fiveDaysAgo = new Date(now);
        fiveDaysAgo.setDate(now.getDate() - 5);

        const recentIssue: GitHubIssue = {
          id: 2,
          node_id: 'node_2',
          number: 43,
          title: 'Recent issue',
          body: 'This issue was just updated',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/43',
          user: { login: 'author', html_url: 'https://github.com/author' },
          labels: [],
          created_at: fiveDaysAgo.toISOString(),
          updated_at: fiveDaysAgo.toISOString(),
        };

        const signals = service.detectStaleSignals(recentIssue);

        expect(signals).toHaveLength(0);
      });

      it('should respect custom staleDays configuration', () => {
        const customService = new RiskDetectionService({ staleDays: 7 });
        const now = new Date();
        const tenDaysAgo = new Date(now);
        tenDaysAgo.setDate(now.getDate() - 10);

        const issue: GitHubIssue = {
          id: 3,
          node_id: 'node_3',
          number: 44,
          title: 'Custom threshold issue',
          body: 'Testing custom stale threshold',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/44',
          user: { login: 'author', html_url: 'https://github.com/author' },
          labels: [],
          created_at: tenDaysAgo.toISOString(),
          updated_at: tenDaysAgo.toISOString(),
        };

        const signals = customService.detectStaleSignals(issue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('stale');
      });

      it('should detect items at exactly 14 days as not stale (boundary case)', () => {
        const now = new Date();
        const exactlyFourteenDaysAgo = new Date(now);
        exactlyFourteenDaysAgo.setDate(now.getDate() - 14);

        const boundaryIssue: GitHubIssue = {
          id: 4,
          node_id: 'node_4',
          number: 45,
          title: 'Boundary issue',
          body: 'Exactly 14 days old',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/45',
          user: { login: 'author', html_url: 'https://github.com/author' },
          labels: [],
          created_at: exactlyFourteenDaysAgo.toISOString(),
          updated_at: exactlyFourteenDaysAgo.toISOString(),
        };

        const signals = service.detectStaleSignals(boundaryIssue);

        // At exactly 14 days, it's not yet stale (must be > 14)
        expect(signals).toHaveLength(0);
      });

      it('should mark issues stale for 30+ days as critical severity', () => {
        const now = new Date();
        const thirtyFiveDaysAgo = new Date(now);
        thirtyFiveDaysAgo.setDate(now.getDate() - 35);

        const veryStaleIssue: GitHubIssue = {
          id: 5,
          node_id: 'node_5',
          number: 46,
          title: 'Very old issue',
          body: 'This issue has been inactive for over a month',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/46',
          user: { login: 'author', html_url: 'https://github.com/author' },
          labels: [],
          created_at: thirtyFiveDaysAgo.toISOString(),
          updated_at: thirtyFiveDaysAgo.toISOString(),
        };

        const signals = service.detectStaleSignals(veryStaleIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('stale');
        expect(signals[0].severity).toBe('critical');
      });
    });

    describe('detectStalePullRequests', () => {
      it('should detect PRs with no activity for 14+ days as stale', () => {
        const now = new Date();
        const twentyDaysAgo = new Date(now);
        twentyDaysAgo.setDate(now.getDate() - 20);

        const stalePR: GitHubPullRequest = {
          id: 10,
          number: 100,
          title: 'Old PR',
          body: 'This PR has been stale',
          state: 'open',
          html_url: 'https://github.com/owner/repo/pull/100',
          user: { login: 'author', html_url: 'https://github.com/author' },
          head: { ref: 'feature-branch', sha: 'abc123' },
          base: { ref: 'main', sha: 'def456' },
          draft: false,
          mergeable: true,
          created_at: twentyDaysAgo.toISOString(),
          updated_at: twentyDaysAgo.toISOString(),
          merged_at: null,
        };

        const signals = service.detectStaleSignals(stalePR);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('stale');
        expect(signals[0].severity).toBe('warning');
      });

      it('should not flag recently active PRs as stale', () => {
        const now = new Date();
        const threeDaysAgo = new Date(now);
        threeDaysAgo.setDate(now.getDate() - 3);

        const recentPR: GitHubPullRequest = {
          id: 11,
          number: 101,
          title: 'Recent PR',
          body: 'This PR was just updated',
          state: 'open',
          html_url: 'https://github.com/owner/repo/pull/101',
          user: { login: 'author', html_url: 'https://github.com/author' },
          head: { ref: 'feature-branch', sha: 'abc123' },
          base: { ref: 'main', sha: 'def456' },
          draft: false,
          mergeable: true,
          created_at: threeDaysAgo.toISOString(),
          updated_at: threeDaysAgo.toISOString(),
          merged_at: null,
        };

        const signals = service.detectStaleSignals(recentPR);

        expect(signals).toHaveLength(0);
      });

      it('should use prStaleReviewDays for PRs awaiting review', () => {
        const customService = new RiskDetectionService({ prStaleReviewDays: 3 });
        const now = new Date();
        const fiveDaysAgo = new Date(now);
        fiveDaysAgo.setDate(now.getDate() - 5);

        const prAwaitingReview: GitHubPullRequest = {
          id: 12,
          number: 102,
          title: 'PR awaiting review',
          body: 'Waiting for review',
          state: 'open',
          html_url: 'https://github.com/owner/repo/pull/102',
          user: { login: 'author', html_url: 'https://github.com/author' },
          head: { ref: 'feature-branch', sha: 'abc123' },
          base: { ref: 'main', sha: 'def456' },
          draft: false,
          mergeable: true,
          created_at: fiveDaysAgo.toISOString(),
          updated_at: fiveDaysAgo.toISOString(),
          merged_at: null,
          requested_reviewers: [{ login: 'reviewer', html_url: 'https://github.com/reviewer' }],
        };

        const signals = customService.detectStaleSignals(prAwaitingReview);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('stale');
        expect(signals[0].description).toContain('review');
      });
    });
  });

  describe('isStale helper', () => {
    it('should return true for items older than threshold', () => {
      const now = new Date();
      const oldDate = new Date(now);
      oldDate.setDate(now.getDate() - 20);

      const result = service.isStale(oldDate.toISOString(), 14);
      expect(result).toBe(true);
    });

    it('should return false for items newer than threshold', () => {
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(now.getDate() - 5);

      const result = service.isStale(recentDate.toISOString(), 14);
      expect(result).toBe(false);
    });

    it('should return false for items exactly at threshold', () => {
      const now = new Date();
      const exactDate = new Date(now);
      exactDate.setDate(now.getDate() - 14);

      const result = service.isStale(exactDate.toISOString(), 14);
      expect(result).toBe(false);
    });
  });

  describe('getDaysSinceUpdate helper', () => {
    it('should calculate days since last update correctly', () => {
      const now = new Date();
      const tenDaysAgo = new Date(now);
      tenDaysAgo.setDate(now.getDate() - 10);

      const days = service.getDaysSinceUpdate(tenDaysAgo.toISOString());

      // Allow for small floating point differences
      expect(Math.floor(days)).toBe(10);
    });

    it('should handle same-day updates', () => {
      const now = new Date();

      const days = service.getDaysSinceUpdate(now.toISOString());

      expect(days).toBeLessThan(1);
    });
  });

  describe('blocked item detection', () => {
    const createIssue = (overrides: Partial<GitHubIssue> = {}): GitHubIssue => ({
      id: 1,
      node_id: 'node_1',
      number: 42,
      title: 'Test issue',
      body: 'Test body',
      state: 'open',
      html_url: 'https://github.com/owner/repo/issues/42',
      user: { login: 'author', html_url: 'https://github.com/author' },
      labels: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    });

    describe('detectBlockedSignals', () => {
      it('should detect issues with blocked label', () => {
        const blockedIssue = createIssue({
          labels: [{ name: 'blocked', color: 'ff0000' }],
        });

        const signals = service.detectBlockedSignals(blockedIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('blocked');
        expect(signals[0].severity).toBe('critical');
        expect(signals[0].description).toContain('blocked');
      });

      it('should detect issues with waiting label', () => {
        const waitingIssue = createIssue({
          labels: [{ name: 'waiting', color: 'ffff00' }],
        });

        const signals = service.detectBlockedSignals(waitingIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('blocked');
        expect(signals[0].description).toContain('waiting');
      });

      it('should detect issues with on-hold label', () => {
        const onHoldIssue = createIssue({
          labels: [{ name: 'on-hold', color: 'ff9900' }],
        });

        const signals = service.detectBlockedSignals(onHoldIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('blocked');
      });

      it('should detect issues with waiting-for-response label', () => {
        const waitingResponseIssue = createIssue({
          labels: [{ name: 'waiting-for-response', color: 'ffff00' }],
        });

        const signals = service.detectBlockedSignals(waitingResponseIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('blocked');
      });

      it('should detect "blocked by #123" mentions in body', () => {
        const blockedByIssue = createIssue({
          body: 'This is blocked by #123 until that is resolved.',
        });

        const signals = service.detectBlockedSignals(blockedByIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('blocked');
        expect(signals[0].description).toContain('blocked by');
      });

      it('should detect "waiting on" mentions in body', () => {
        const waitingOnIssue = createIssue({
          body: 'We are waiting on approval from the design team.',
        });

        const signals = service.detectBlockedSignals(waitingOnIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('blocked');
        expect(signals[0].description).toContain('waiting on');
      });

      it('should detect "depends on" mentions in body', () => {
        const dependsOnIssue = createIssue({
          body: 'This depends on #456 being completed first.',
        });

        const signals = service.detectBlockedSignals(dependsOnIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('blocked');
        expect(signals[0].description).toContain('depends on');
      });

      it('should detect "blocked until" mentions in body', () => {
        const blockedUntilIssue = createIssue({
          body: 'This feature is blocked until Q2 release.',
        });

        const signals = service.detectBlockedSignals(blockedUntilIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('blocked');
        expect(signals[0].description).toContain('blocked until');
      });

      it('should not flag issues without blocked indicators', () => {
        const normalIssue = createIssue({
          body: 'This is a normal issue with no blocking indicators.',
          labels: [{ name: 'enhancement', color: '00ff00' }],
        });

        const signals = service.detectBlockedSignals(normalIssue);

        expect(signals).toHaveLength(0);
      });

      it('should handle issues with null body', () => {
        const nullBodyIssue = createIssue({
          body: null,
          labels: [],
        });

        const signals = service.detectBlockedSignals(nullBodyIssue);

        expect(signals).toHaveLength(0);
      });

      it('should detect multiple blocking indicators', () => {
        const multipleBlockersIssue = createIssue({
          body: 'This is blocked by #123 and waiting on #456.',
          labels: [{ name: 'blocked', color: 'ff0000' }],
        });

        const signals = service.detectBlockedSignals(multipleBlockersIssue);

        // Should detect all blocking indicators
        expect(signals.length).toBeGreaterThanOrEqual(1);
        expect(signals.every((s) => s.type === 'blocked')).toBe(true);
      });

      it('should be case-insensitive for blocking patterns', () => {
        const mixedCaseIssue = createIssue({
          body: 'This is BLOCKED BY #123.',
        });

        const signals = service.detectBlockedSignals(mixedCaseIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('blocked');
      });
    });

    describe('detectBlockedPullRequests', () => {
      const createPR = (overrides: Partial<GitHubPullRequest> = {}): GitHubPullRequest => ({
        id: 10,
        number: 100,
        title: 'Test PR',
        body: 'Test body',
        state: 'open',
        html_url: 'https://github.com/owner/repo/pull/100',
        user: { login: 'author', html_url: 'https://github.com/author' },
        head: { ref: 'feature-branch', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        draft: false,
        mergeable: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        merged_at: null,
        ...overrides,
      });

      it('should detect PRs with blocked label', () => {
        const blockedPR = createPR({
          labels: [{ name: 'blocked', color: 'ff0000' }],
        });

        const signals = service.detectBlockedSignals(blockedPR);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('blocked');
      });

      it('should detect draft PRs as waiting', () => {
        const draftPR = createPR({
          draft: true,
        });

        const signals = service.detectBlockedSignals(draftPR);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('blocked');
        expect(signals[0].severity).toBe('info');
        expect(signals[0].description).toContain('draft');
      });

      it('should detect PRs with merge conflicts', () => {
        const conflictPR = createPR({
          mergeable: false,
        });

        const signals = service.detectBlockedSignals(conflictPR);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('blocked');
        expect(signals[0].severity).toBe('warning');
        expect(signals[0].description).toContain('merge conflict');
      });

      it('should not flag normal PRs as blocked', () => {
        const normalPR = createPR({
          draft: false,
          mergeable: true,
          labels: [],
        });

        const signals = service.detectBlockedSignals(normalPR);

        expect(signals).toHaveLength(0);
      });
    });
  });

  describe('deadline risk detection', () => {
    const createIssueWithMilestone = (
      dueDate: string | null,
      overrides: Partial<GitHubIssue> = {}
    ): GitHubIssue & { milestone?: { title: string; due_on: string | null } } => ({
      id: 1,
      node_id: 'node_1',
      number: 42,
      title: 'Test issue',
      body: 'Test body',
      state: 'open',
      html_url: 'https://github.com/owner/repo/issues/42',
      user: { login: 'author', html_url: 'https://github.com/author' },
      labels: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      milestone: dueDate
        ? {
            title: 'v1.0',
            due_on: dueDate,
          }
        : undefined,
      ...overrides,
    });

    describe('detectDeadlineSignals', () => {
      it('should detect issues with due dates within warning window', () => {
        const now = new Date();
        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(now.getDate() + 3);

        const issueWithUpcomingDeadline = createIssueWithMilestone(
          threeDaysFromNow.toISOString()
        );

        const signals = service.detectDeadlineSignals(issueWithUpcomingDeadline);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('deadline');
        expect(signals[0].severity).toBe('warning');
        // Check description mentions days (could be 2 or 3 due to rounding)
        expect(signals[0].description).toMatch(/\d+ days/);
      });

      it('should detect issues with past due dates', () => {
        const now = new Date();
        const fiveDaysAgo = new Date(now);
        fiveDaysAgo.setDate(now.getDate() - 5);

        const overdueIssue = createIssueWithMilestone(fiveDaysAgo.toISOString());

        const signals = service.detectDeadlineSignals(overdueIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('deadline');
        expect(signals[0].severity).toBe('critical');
        expect(signals[0].description).toContain('overdue');
      });

      it('should not flag issues with far future due dates', () => {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const farFutureIssue = createIssueWithMilestone(thirtyDaysFromNow.toISOString());

        const signals = service.detectDeadlineSignals(farFutureIssue);

        expect(signals).toHaveLength(0);
      });

      it('should not flag issues without milestones', () => {
        const noMilestoneIssue = createIssueWithMilestone(null);

        const signals = service.detectDeadlineSignals(noMilestoneIssue);

        expect(signals).toHaveLength(0);
      });

      it('should respect custom deadlineWarningDays configuration', () => {
        const customService = new RiskDetectionService({ deadlineWarningDays: 14 });
        const now = new Date();
        const tenDaysFromNow = new Date(now);
        tenDaysFromNow.setDate(now.getDate() + 10);

        const issueWithCustomThreshold = createIssueWithMilestone(
          tenDaysFromNow.toISOString()
        );

        const signals = customService.detectDeadlineSignals(issueWithCustomThreshold);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('deadline');
      });

      it('should handle issues at exactly the warning threshold (boundary case)', () => {
        const now = new Date();
        const sevenDaysFromNow = new Date(now);
        sevenDaysFromNow.setDate(now.getDate() + 7);

        const boundaryIssue = createIssueWithMilestone(sevenDaysFromNow.toISOString());

        const signals = service.detectDeadlineSignals(boundaryIssue);

        // At exactly 7 days, it should be flagged (<=7 days)
        expect(signals).toHaveLength(1);
        expect(signals[0].severity).toBe('warning');
      });

      it('should detect critical severity for imminent deadlines (within 2 days)', () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        const imminentIssue = createIssueWithMilestone(tomorrow.toISOString());

        const signals = service.detectDeadlineSignals(imminentIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('deadline');
        expect(signals[0].severity).toBe('critical');
      });

      it('should handle milestones with null due_on', () => {
        const issueWithNullDueOn: GitHubIssue & {
          milestone?: { title: string; due_on: string | null };
        } = {
          id: 1,
          node_id: 'node_1',
          number: 42,
          title: 'Test issue',
          body: 'Test body',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/42',
          user: { login: 'author', html_url: 'https://github.com/author' },
          labels: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          milestone: {
            title: 'Backlog',
            due_on: null,
          },
        };

        const signals = service.detectDeadlineSignals(issueWithNullDueOn);

        expect(signals).toHaveLength(0);
      });
    });
  });

  describe('scope risk detection', () => {
    const createIssueWithComments = (
      commentCount: number,
      overrides: Partial<GitHubIssue> = {}
    ): GitHubIssue & { comments?: number } => ({
      id: 1,
      node_id: 'node_1',
      number: 42,
      title: 'Test issue',
      body: 'Test body',
      state: 'open',
      html_url: 'https://github.com/owner/repo/issues/42',
      user: { login: 'author', html_url: 'https://github.com/author' },
      labels: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      comments: commentCount,
      ...overrides,
    });

    describe('detectScopeSignals', () => {
      it('should detect issues with excessive comments (30+)', () => {
        const highCommentIssue = createIssueWithComments(35);

        const signals = service.detectScopeSignals(highCommentIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('scope');
        expect(signals[0].severity).toBe('warning');
        expect(signals[0].description).toContain('35');
      });

      it('should not flag issues with normal comment count', () => {
        const normalCommentIssue = createIssueWithComments(15);

        const signals = service.detectScopeSignals(normalCommentIssue);

        expect(signals).toHaveLength(0);
      });

      it('should respect custom maxCommentsBeforeScopeWarning configuration', () => {
        const customService = new RiskDetectionService({ maxCommentsBeforeScopeWarning: 20 });
        const issueWithCustomThreshold = createIssueWithComments(25);

        const signals = customService.detectScopeSignals(issueWithCustomThreshold);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('scope');
      });

      it('should handle issues at exactly the threshold (boundary case)', () => {
        const boundaryIssue = createIssueWithComments(30);

        const signals = service.detectScopeSignals(boundaryIssue);

        // At exactly 30, it's at the threshold but not exceeding
        expect(signals).toHaveLength(0);
      });

      it('should detect critical severity for very high comment count (60+)', () => {
        const veryHighCommentIssue = createIssueWithComments(65);

        const signals = service.detectScopeSignals(veryHighCommentIssue);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('scope');
        expect(signals[0].severity).toBe('critical');
      });

      it('should handle issues without comments field', () => {
        const noCommentsFieldIssue: GitHubIssue = {
          id: 1,
          node_id: 'node_1',
          number: 42,
          title: 'Test issue',
          body: 'Test body',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/42',
          user: { login: 'author', html_url: 'https://github.com/author' },
          labels: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const signals = service.detectScopeSignals(noCommentsFieldIssue);

        expect(signals).toHaveLength(0);
      });
    });

    describe('detectScopePullRequests', () => {
      const createPRWithChanges = (
        additions: number,
        deletions: number,
        overrides: Partial<GitHubPullRequest> = {}
      ): GitHubPullRequest & { additions?: number; deletions?: number } => ({
        id: 10,
        number: 100,
        title: 'Test PR',
        body: 'Test body',
        state: 'open',
        html_url: 'https://github.com/owner/repo/pull/100',
        user: { login: 'author', html_url: 'https://github.com/author' },
        head: { ref: 'feature-branch', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        draft: false,
        mergeable: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        merged_at: null,
        additions,
        deletions,
        ...overrides,
      });

      it('should detect PRs with large diffs (500+ lines changed)', () => {
        const largePR = createPRWithChanges(400, 200);

        const signals = service.detectScopeSignals(largePR);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('scope');
        expect(signals[0].severity).toBe('warning');
        expect(signals[0].description).toContain('600');
      });

      it('should not flag PRs with normal diff size', () => {
        const normalPR = createPRWithChanges(100, 50);

        const signals = service.detectScopeSignals(normalPR);

        expect(signals).toHaveLength(0);
      });

      it('should detect critical severity for very large PRs (1000+ lines)', () => {
        const veryLargePR = createPRWithChanges(800, 400);

        const signals = service.detectScopeSignals(veryLargePR);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('scope');
        expect(signals[0].severity).toBe('critical');
      });

      it('should handle PRs without additions/deletions fields', () => {
        const prWithoutChanges: GitHubPullRequest = {
          id: 10,
          number: 100,
          title: 'Test PR',
          body: 'Test body',
          state: 'open',
          html_url: 'https://github.com/owner/repo/pull/100',
          user: { login: 'author', html_url: 'https://github.com/author' },
          head: { ref: 'feature-branch', sha: 'abc123' },
          base: { ref: 'main', sha: 'def456' },
          draft: false,
          mergeable: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          merged_at: null,
        };

        const signals = service.detectScopeSignals(prWithoutChanges);

        expect(signals).toHaveLength(0);
      });
    });
  });

  describe('assignment risk detection', () => {
    const createIssueWithAssignee = (
      assignee: string | null,
      labels: Array<{ name: string; color: string }> = [],
      overrides: Partial<GitHubIssue> = {}
    ): GitHubIssue & { assignee?: { login: string; html_url: string } | null } => ({
      id: 1,
      node_id: 'node_1',
      number: 42,
      title: 'Test issue',
      body: 'Test body',
      state: 'open',
      html_url: 'https://github.com/owner/repo/issues/42',
      user: { login: 'author', html_url: 'https://github.com/author' },
      labels,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignee: assignee ? { login: assignee, html_url: `https://github.com/${assignee}` } : null,
      ...overrides,
    });

    describe('detectAssignmentSignals', () => {
      it('should detect unassigned high-priority issues', () => {
        const unassignedHighPriority = createIssueWithAssignee(null, [
          { name: 'priority:high', color: 'ff0000' },
        ]);

        const signals = service.detectAssignmentSignals(unassignedHighPriority);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('assignment');
        expect(signals[0].severity).toBe('warning');
        expect(signals[0].description).toContain('unassigned');
        expect(signals[0].description.toLowerCase()).toContain('high-priority');
      });

      it('should detect unassigned critical priority issues', () => {
        const unassignedCritical = createIssueWithAssignee(null, [
          { name: 'priority:critical', color: 'ff0000' },
        ]);

        const signals = service.detectAssignmentSignals(unassignedCritical);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('assignment');
        expect(signals[0].severity).toBe('critical');
      });

      it('should detect unassigned urgent issues', () => {
        const unassignedUrgent = createIssueWithAssignee(null, [
          { name: 'urgent', color: 'ff0000' },
        ]);

        const signals = service.detectAssignmentSignals(unassignedUrgent);

        expect(signals).toHaveLength(1);
        expect(signals[0].type).toBe('assignment');
      });

      it('should not flag unassigned low-priority issues', () => {
        const unassignedLowPriority = createIssueWithAssignee(null, [
          { name: 'enhancement', color: '00ff00' },
        ]);

        const signals = service.detectAssignmentSignals(unassignedLowPriority);

        expect(signals).toHaveLength(0);
      });

      it('should not flag assigned high-priority issues', () => {
        const assignedHighPriority = createIssueWithAssignee('alice', [
          { name: 'priority:high', color: 'ff0000' },
        ]);

        const signals = service.detectAssignmentSignals(assignedHighPriority);

        expect(signals).toHaveLength(0);
      });

      it('should detect issues with P0 priority label as critical', () => {
        const p0Issue = createIssueWithAssignee(null, [{ name: 'P0', color: 'ff0000' }]);

        const signals = service.detectAssignmentSignals(p0Issue);

        expect(signals).toHaveLength(1);
        expect(signals[0].severity).toBe('critical');
      });

      it('should handle issues without labels', () => {
        const noLabelsIssue = createIssueWithAssignee(null);

        const signals = service.detectAssignmentSignals(noLabelsIssue);

        expect(signals).toHaveLength(0);
      });
    });

    describe('detectOverloadedAssignees', () => {
      it('should detect overloaded assignees', () => {
        // Create a list of issues all assigned to the same person
        const issues: Array<GitHubIssue & { assignee?: { login: string; html_url: string } | null }> =
          Array.from({ length: 12 }, (_, i) => ({
            id: i + 1,
            node_id: `node_${i + 1}`,
            number: i + 1,
            title: `Issue ${i + 1}`,
            body: 'Test body',
            state: 'open',
            html_url: `https://github.com/owner/repo/issues/${i + 1}`,
            user: { login: 'author', html_url: 'https://github.com/author' },
            labels: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            assignee: { login: 'alice', html_url: 'https://github.com/alice' },
          }));

        const overloaded = service.detectOverloadedAssignees(issues);

        expect(overloaded).toHaveLength(1);
        expect(overloaded[0].assignee).toBe('alice');
        expect(overloaded[0].issueCount).toBe(12);
        expect(overloaded[0].severity).toBe('warning');
      });

      it('should not flag assignees with normal workload', () => {
        const issues: Array<GitHubIssue & { assignee?: { login: string; html_url: string } | null }> =
          Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            node_id: `node_${i + 1}`,
            number: i + 1,
            title: `Issue ${i + 1}`,
            body: 'Test body',
            state: 'open',
            html_url: `https://github.com/owner/repo/issues/${i + 1}`,
            user: { login: 'author', html_url: 'https://github.com/author' },
            labels: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            assignee: { login: 'alice', html_url: 'https://github.com/alice' },
          }));

        const overloaded = service.detectOverloadedAssignees(issues);

        expect(overloaded).toHaveLength(0);
      });

      it('should respect custom maxAssignedIssuesPerPerson configuration', () => {
        const customService = new RiskDetectionService({ maxAssignedIssuesPerPerson: 5 });
        const issues: Array<GitHubIssue & { assignee?: { login: string; html_url: string } | null }> =
          Array.from({ length: 7 }, (_, i) => ({
            id: i + 1,
            node_id: `node_${i + 1}`,
            number: i + 1,
            title: `Issue ${i + 1}`,
            body: 'Test body',
            state: 'open',
            html_url: `https://github.com/owner/repo/issues/${i + 1}`,
            user: { login: 'author', html_url: 'https://github.com/author' },
            labels: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            assignee: { login: 'bob', html_url: 'https://github.com/bob' },
          }));

        const overloaded = customService.detectOverloadedAssignees(issues);

        expect(overloaded).toHaveLength(1);
        expect(overloaded[0].assignee).toBe('bob');
      });

      it('should track multiple overloaded assignees', () => {
        const issues: Array<GitHubIssue & { assignee?: { login: string; html_url: string } | null }> =
          [
            ...Array.from({ length: 11 }, (_, i) => ({
              id: i + 1,
              node_id: `node_${i + 1}`,
              number: i + 1,
              title: `Issue ${i + 1}`,
              body: 'Test body',
              state: 'open',
              html_url: `https://github.com/owner/repo/issues/${i + 1}`,
              user: { login: 'author', html_url: 'https://github.com/author' },
              labels: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              assignee: { login: 'alice', html_url: 'https://github.com/alice' },
            })),
            ...Array.from({ length: 15 }, (_, i) => ({
              id: i + 20,
              node_id: `node_${i + 20}`,
              number: i + 20,
              title: `Issue ${i + 20}`,
              body: 'Test body',
              state: 'open',
              html_url: `https://github.com/owner/repo/issues/${i + 20}`,
              user: { login: 'author', html_url: 'https://github.com/author' },
              labels: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              assignee: { login: 'bob', html_url: 'https://github.com/bob' },
            })),
          ];

        const overloaded = service.detectOverloadedAssignees(issues);

        expect(overloaded).toHaveLength(2);
        expect(overloaded.map((o) => o.assignee).sort()).toEqual(['alice', 'bob']);
      });

      it('should handle issues without assignees', () => {
        const issues: Array<GitHubIssue & { assignee?: { login: string; html_url: string } | null }> =
          Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            node_id: `node_${i + 1}`,
            number: i + 1,
            title: `Issue ${i + 1}`,
            body: 'Test body',
            state: 'open',
            html_url: `https://github.com/owner/repo/issues/${i + 1}`,
            user: { login: 'author', html_url: 'https://github.com/author' },
            labels: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            assignee: null,
          }));

        const overloaded = service.detectOverloadedAssignees(issues);

        expect(overloaded).toHaveLength(0);
      });

      it('should detect critical severity for very overloaded assignees (20+)', () => {
        const issues: Array<GitHubIssue & { assignee?: { login: string; html_url: string } | null }> =
          Array.from({ length: 25 }, (_, i) => ({
            id: i + 1,
            node_id: `node_${i + 1}`,
            number: i + 1,
            title: `Issue ${i + 1}`,
            body: 'Test body',
            state: 'open',
            html_url: `https://github.com/owner/repo/issues/${i + 1}`,
            user: { login: 'author', html_url: 'https://github.com/author' },
            labels: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            assignee: { login: 'charlie', html_url: 'https://github.com/charlie' },
          }));

        const overloaded = service.detectOverloadedAssignees(issues);

        expect(overloaded).toHaveLength(1);
        expect(overloaded[0].severity).toBe('critical');
      });
    });
  });
});
