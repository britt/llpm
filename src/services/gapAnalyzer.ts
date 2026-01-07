/**
 * GapAnalyzer Service
 *
 * Analyzes GitHub issues for information gaps and generates clarifying questions.
 * Detects missing acceptance criteria, vague descriptions, missing labels, etc.
 */

import type { GitHubIssue, GitHubIssueComment } from './github';
import { createQuestion, type Question, type QuestionInput } from '../types/questions';
import { debug } from '../utils/logger';
import { getCurrentProject } from '../utils/projectConfig';
import { loadProjectScan } from './projectScanBackend';
import type { ProjectScan } from '../types/projectScan';

/**
 * Result of analyzing a GitHub issue for gaps
 */
export interface IssueAnalysisResult {
  questions: Question[];
}

/**
 * Result of analyzing project context for gaps
 */
export interface ProjectContextAnalysisResult {
  projectName: string;
  projectScanAvailable: boolean;
  scannedAt?: string;
  sourcesAnalyzed: {
    projectScan: boolean;
    readme: boolean;
    issues: { open: number; analyzed: number };
    notes: { total: number; analyzed: number };
  };
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

  /**
   * Analyze overall project context for information gaps
   *
   * @returns Analysis result with generated questions
   */
  async analyzeProjectContext(): Promise<ProjectContextAnalysisResult> {
    const project = await getCurrentProject();

    if (!project) {
      return {
        projectName: 'Unknown',
        projectScanAvailable: false,
        sourcesAnalyzed: {
          projectScan: false,
          readme: false,
          issues: { open: 0, analyzed: 0 },
          notes: { total: 0, analyzed: 0 },
        },
        questions: [createQuestion({
          category: 'process',
          priority: 'high',
          question: 'No active project is set. Which project would you like to analyze?',
          context: 'A project must be set to analyze context.',
          source: { type: 'project-scan', reference: 'config' },
          suggestedAction: 'Use /project to set an active project',
        })],
      };
    }

    const questions: Question[] = [];
    let projectScan: ProjectScan | null = null;

    try {
      projectScan = await loadProjectScan(project.id);
    } catch {
      debug('Could not load project scan');
    }

    if (!projectScan) {
      questions.push(createQuestion({
        category: 'documentation',
        priority: 'medium',
        question: 'Would you like to run a project scan for deeper analysis?',
        context: 'No project scan data is available. Running a scan will enable architecture-based questions.',
        source: { type: 'project-scan', reference: 'project.json' },
        suggestedAction: 'Run /project scan to generate project analysis',
        requiresScan: true,
      }));
    } else {
      questions.push(...this.analyzeProjectScan(projectScan));
    }

    return {
      projectName: project.name,
      projectScanAvailable: !!projectScan,
      scannedAt: projectScan?.scannedAt,
      sourcesAnalyzed: {
        projectScan: !!projectScan,
        readme: !!projectScan?.documentation.readmeSummary,
        issues: { open: 0, analyzed: 0 },
        notes: { total: 0, analyzed: 0 },
      },
      questions: this.prioritizeQuestions(questions),
    };
  }

  /**
   * Analyze project scan data for documentation and architecture gaps
   *
   * @param scan Project scan data
   * @returns Array of questions
   */
  private analyzeProjectScan(scan: ProjectScan): Question[] {
    const questions: Question[] = [];

    // Check for missing documentation
    if (!scan.documentation.hasDocumentation) {
      questions.push(createQuestion({
        category: 'documentation',
        priority: 'medium',
        question: 'Should documentation be added to this project?',
        context: 'The project scan found no documentation files.',
        source: { type: 'project-scan', reference: 'project.json#documentation' },
        suggestedAction: 'Create a README.md or docs/ directory',
      }));
    }

    // Check for low inline docs coverage
    if (scan.documentation.inlineDocsCoverage === 'none' ||
        scan.documentation.inlineDocsCoverage === 'sparse') {
      questions.push(createQuestion({
        category: 'documentation',
        priority: 'low',
        question: 'Should inline documentation be improved?',
        context: `Inline documentation coverage is "${scan.documentation.inlineDocsCoverage}".`,
        source: { type: 'project-scan', reference: 'project.json#documentation.inlineDocsCoverage' },
        suggestedAction: 'Add JSDoc/docstrings to key functions and modules',
      }));
    }

    // Check for missing architecture description
    if (!scan.architecture.description || scan.architecture.description.length < 50) {
      questions.push(createQuestion({
        category: 'architecture',
        priority: 'medium',
        question: 'What is the high-level architecture of this project?',
        context: 'The architecture description is missing or very brief.',
        source: { type: 'architecture', reference: 'project.json#architecture' },
        suggestedAction: 'Run a full project scan with LLM analysis',
      }));
    }

    // Check for key files without documentation
    const undocumentedKeyFiles = scan.keyFiles.filter(f => !f.summary || f.summary.length < 20);
    if (undocumentedKeyFiles.length > 0) {
      const fileList = undocumentedKeyFiles.slice(0, 3).map(f => f.path).join(', ');
      questions.push(createQuestion({
        category: 'documentation',
        priority: 'medium',
        question: `What do these key files do: ${fileList}?`,
        context: `${undocumentedKeyFiles.length} key files lack proper documentation.`,
        source: { type: 'project-scan', reference: 'project.json#keyFiles' },
        suggestedAction: 'Add documentation to key files',
      }));
    }

    // Check for empty overview summary
    if (!scan.overview.summary || scan.overview.summary.length < 20) {
      questions.push(createQuestion({
        category: 'documentation',
        priority: 'high',
        question: 'What does this project do?',
        context: 'The project lacks a clear summary of its purpose.',
        source: { type: 'project-scan', reference: 'project.json#overview.summary' },
        suggestedAction: 'Add a project summary to README or run full scan',
      }));
    }

    return questions;
  }
}
