import type { GitHubIssue, GitHubPullRequest } from './github';

/**
 * Risk signal types detected by the service.
 */
export type RiskType = 'stale' | 'blocked' | 'deadline' | 'scope' | 'assignment';

/**
 * Extended GitHub Issue with optional fields used by risk detection.
 */
export type ExtendedGitHubIssue = GitHubIssue & {
  milestone?: { title: string; due_on: string | null };
  assignee?: { login: string; html_url: string } | null;
  comments?: number;
};

/**
 * Extended GitHub Pull Request with optional fields used by risk detection.
 */
export type ExtendedGitHubPullRequest = GitHubPullRequest & {
  additions?: number;
  deletions?: number;
};

/**
 * Severity levels for risk signals.
 */
export type RiskSeverity = 'critical' | 'warning' | 'info';

/**
 * A single risk signal detected for an item.
 */
export interface RiskSignal {
  type: RiskType;
  description: string;
  value?: number | string;
  severity: RiskSeverity;
}

/**
 * An item (issue or PR) with detected risk signals.
 */
export interface RiskItem {
  item: {
    type: 'issue' | 'pr';
    number: number;
    title: string;
    url: string;
    assignee?: string;
  };
  severity: RiskSeverity;
  signals: RiskSignal[];
  suggestions: string[];
}

/**
 * Configuration for risk detection thresholds.
 */
export interface RiskConfig {
  /** Days without activity before an item is considered stale. Default: 14 */
  staleDays: number;
  /** Days before deadline to trigger a warning. Default: 7 */
  deadlineWarningDays: number;
  /** Comment threshold for scope creep warning. Default: 30 */
  maxCommentsBeforeScopeWarning: number;
  /** Max open issues per assignee before overload warning. Default: 10 */
  maxAssignedIssuesPerPerson: number;
  /** Days without review activity before a PR is considered stale. Default: 3 */
  prStaleReviewDays: number;
  /** Whether risk detection is enabled. Default: true */
  enabled: boolean;
}

/**
 * Options for risk analysis.
 */
export interface AnalysisOptions {
  /** If true, fetches ALL issues/PRs via pagination. Default: false (quick mode, 30 items) */
  comprehensive?: boolean;
}

/**
 * Filters for getting at-risk items.
 */
export interface RiskFilters {
  riskType?: RiskType;
  severity?: RiskSeverity;
  itemType?: 'issue' | 'pr';
  assignee?: string;
}

/**
 * Default configuration for risk detection.
 */
const DEFAULT_CONFIG: RiskConfig = {
  staleDays: 14,
  deadlineWarningDays: 7,
  maxCommentsBeforeScopeWarning: 30,
  maxAssignedIssuesPerPerson: 10,
  prStaleReviewDays: 3,
  enabled: true,
};

/**
 * Type guard for GitHubPullRequest.
 */
function isPullRequest(item: GitHubIssue | GitHubPullRequest): item is GitHubPullRequest {
  return 'head' in item && 'base' in item;
}

/**
 * Service for detecting risk signals in GitHub issues and pull requests.
 */
export class RiskDetectionService {
  private config: RiskConfig;

  constructor(config?: Partial<RiskConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate the number of days since a given date string.
   */
  getDaysSinceUpdate(updatedAt: string): number {
    const now = new Date();
    const lastActivity = new Date(updatedAt);
    const millisPerDay = 1000 * 60 * 60 * 24;
    return (now.getTime() - lastActivity.getTime()) / millisPerDay;
  }

  /**
   * Check if an item is stale based on days threshold.
   */
  isStale(updatedAt: string, thresholdDays: number): boolean {
    const daysSince = this.getDaysSinceUpdate(updatedAt);
    return daysSince > thresholdDays;
  }

  /**
   * Detect stale signals for an issue or PR.
   */
  detectStaleSignals(item: GitHubIssue | GitHubPullRequest): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const daysSinceUpdate = this.getDaysSinceUpdate(item.updated_at);

    // Check if it's a PR awaiting review
    if (isPullRequest(item)) {
      const hasRequestedReviewers =
        item.requested_reviewers && item.requested_reviewers.length > 0;

      if (hasRequestedReviewers) {
        // Use prStaleReviewDays for PRs awaiting review
        if (daysSinceUpdate > this.config.prStaleReviewDays) {
          const severity: RiskSeverity =
            daysSinceUpdate > this.config.prStaleReviewDays * 2 ? 'critical' : 'warning';
          signals.push({
            type: 'stale',
            description: `PR awaiting review for ${Math.floor(daysSinceUpdate)} days`,
            value: Math.floor(daysSinceUpdate),
            severity,
          });
        }
        return signals;
      }
    }

    // Standard stale check
    if (daysSinceUpdate > this.config.staleDays) {
      // Critical if stale for more than 2x the threshold (e.g., 30+ days for default 14)
      const severity: RiskSeverity =
        daysSinceUpdate > this.config.staleDays * 2 ? 'critical' : 'warning';

      signals.push({
        type: 'stale',
        description: `No activity for ${Math.floor(daysSinceUpdate)} days`,
        value: Math.floor(daysSinceUpdate),
        severity,
      });
    }

    return signals;
  }

  /**
   * Labels that indicate blocked or waiting status.
   */
  private static readonly BLOCKED_LABELS = [
    'blocked',
    'waiting',
    'on-hold',
    'waiting-for-response',
  ];

  /**
   * Patterns that indicate blocking references in text.
   */
  private static readonly BLOCKING_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
    { pattern: /blocked by #\d+/i, description: 'blocked by' },
    { pattern: /waiting on/i, description: 'waiting on' },
    { pattern: /depends on/i, description: 'depends on' },
    { pattern: /blocked until/i, description: 'blocked until' },
  ];

  /**
   * Detect blocked signals for an issue or PR.
   */
  detectBlockedSignals(item: GitHubIssue | GitHubPullRequest): RiskSignal[] {
    const signals: RiskSignal[] = [];

    // Check for blocked labels - both GitHubIssue and GitHubPullRequest have labels
    const labels = item.labels || [];
    for (const label of labels) {
      const labelName = typeof label === 'string' ? label : label.name || '';
      const normalizedLabel = labelName.toLowerCase();

      if (RiskDetectionService.BLOCKED_LABELS.includes(normalizedLabel)) {
        signals.push({
          type: 'blocked',
          description: `Has '${labelName}' label`,
          value: labelName,
          severity: normalizedLabel === 'blocked' ? 'critical' : 'warning',
        });
        break; // Only report one label-based signal
      }
    }

    // Check for blocking patterns in body
    const body = item.body || '';
    for (const { pattern, description } of RiskDetectionService.BLOCKING_PATTERNS) {
      if (pattern.test(body)) {
        // Don't add duplicate if we already have a label-based blocked signal
        if (signals.length === 0 || signals.some((s) => s.description.includes(description))) {
          // Already captured
        } else {
          signals.push({
            type: 'blocked',
            description: `Contains "${description}" reference`,
            severity: 'warning',
          });
          break; // Only report one pattern-based signal to avoid noise
        }
        // If no label signal, add the pattern signal
        if (signals.length === 0) {
          signals.push({
            type: 'blocked',
            description: `Contains "${description}" reference`,
            severity: 'warning',
          });
          break;
        }
      }
    }

    // PR-specific blocked checks
    if (isPullRequest(item)) {
      // Check for draft status
      if (item.draft) {
        signals.push({
          type: 'blocked',
          description: 'PR is in draft status',
          severity: 'info',
        });
      }

      // Check for merge conflicts
      if (item.mergeable === false) {
        signals.push({
          type: 'blocked',
          description: 'PR has merge conflicts',
          severity: 'warning',
        });
      }
    }

    return signals;
  }

  /**
   * Calculate the number of days until a given date string.
   * Returns negative values for past dates.
   */
  getDaysUntilDate(dateString: string): number {
    const now = new Date();
    const targetDate = new Date(dateString);
    const millisPerDay = 1000 * 60 * 60 * 24;
    return (targetDate.getTime() - now.getTime()) / millisPerDay;
  }

  /**
   * Detect deadline risk signals for an issue.
   */
  detectDeadlineSignals(
    item: GitHubIssue & { milestone?: { title: string; due_on: string | null } }
  ): RiskSignal[] {
    const signals: RiskSignal[] = [];

    // Check for milestone deadline
    const milestone = item.milestone;
    if (!milestone || !milestone.due_on) {
      return signals;
    }

    const daysUntilDue = this.getDaysUntilDate(milestone.due_on);

    // Past due - critical severity
    if (daysUntilDue < 0) {
      signals.push({
        type: 'deadline',
        description: `Milestone "${milestone.title}" is overdue by ${Math.abs(Math.floor(daysUntilDue))} days`,
        value: Math.floor(daysUntilDue),
        severity: 'critical',
      });
      return signals;
    }

    // Very imminent (within 2 days) - critical severity
    if (daysUntilDue <= 2) {
      signals.push({
        type: 'deadline',
        description: `Milestone "${milestone.title}" due in ${Math.floor(daysUntilDue)} days`,
        value: Math.floor(daysUntilDue),
        severity: 'critical',
      });
      return signals;
    }

    // Within warning window - warning severity
    if (daysUntilDue <= this.config.deadlineWarningDays) {
      signals.push({
        type: 'deadline',
        description: `Milestone "${milestone.title}" due in ${Math.floor(daysUntilDue)} days`,
        value: Math.floor(daysUntilDue),
        severity: 'warning',
      });
    }

    return signals;
  }

  /**
   * Large PR threshold for scope warning (lines changed).
   */
  private static readonly LARGE_PR_THRESHOLD = 500;

  /**
   * Very large PR threshold for critical severity (lines changed).
   */
  private static readonly VERY_LARGE_PR_THRESHOLD = 1000;

  /**
   * Detect scope risk signals for an issue or PR.
   */
  detectScopeSignals(
    item: (GitHubIssue & { comments?: number }) | (GitHubPullRequest & { additions?: number; deletions?: number })
  ): RiskSignal[] {
    const signals: RiskSignal[] = [];

    // For issues, check comment count for scope creep
    if (!isPullRequest(item)) {
      const issueWithComments = item as GitHubIssue & { comments?: number };
      const commentCount = issueWithComments.comments ?? 0;

      if (commentCount > this.config.maxCommentsBeforeScopeWarning) {
        const severity: RiskSeverity =
          commentCount > this.config.maxCommentsBeforeScopeWarning * 2 ? 'critical' : 'warning';

        signals.push({
          type: 'scope',
          description: `Issue has ${commentCount} comments - possible scope creep`,
          value: commentCount,
          severity,
        });
      }
    }

    // For PRs, check lines changed
    if (isPullRequest(item)) {
      const prWithChanges = item as GitHubPullRequest & { additions?: number; deletions?: number };
      const additions = prWithChanges.additions ?? 0;
      const deletions = prWithChanges.deletions ?? 0;
      const totalChanges = additions + deletions;

      if (totalChanges >= RiskDetectionService.VERY_LARGE_PR_THRESHOLD) {
        signals.push({
          type: 'scope',
          description: `PR has ${totalChanges} lines changed - consider splitting`,
          value: totalChanges,
          severity: 'critical',
        });
      } else if (totalChanges >= RiskDetectionService.LARGE_PR_THRESHOLD) {
        signals.push({
          type: 'scope',
          description: `PR has ${totalChanges} lines changed - consider splitting`,
          value: totalChanges,
          severity: 'warning',
        });
      }
    }

    return signals;
  }

  /**
   * High-priority label patterns that indicate an issue needs urgent attention.
   */
  private static readonly HIGH_PRIORITY_PATTERNS = [
    /^priority[:\-]?high$/i,
    /^high[:\-]?priority$/i,
    /^urgent$/i,
    /^P1$/i,
    /^priority[:\-]?1$/i,
  ];

  /**
   * Critical priority label patterns.
   */
  private static readonly CRITICAL_PRIORITY_PATTERNS = [
    /^priority[:\-]?critical$/i,
    /^critical$/i,
    /^P0$/i,
    /^priority[:\-]?0$/i,
    /^blocker$/i,
  ];

  /**
   * Detect assignment risk signals for an issue.
   */
  detectAssignmentSignals(
    item: GitHubIssue & { assignee?: { login: string; html_url: string } | null }
  ): RiskSignal[] {
    const signals: RiskSignal[] = [];

    // Check if issue is assigned
    const isAssigned = item.assignee != null;
    if (isAssigned) {
      return signals; // Assigned issues don't have assignment risks
    }

    // Check labels for priority
    const labels = item.labels || [];
    let isCriticalPriority = false;
    let isHighPriority = false;

    for (const label of labels) {
      const labelName = typeof label === 'string' ? label : label.name || '';

      // Check critical priority first (higher severity)
      if (RiskDetectionService.CRITICAL_PRIORITY_PATTERNS.some((p) => p.test(labelName))) {
        isCriticalPriority = true;
        break;
      }

      // Check high priority
      if (RiskDetectionService.HIGH_PRIORITY_PATTERNS.some((p) => p.test(labelName))) {
        isHighPriority = true;
      }
    }

    if (isCriticalPriority) {
      signals.push({
        type: 'assignment',
        description: 'Critical-priority issue is unassigned',
        severity: 'critical',
      });
    } else if (isHighPriority) {
      signals.push({
        type: 'assignment',
        description: 'High-priority issue is unassigned',
        severity: 'warning',
      });
    }

    return signals;
  }

  /**
   * Result of detecting overloaded assignees.
   */
  detectOverloadedAssignees(
    issues: Array<GitHubIssue & { assignee?: { login: string; html_url: string } | null }>
  ): Array<{ assignee: string; issueCount: number; severity: RiskSeverity }> {
    const assigneeCounts = new Map<string, number>();

    // Count issues per assignee
    for (const issue of issues) {
      if (issue.assignee) {
        const login = issue.assignee.login;
        assigneeCounts.set(login, (assigneeCounts.get(login) || 0) + 1);
      }
    }

    // Find overloaded assignees
    const overloaded: Array<{ assignee: string; issueCount: number; severity: RiskSeverity }> = [];

    for (const [assignee, count] of assigneeCounts) {
      if (count > this.config.maxAssignedIssuesPerPerson) {
        const severity: RiskSeverity =
          count > this.config.maxAssignedIssuesPerPerson * 2 ? 'critical' : 'warning';

        overloaded.push({
          assignee,
          issueCount: count,
          severity,
        });
      }
    }

    return overloaded;
  }
}

/**
 * Get the highest severity from a list of signals.
 */
export function getHighestSeverity(signals: RiskSignal[]): RiskSeverity {
  if (signals.some((s) => s.severity === 'critical')) return 'critical';
  if (signals.some((s) => s.severity === 'warning')) return 'warning';
  return 'info';
}

/**
 * Generate suggestions based on risk signals.
 */
export function generateSuggestions(signals: RiskSignal[]): string[] {
  const suggestions: string[] = [];

  for (const signal of signals) {
    switch (signal.type) {
      case 'stale':
        suggestions.push('Consider commenting to update the status or closing if no longer relevant');
        break;
      case 'blocked':
        suggestions.push('Review blocking dependencies and update status when unblocked');
        break;
      case 'deadline':
        if (signal.severity === 'critical') {
          suggestions.push('Urgently review scope and timeline - deadline is imminent or overdue');
        } else {
          suggestions.push('Review progress against deadline and adjust priorities if needed');
        }
        break;
      case 'scope':
        suggestions.push('Consider breaking this into smaller, more manageable pieces');
        break;
      case 'assignment':
        suggestions.push('Assign someone to this high-priority item');
        break;
    }
  }

  return [...new Set(suggestions)]; // Remove duplicates
}

/**
 * Analyze items and collect risk signals.
 */
export function analyzeItems(
  service: RiskDetectionService,
  issues: ExtendedGitHubIssue[],
  pullRequests: ExtendedGitHubPullRequest[]
): RiskItem[] {
  const risks: RiskItem[] = [];

  // Analyze issues
  for (const issue of issues) {
    const signals: RiskSignal[] = [
      ...service.detectStaleSignals(issue),
      ...service.detectBlockedSignals(issue),
      ...service.detectDeadlineSignals(issue),
      ...service.detectScopeSignals(issue),
      ...service.detectAssignmentSignals(issue),
    ];

    if (signals.length > 0) {
      const highestSeverity = getHighestSeverity(signals);
      risks.push({
        item: {
          type: 'issue',
          number: issue.number,
          title: issue.title,
          url: issue.html_url,
          assignee: issue.assignee?.login,
        },
        severity: highestSeverity,
        signals,
        suggestions: generateSuggestions(signals),
      });
    }
  }

  // Analyze pull requests
  for (const pr of pullRequests) {
    const signals: RiskSignal[] = [
      ...service.detectStaleSignals(pr),
      ...service.detectBlockedSignals(pr),
      ...service.detectScopeSignals(pr),
    ];

    if (signals.length > 0) {
      const highestSeverity = getHighestSeverity(signals);
      risks.push({
        item: {
          type: 'pr',
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          assignee: pr.user?.login,
        },
        severity: highestSeverity,
        signals,
        suggestions: generateSuggestions(signals),
      });
    }
  }

  return risks;
}
