import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';
import { getCurrentProject } from '../utils/projectConfig';
import { getIssueWithComments } from '../services/github';
import {
  RiskDetectionService,
  getHighestSeverity,
  generateSuggestions,
  type RiskSignal,
  type ExtendedGitHubIssue,
} from '../services/riskDetectionService';

/**
 * Analyze a specific issue for risks.
 */
async function analyzeIssueRisks(issueNumber: number): Promise<CommandResult> {
  const currentProject = await getCurrentProject();

  if (!currentProject || !currentProject.github_repo) {
    return {
      content: '❌ No active project with GitHub repository. Use /project to set an active project first.',
      success: false
    };
  }

  const [owner, repo] = currentProject.github_repo.split('/');
  if (!owner || !repo) {
    return {
      content: `❌ Invalid GitHub repository format: ${currentProject.github_repo}. Expected format: owner/repo`,
      success: false
    };
  }

  try {
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

    // Format output
    const severityEmoji = severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : severity === 'info' ? '🔵' : '✅';

    let content = `${severityEmoji} **Issue #${issue.number}: ${issue.title}**\n\n`;
    content += `**URL**: ${issue.html_url}\n`;
    content += `**State**: ${issue.state}\n`;
    if (issue.assignee) {
      content += `**Assignee**: ${issue.assignee.login}\n`;
    }
    content += `**Comments**: ${comments.length}\n\n`;

    if (signals.length === 0) {
      content += `✅ This issue looks healthy! No risk signals detected.\n`;
    } else {
      content += `## ⚠️ Risk Signals (${signals.length})\n\n`;
      for (const signal of signals) {
        const signalEmoji = signal.severity === 'critical' ? '🔴' : signal.severity === 'warning' ? '🟡' : '🔵';
        content += `- ${signalEmoji} **${signal.type}**: ${signal.description}\n`;
      }
      content += '\n';

      if (suggestions.length > 0) {
        content += `## 💡 Suggestions\n\n`;
        for (const suggestion of suggestions) {
          content += `- ${suggestion}\n`;
        }
      }
    }

    return {
      content,
      success: true
    };
  } catch (error) {
    debug('Error analyzing issue risks:', error);
    return {
      content: `❌ Failed to analyze issue #${issueNumber}: ${error instanceof Error ? error.message : String(error)}`,
      success: false
    };
  }
}

export const issueCommand: Command = {
  name: 'issue',
  description: 'Analyze GitHub issues for the current project',
  execute: async (args: string[]): Promise<CommandResult> => {
    debug('Executing /issue command with args:', args);

    if (args.length === 0) {
      return {
        content: `🐛 **Issue Commands:**

/issue help - Show this help message
/issue <number> - Analyze a specific issue for risks
/issue risks <number> - Analyze a specific issue for risks

**Examples:**
• /issue 123 - Show risk analysis for issue #123
• /issue risks 456 - Same as above`,
        success: true
      };
    }

    const subCommand = args[0]?.toLowerCase();

    // Check if first argument is a number (shorthand for /issue risks <number>)
    const firstArgAsNumber = parseInt(args[0] || '', 10);
    if (!isNaN(firstArgAsNumber) && firstArgAsNumber > 0) {
      return analyzeIssueRisks(firstArgAsNumber);
    }

    switch (subCommand) {
      case 'help': {
        return {
          content: `🐛 **Issue Commands:**

/issue help - Show this help message
/issue <number> - Analyze a specific issue for risks
/issue risks <number> - Analyze a specific issue for risks (explicit form)

**Risk Types Detected:**
- **stale**: No activity for extended period
- **blocked**: Has blocking labels or dependencies
- **deadline**: Milestone deadline approaching or overdue
- **scope**: Large issue with many comments (scope creep)
- **assignment**: High-priority issue without assignee

**Examples:**
• /issue 123 - Show risk analysis for issue #123
• /issue risks 456 - Same as above`,
          success: true
        };
      }

      case 'risks': {
        if (args.length < 2) {
          return {
            content: '❌ Usage: /issue risks <issue-number>\n\nExample: /issue risks 123',
            success: false
          };
        }

        const issueNumber = parseInt(args[1] || '', 10);
        if (isNaN(issueNumber) || issueNumber <= 0) {
          return {
            content: `❌ Invalid issue number: ${args[1]}. Please provide a positive integer.`,
            success: false
          };
        }

        return analyzeIssueRisks(issueNumber);
      }

      default:
        return {
          content: `❌ Unknown subcommand or invalid issue number: ${subCommand}\n\nUsage:\n• /issue <number> - Analyze issue for risks\n• /issue risks <number> - Analyze issue for risks\n• /issue help - Show help`,
          success: false
        };
    }
  }
};
