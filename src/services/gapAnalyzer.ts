/**
 * GapAnalyzer Service
 *
 * Analyzes GitHub issues for information gaps and generates clarifying questions.
 * Detects missing acceptance criteria, vague descriptions, missing labels, etc.
 */

import type { GitHubIssue, GitHubIssueComment } from './github';
import { createQuestion, type Question, type QuestionInput } from '../types/questions';
import { debug } from '../utils/logger';

/**
 * Result of analyzing a GitHub issue for gaps
 */
export interface IssueAnalysisResult {
  questions: Question[];
}

/**
 * Service for analyzing GitHub issues for information gaps
 */
export class GapAnalyzer {
  constructor() {
    debug('GapAnalyzer initialized');
  }

  /**
   * Analyze a GitHub issue for information gaps and generate questions
   *
   * @param issue The GitHub issue to analyze
   * @param comments Comments on the issue
   * @returns Analysis result with generated questions
   */
  async analyzeIssue(
    issue: GitHubIssue,
    _comments: GitHubIssueComment[]
  ): Promise<IssueAnalysisResult> {
    debug(`Analyzing issue #${issue.number}: ${issue.title}`);
    const questions: Question[] = [];

    // Check for missing acceptance criteria
    if (!this.checkAcceptanceCriteria(issue.body)) {
      const questionInput: QuestionInput = {
        category: 'requirements',
        priority: 'high',
        question: 'What are the acceptance criteria for this issue?',
        context: `Issue #${issue.number} is missing acceptance criteria. Clear acceptance criteria help ensure the implementation meets requirements.`,
        source: {
          type: 'issue',
          reference: `#${issue.number}`,
          url: issue.html_url,
        },
        suggestedAction: 'Add an "Acceptance Criteria" section with specific, testable criteria.',
      };
      questions.push(createQuestion(questionInput));
    }

    // Check for vague description
    if (this.checkVagueDescription(issue.body)) {
      const questionInput: QuestionInput = {
        category: 'requirements',
        priority: 'high',
        question: 'Can you provide more details about this issue?',
        context: `Issue #${issue.number} has a very brief description. More context will help with implementation.`,
        source: {
          type: 'issue',
          reference: `#${issue.number}`,
          url: issue.html_url,
        },
        suggestedAction: 'Add sections for Problem, Expected Behavior, and Steps to Reproduce (if applicable).',
      };
      questions.push(createQuestion(questionInput));
    }

    // Check for missing labels
    if (issue.labels.length === 0) {
      const questionInput: QuestionInput = {
        category: 'process',
        priority: 'medium',
        question: 'What labels should be applied to this issue?',
        context: `Issue #${issue.number} has no labels. Labels help with organization and prioritization.`,
        source: {
          type: 'issue',
          reference: `#${issue.number}`,
          url: issue.html_url,
        },
        suggestedAction: 'Add labels like "bug", "enhancement", "documentation", or priority labels.',
      };
      questions.push(createQuestion(questionInput));
    }

    // Check for missing assignee on open issues
    if (issue.state === 'open' && !issue.assignee) {
      const questionInput: QuestionInput = {
        category: 'process',
        priority: 'low',
        question: `Who should be assigned to issue #${issue.number}?`,
        context: `Open issue "${issue.title}" has no assignee.`,
        source: {
          type: 'issue',
          reference: `#${issue.number}`,
          url: issue.html_url,
        },
        suggestedAction: 'Assign someone to own this issue',
      };
      questions.push(createQuestion(questionInput));
    }

    // Check for stale issues (no updates in 30+ days)
    const lastUpdated = new Date(issue.updated_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (issue.state === 'open' && lastUpdated < thirtyDaysAgo) {
      const questionInput: QuestionInput = {
        category: 'process',
        priority: 'medium',
        question: `Is issue #${issue.number} still relevant?`,
        context: `Issue "${issue.title}" hasn't been updated in over 30 days.`,
        source: {
          type: 'issue',
          reference: `#${issue.number}`,
          url: issue.html_url,
        },
        suggestedAction: 'Review and update status, or close if no longer needed',
      };
      questions.push(createQuestion(questionInput));
    }

    // Prioritize and return
    const prioritized = this.prioritizeQuestions(questions);
    debug(`Generated ${prioritized.length} questions for issue #${issue.number}`);

    return { questions: prioritized };
  }

  /**
   * Check if issue body contains acceptance criteria
   *
   * @param body Issue body text
   * @returns True if acceptance criteria are present
   */
  checkAcceptanceCriteria(body: string | null): boolean {
    if (!body) {
      return false;
    }

    const lowerBody = body.toLowerCase();

    // Check for common acceptance criteria patterns (text-based)
    const textPatterns = [
      'acceptance criteria',
      'acceptance criterion',
      'ac:',
      'done when',
      'definition of done',
      'dod:',
    ];

    if (textPatterns.some(pattern => lowerBody.includes(pattern))) {
      return true;
    }

    // Check for checkbox patterns (regex-based)
    const checkboxPattern = /\[\s*[x ]\s*\]/i;
    return checkboxPattern.test(body);
  }

  /**
   * Check if issue description is too vague or short
   *
   * @param body Issue body text
   * @returns True if description is vague
   */
  checkVagueDescription(body: string | null): boolean {
    if (!body) {
      return true;
    }

    // Flag very short descriptions (less than 100 characters)
    if (body.trim().length < 100) {
      return true;
    }

    return false;
  }

  /**
   * Sort questions by priority (high, medium, low)
   *
   * @param questions Questions to prioritize
   * @returns Sorted questions
   */
  prioritizeQuestions(questions: Question[]): Question[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    return [...questions].sort((a, b) => {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
}
