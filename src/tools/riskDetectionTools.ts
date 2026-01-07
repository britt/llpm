/**
 * Risk Detection AI Tools
 *
 * These tools are exposed to the LLM for analyzing project and issue risks.
 * Each tool's `description` field is a @prompt that instructs the LLM
 * on when and how to use the tool. The `inputSchema` descriptions are
 * also @prompt content that guide the LLM on parameter usage.
 */
import { tool } from './instrumentedTool';
import { z } from 'zod';
import { getCurrentProject } from '../utils/projectConfig';
import {
  listIssues,
  listPullRequests,
  listAllIssues,
  listAllPullRequests,
  getIssueWithComments,
} from '../services/github';
import {
  RiskDetectionService,
  analyzeItems,
  getHighestSeverity,
  generateSuggestions,
  type RiskSignal,
  type RiskSeverity,
  type ExtendedGitHubIssue,
  type ExtendedGitHubPullRequest,
} from '../services/riskDetectionService';
import { debug } from '../utils/logger';

async function getProjectRepoInfo() {
  const project = await getCurrentProject();
  if (!project || !project.github_repo) {
    throw new Error(
      'No active project with GitHub repository. Use /project to set an active project first.'
    );
  }

  // Parse owner/repo from github_repo (e.g., "owner/repo")
  const [owner, repo] = project.github_repo.split('/');
  if (!owner || !repo) {
    throw new Error(
      `Invalid GitHub repository format: ${project.github_repo}. Expected format: owner/repo`
    );
  }

  return { owner, repo, projectName: project.name };
}

/**
 * @prompt Tool: analyze_project_risks
 * Analyzes the active project for at-risk items including stale issues/PRs,
 * blocked items, deadline risks, scope creep, and assignment issues.
 */
export const analyzeProjectRisksTool = tool({
  description:
    'Analyze the active GitHub project for at-risk items. Use comprehensive mode to scan ALL issues/PRs (slower but thorough) or quick mode (default) for the 30 most recent.',
  inputSchema: z.object({
    comprehensive: z
      .boolean()
      .optional()
      .describe(
        'If true, fetches ALL issues/PRs via pagination for thorough analysis. Default: false (quick mode, 30 most recent)'
      ),
  }),
  execute: async ({ comprehensive = false }) => {
    try {
      const { owner, repo, projectName } = await getProjectRepoInfo();
      debug(
        `Analyzing project risks for ${owner}/${repo} (${comprehensive ? 'comprehensive' : 'quick'} mode)`
      );

      const service = new RiskDetectionService();

      // Fetch issues and PRs based on mode
      let issues: ExtendedGitHubIssue[];
      let pullRequests: ExtendedGitHubPullRequest[];

      if (comprehensive) {
        [issues, pullRequests] = await Promise.all([
          listAllIssues(owner, repo, { state: 'open' }) as Promise<ExtendedGitHubIssue[]>,
          listAllPullRequests(owner, repo, { state: 'open' }) as Promise<ExtendedGitHubPullRequest[]>,
        ]);
      } else {
        [issues, pullRequests] = await Promise.all([
          listIssues(owner, repo, { state: 'open', per_page: 30 }) as Promise<ExtendedGitHubIssue[]>,
          listPullRequests(owner, repo, { state: 'open', per_page: 30 }) as Promise<ExtendedGitHubPullRequest[]>,
        ]);
      }

      const risks = analyzeItems(service, issues, pullRequests);

      // Sort by severity (critical first)
      risks.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      // Calculate summary
      const totalOpen = issues.length + pullRequests.length;
      const atRiskCount = risks.length;
      const healthyCount = totalOpen - atRiskCount;
      const bySeverity = {
        critical: risks.filter((r) => r.severity === 'critical').length,
        warning: risks.filter((r) => r.severity === 'warning').length,
        info: risks.filter((r) => r.severity === 'info').length,
      };

      // Detect overloaded assignees
      const overloadedAssignees = service.detectOverloadedAssignees(issues);

      return {
        success: true,
        project: projectName,
        mode: comprehensive ? 'comprehensive' : 'quick',
        analyzedAt: new Date().toISOString(),
        summary: {
          totalOpen,
          atRiskCount,
          healthyCount,
          bySeverity,
        },
        risks,
        overloadedAssignees,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      debug('Error analyzing project risks:', message);
      return {
        success: false,
        error: message,
      };
    }
  },
});

/**
 * @prompt Tool: analyze_issue_risks
 * Analyzes a specific issue for risk signals.
 */
export const analyzeIssueRisksTool = tool({
  description: 'Analyze a specific GitHub issue for risk signals (stale, blocked, deadline, scope, assignment)',
  inputSchema: z.object({
    issueNumber: z.number().describe('The issue number to analyze'),
  }),
  execute: async ({ issueNumber }) => {
    try {
      const { owner, repo, projectName } = await getProjectRepoInfo();
      debug(`Analyzing risks for issue #${issueNumber} in ${owner}/${repo}`);

      const service = new RiskDetectionService();

      const { issue: rawIssue, comments } = await getIssueWithComments(owner, repo, issueNumber);

      // Cast to extended type for risk detection
      const issue = rawIssue as ExtendedGitHubIssue;

      // Collect all risk signals
      const signals: RiskSignal[] = [
        ...service.detectStaleSignals(issue),
        ...service.detectBlockedSignals(issue),
        ...service.detectDeadlineSignals(issue),
        ...service.detectScopeSignals({ ...issue, comments: comments.length }),
        ...service.detectAssignmentSignals(issue),
      ];

      const severity = signals.length > 0 ? getHighestSeverity(signals) : null;
      const suggestions = generateSuggestions(signals);

      return {
        success: true,
        project: projectName,
        issue: {
          number: issue.number,
          title: issue.title,
          url: issue.html_url,
          state: issue.state,
          assignee: issue.assignee?.login,
          commentCount: comments.length,
        },
        signals,
        severity,
        suggestions,
        isAtRisk: signals.length > 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      debug('Error analyzing issue risks:', message);
      return {
        success: false,
        error: message,
      };
    }
  },
});

/**
 * @prompt Tool: get_at_risk_items
 * Gets at-risk items filtered by type or severity.
 */
export const getAtRiskItemsTool = tool({
  description:
    'Get a list of at-risk items in the project, optionally filtered by risk type or severity. Use comprehensive mode to scan all items.',
  inputSchema: z.object({
    riskType: z
      .enum(['stale', 'blocked', 'deadline', 'scope', 'assignment'])
      .optional()
      .describe('Filter by specific risk type'),
    severity: z
      .enum(['critical', 'warning', 'info'])
      .optional()
      .describe('Filter by minimum severity level'),
    itemType: z.enum(['issue', 'pr']).optional().describe('Filter by item type (issue or PR)'),
    comprehensive: z
      .boolean()
      .optional()
      .describe(
        'If true, fetches ALL issues/PRs via pagination. Default: false (quick mode, 30 most recent)'
      ),
  }),
  execute: async ({ riskType, severity, itemType, comprehensive = false }) => {
    try {
      const { owner, repo, projectName } = await getProjectRepoInfo();
      debug(
        `Getting at-risk items for ${owner}/${repo} (${comprehensive ? 'comprehensive' : 'quick'} mode)`
      );

      const service = new RiskDetectionService();

      // Fetch issues and PRs based on mode
      let issues: ExtendedGitHubIssue[];
      let pullRequests: ExtendedGitHubPullRequest[];

      if (comprehensive) {
        [issues, pullRequests] = await Promise.all([
          listAllIssues(owner, repo, { state: 'open' }) as Promise<ExtendedGitHubIssue[]>,
          listAllPullRequests(owner, repo, { state: 'open' }) as Promise<ExtendedGitHubPullRequest[]>,
        ]);
      } else {
        [issues, pullRequests] = await Promise.all([
          listIssues(owner, repo, { state: 'open', per_page: 30 }) as Promise<ExtendedGitHubIssue[]>,
          listPullRequests(owner, repo, { state: 'open', per_page: 30 }) as Promise<ExtendedGitHubPullRequest[]>,
        ]);
      }

      let risks = analyzeItems(service, issues, pullRequests);

      // Apply filters
      if (riskType) {
        risks = risks.filter((r) => r.signals.some((s) => s.type === riskType));
      }

      if (severity) {
        const severityOrder: Record<RiskSeverity, number> = { critical: 0, warning: 1, info: 2 };
        const minSeverity = severityOrder[severity];
        risks = risks.filter((r) => severityOrder[r.severity] <= minSeverity);
      }

      if (itemType) {
        risks = risks.filter((r) => r.item.type === itemType);
      }

      // Sort by severity (critical first)
      risks.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      return {
        success: true,
        project: projectName,
        mode: comprehensive ? 'comprehensive' : 'quick',
        filters: { riskType, severity, itemType },
        count: risks.length,
        items: risks,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      debug('Error getting at-risk items:', message);
      return {
        success: false,
        error: message,
      };
    }
  },
});
