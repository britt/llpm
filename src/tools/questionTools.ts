/**
 * Context-Aware Question Generator Tools
 *
 * These tools are exposed to the LLM for generating questions about project context.
 * Each tool's `description` field is a @prompt that instructs the LLM
 * on when and how to use the tool.
 */
import { tool } from './instrumentedTool';
import * as z from 'zod';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getCurrentProject } from '../utils/projectConfig';
import { loadProjectScan } from '../services/projectScanBackend';
import { listIssues, getIssueWithComments } from '../services/github';
import { GapAnalyzer } from '../services/gapAnalyzer';
import { createQuestion, type Question, type QuestionPriority } from '../types/questions';
import { debug } from '../utils/logger';

const PRIORITY_LEVELS: Record<QuestionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Minimum README length (in characters) before flagging as incomplete */
const MIN_README_LENGTH = 500;

/**
 * @prompt Tool: generate_project_questions
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const generateProjectQuestionsTool = tool({
  description: `Analyze the current project's context and generate prioritized questions to surface information gaps.

This tool scans:
- Open GitHub issues for missing acceptance criteria, vague descriptions, missing labels
- Project scan data (if available) for documentation gaps and architecture questions
- Project notes for inconsistencies

Use this when:
- User asks "what questions should I be asking?"
- User asks "what am I missing?"
- User wants to identify gaps in their project documentation or issues

Returns questions grouped by category and sorted by priority.`,

  inputSchema: z.object({
    categories: z.array(z.enum([
      'requirements', 'technical', 'documentation', 'process', 'consistency', 'architecture'
    ])).optional().describe('Filter questions to specific categories'),
    min_priority: z.enum(['high', 'medium', 'low']).optional().describe('Minimum priority level to include'),
    max_questions: z.number().optional().default(20).describe('Maximum number of questions to return'),
    include_issues: z.boolean().optional().default(true).describe('Whether to analyze GitHub issues'),
  }),

  execute: async ({ categories, min_priority, max_questions = 20, include_issues = true }) => {
    debug('generate_project_questions called with:', { categories, min_priority, max_questions });

    try {
      const project = await getCurrentProject();

      if (!project) {
        return {
          success: false,
          error: 'No active project set. Use /project to set an active project first.',
          questions: [],
        };
      }

      const analyzer = new GapAnalyzer();
      let allQuestions: Question[] = [];

      // Analyze project context (includes project scan if available)
      const projectAnalysis = await analyzer.analyzeProjectContext();
      allQuestions.push(...projectAnalysis.questions);

      // Analyze GitHub issues if requested and repo is configured
      if (include_issues && project.github_repo) {
        try {
          const [owner, repo] = project.github_repo.split('/');
          if (owner && repo) {
            const issues = await listIssues(owner, repo, { state: 'open', per_page: 30 });

            for (const issue of issues) {
              const issueAnalysis = await analyzer.analyzeIssue(issue, []);
              allQuestions.push(...issueAnalysis.questions);
            }
          }
        } catch (error) {
          debug('Error analyzing GitHub issues:', error);
          // Continue without issue analysis
        }
      }

      // Filter by categories if specified
      if (categories && categories.length > 0) {
        allQuestions = allQuestions.filter(q => categories.includes(q.category));
      }

      // Filter by minimum priority if specified
      if (min_priority) {
        // min_priority is validated by Zod as 'high' | 'medium' | 'low', but TypeScript
        // infers it with undefined due to .optional(). The if-check ensures it's defined.
        const minLevel = PRIORITY_LEVELS[min_priority as QuestionPriority];
        allQuestions = allQuestions.filter(q => PRIORITY_LEVELS[q.priority] <= minLevel);
      }

      // Prioritize and limit
      const prioritizedQuestions = analyzer.prioritizeQuestions(allQuestions).slice(0, max_questions);

      // Build summary
      const summary = {
        totalQuestions: prioritizedQuestions.length,
        byCategory: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
      };

      for (const q of prioritizedQuestions) {
        summary.byCategory[q.category] = (summary.byCategory[q.category] || 0) + 1;
        summary.byPriority[q.priority] = (summary.byPriority[q.priority] || 0) + 1;
      }

      return {
        success: true,
        project: project.name,
        scannedAt: new Date().toISOString(),
        projectScanAvailable: projectAnalysis.projectScanAvailable,
        sourcesAnalyzed: projectAnalysis.sourcesAnalyzed,
        questions: prioritizedQuestions,
        summary,
      };

    } catch (error) {
      debug('Error in generate_project_questions:', error);
      return {
        success: false,
        error: `Failed to generate questions: ${error instanceof Error ? error.message : String(error)}`,
        questions: [],
      };
    }
  },
});

/**
 * @prompt Tool: generate_issue_questions
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const generateIssueQuestionsTool = tool({
  description: `Analyze a specific GitHub issue and generate questions to identify gaps or clarify requirements.

This tool examines:
- Issue description completeness
- Presence of acceptance criteria
- Label and assignee status
- Comment thread for context

Use this when:
- User asks "are there any gaps in issue #X?"
- User wants to review an issue before starting work
- User needs to understand what's unclear about an issue

Returns targeted questions specific to the issue.`,

  inputSchema: z.object({
    issue_number: z.number().describe('The GitHub issue number to analyze'),
  }),

  execute: async ({ issue_number }) => {
    debug('generate_issue_questions called for issue:', issue_number);

    try {
      const project = await getCurrentProject();

      if (!project) {
        return {
          success: false,
          error: 'No active project set. Use /project to set an active project first.',
          issueNumber: issue_number,
          issueTitle: '',
          questions: [],
        };
      }

      if (!project.github_repo) {
        return {
          success: false,
          error: 'Current project does not have a GitHub repository configured.',
          issueNumber: issue_number,
          issueTitle: '',
          questions: [],
        };
      }

      const [owner, repo] = project.github_repo.split('/');
      if (!owner || !repo) {
        return {
          success: false,
          error: `Invalid GitHub repository format: ${project.github_repo}`,
          issueNumber: issue_number,
          issueTitle: '',
          questions: [],
        };
      }

      // Fetch the issue with comments
      const { issue, comments } = await getIssueWithComments(owner, repo, issue_number, {
        includeComments: true,
        commentsPerPage: 100,
      });

      const analyzer = new GapAnalyzer();
      const analysis = await analyzer.analyzeIssue(issue, comments);

      // Build summary
      const summary = {
        totalQuestions: analysis.questions.length,
        byCategory: {} as Record<string, number>,
      };

      for (const q of analysis.questions) {
        summary.byCategory[q.category] = (summary.byCategory[q.category] || 0) + 1;
      }

      return {
        success: true,
        issueNumber: issue.number,
        issueTitle: issue.title,
        issueUrl: issue.html_url,
        questions: analysis.questions,
        summary,
      };

    } catch (error) {
      debug('Error in generate_issue_questions:', error);
      return {
        success: false,
        error: `Failed to analyze issue: ${error instanceof Error ? error.message : String(error)}`,
        issueNumber: issue_number,
        issueTitle: '',
        questions: [],
      };
    }
  },
});

/**
 * @prompt Tool: suggest_clarifications
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const suggestClarificationsTool = tool({
  description: `Analyze a draft (issue, PR, document) and suggest clarifications before submission.

Use this when:
- User says "help me improve this issue before I submit it"
- User asks "what's missing from this?"
- User wants feedback on a draft before posting

Returns suggestions for what to clarify or add.`,

  inputSchema: z.object({
    draft_type: z.enum(['issue', 'pr', 'note', 'document']).describe('Type of draft being reviewed'),
    content: z.string().describe('The draft content to analyze'),
    title: z.string().optional().describe('Optional title of the draft'),
  }),

  execute: async ({ draft_type, content, title }) => {
    debug('suggest_clarifications called for:', { draft_type, title });

    const questions: Question[] = [];

    // Analyze based on draft type
    if (draft_type === 'issue') {
      // Check for acceptance criteria
      if (!content.toLowerCase().includes('acceptance criteria') &&
          !content.toLowerCase().includes('done when') &&
          !/\[\s*[x ]\s*\]/.test(content)) {
        questions.push(createQuestion({
          category: 'requirements',
          priority: 'high',
          question: 'What are the acceptance criteria for this issue?',
          context: 'Issue draft lacks acceptance criteria.',
          source: { type: 'issue', reference: 'draft' },
          suggestedAction: 'Add an "Acceptance Criteria" section with checkboxes',
        }));
      }

      // Check for short content
      if (content.length < 100) {
        questions.push(createQuestion({
          category: 'requirements',
          priority: 'high',
          question: 'Can you provide more detail about this issue?',
          context: 'The description is very brief.',
          source: { type: 'issue', reference: 'draft' },
          suggestedAction: 'Add problem description, expected behavior, and context',
        }));
      }

      // Check for bug-related issues missing reproduction steps
      if ((title?.toLowerCase().includes('bug') || content.toLowerCase().includes('bug')) &&
          !content.toLowerCase().includes('reproduce') &&
          !content.toLowerCase().includes('steps')) {
        questions.push(createQuestion({
          category: 'requirements',
          priority: 'medium',
          question: 'How can this bug be reproduced?',
          context: 'Bug report lacks reproduction steps.',
          source: { type: 'issue', reference: 'draft' },
          suggestedAction: 'Add "Steps to Reproduce" section',
        }));
      }
    } else if (draft_type === 'pr') {
      // Check for linked issue
      if (!content.match(/#\d+/) && !content.toLowerCase().includes('fixes') &&
          !content.toLowerCase().includes('closes')) {
        questions.push(createQuestion({
          category: 'process',
          priority: 'medium',
          question: 'Which issue does this PR address?',
          context: 'PR draft does not reference any issues.',
          source: { type: 'pr', reference: 'draft' },
          suggestedAction: 'Add "Fixes #123" or link to related issue',
        }));
      }

      // Check for testing info
      const lowerContent = content.toLowerCase();
      const testingTerms = ['test', 'verified', 'validated', 'qa', 'checked', 'confirm'];
      const hasTestingInfo = testingTerms.some(term => lowerContent.includes(term));
      if (!hasTestingInfo) {
        questions.push(createQuestion({
          category: 'technical',
          priority: 'medium',
          question: 'How was this change tested?',
          context: 'PR draft does not mention testing or verification.',
          source: { type: 'pr', reference: 'draft' },
          suggestedAction: 'Add a "Testing" section describing how changes were verified',
        }));
      }
    }

    const summary = {
      totalClarifications: questions.length,
      byCategory: {} as Record<string, number>,
    };

    for (const q of questions) {
      summary.byCategory[q.category] = (summary.byCategory[q.category] || 0) + 1;
    }

    return {
      success: true,
      draftType: draft_type,
      clarifications: questions,
      summary,
    };
  },
});

/**
 * Analyze README content for common gaps
 */
function analyzeReadme(content: string): Question[] {
  const questions: Question[] = [];
  const lowerContent = content.toLowerCase();

  // Check for installation/setup section
  if (!lowerContent.includes('install') && !lowerContent.includes('setup') && !lowerContent.includes('getting started')) {
    questions.push(createQuestion({
      category: 'documentation',
      priority: 'high',
      question: 'How do users install or set up this project?',
      context: 'README lacks installation or setup instructions.',
      source: { type: 'readme', reference: 'README.md' },
      suggestedAction: 'Add an Installation or Getting Started section',
    }));
  }

  // Check for usage examples
  if (!lowerContent.includes('usage') && !lowerContent.includes('example') && !content.includes('```')) {
    questions.push(createQuestion({
      category: 'documentation',
      priority: 'medium',
      question: 'How do users use this project?',
      context: 'README lacks usage examples or code snippets.',
      source: { type: 'readme', reference: 'README.md' },
      suggestedAction: 'Add usage examples with code blocks',
    }));
  }

  // Check for very short README
  if (content.length < MIN_README_LENGTH) {
    questions.push(createQuestion({
      category: 'documentation',
      priority: 'medium',
      question: 'Is the README complete?',
      context: 'README is quite short and may be missing important information.',
      source: { type: 'readme', reference: 'README.md' },
      suggestedAction: 'Expand README with project overview, features, and contribution guidelines',
    }));
  }

  // Check for license info
  if (!lowerContent.includes('license')) {
    questions.push(createQuestion({
      category: 'documentation',
      priority: 'low',
      question: 'What license is this project under?',
      context: 'README does not mention licensing.',
      source: { type: 'readme', reference: 'README.md' },
      suggestedAction: 'Add a License section or reference LICENSE file',
    }));
  }

  return questions;
}

/**
 * @prompt Tool: identify_information_gaps
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const identifyInformationGapsTool = tool({
  description: `Scan a specific target (README, documentation, codebase) for information gaps.

Use this when:
- User asks "what's missing from our documentation?"
- User asks "what's unclear about the README?"
- User wants to identify gaps in a specific area

Returns questions about missing or unclear information in the target.`,

  inputSchema: z.object({
    target: z.enum(['readme', 'documentation', 'codebase']).describe('What to analyze for gaps'),
  }),

  execute: async ({ target }) => {
    debug('identify_information_gaps called for target:', target);

    try {
      const project = await getCurrentProject();

      if (!project) {
        return {
          success: false,
          error: 'No active project set.',
          target,
          gaps: [],
        };
      }

      const questions: Question[] = [];

      if (target === 'readme') {
        const readmePath = join(project.path, 'README.md');

        if (!existsSync(readmePath)) {
          questions.push(createQuestion({
            category: 'documentation',
            priority: 'high',
            question: 'Should this project have a README?',
            context: 'No README.md file found in the project root.',
            source: { type: 'readme', reference: 'README.md' },
            suggestedAction: 'Create a README.md with project overview, setup instructions, and usage examples',
          }));
        } else {
          try {
            const content = await readFile(readmePath, 'utf-8');
            questions.push(...analyzeReadme(content));
          } catch {
            questions.push(createQuestion({
              category: 'documentation',
              priority: 'medium',
              question: 'Could not read README - is it accessible?',
              context: 'Failed to read README.md file.',
              source: { type: 'readme', reference: 'README.md' },
            }));
          }
        }
      } else if (target === 'documentation') {
        // Check for docs directory
        const docsPath = join(project.path, 'docs');
        if (!existsSync(docsPath)) {
          questions.push(createQuestion({
            category: 'documentation',
            priority: 'medium',
            question: 'Should this project have a docs/ directory?',
            context: 'No dedicated documentation directory found.',
            source: { type: 'file', reference: 'docs/' },
            suggestedAction: 'Create a docs/ directory with API reference, guides, or architecture docs',
          }));
        }

        // Leverage project scan if available
        const scan = await loadProjectScan(project.id);
        if (scan) {
          if (!scan.documentation.hasDocumentation) {
            questions.push(createQuestion({
              category: 'documentation',
              priority: 'medium',
              question: 'What documentation does this project need?',
              context: 'Project scan found no documentation files.',
              source: { type: 'project-scan', reference: 'project.json#documentation' },
            }));
          }
        }
      } else if (target === 'codebase') {
        const scan = await loadProjectScan(project.id);
        if (!scan) {
          questions.push(createQuestion({
            category: 'documentation',
            priority: 'medium',
            question: 'Run a project scan for codebase analysis?',
            context: 'No project scan available. Run /project scan first.',
            source: { type: 'project-scan', reference: 'project.json' },
            suggestedAction: 'Run /project scan to analyze codebase',
            requiresScan: true,
          }));
        } else {
          // Analyze inline docs coverage
          if (scan.documentation.inlineDocsCoverage === 'none') {
            questions.push(createQuestion({
              category: 'documentation',
              priority: 'medium',
              question: 'Should inline documentation be added?',
              context: 'No inline documentation (comments/docstrings) found.',
              source: { type: 'project-scan', reference: 'project.json#documentation.inlineDocsCoverage' },
              suggestedAction: 'Add JSDoc/docstrings to exported functions',
            }));
          }

          // Check key files for missing summaries
          const undocumented = scan.keyFiles.filter(f => !f.summary);
          if (undocumented.length > 0) {
            questions.push(createQuestion({
              category: 'documentation',
              priority: 'low',
              question: `What do these ${undocumented.length} key files do?`,
              context: `Key files without descriptions: ${undocumented.slice(0, 5).map(f => f.path).join(', ')}`,
              source: { type: 'project-scan', reference: 'project.json#keyFiles' },
            }));
          }
        }
      }

      const summary = {
        totalGaps: questions.length,
        byCategory: {} as Record<string, number>,
      };

      for (const q of questions) {
        summary.byCategory[q.category] = (summary.byCategory[q.category] || 0) + 1;
      }

      return {
        success: true,
        target,
        gaps: questions,
        summary,
      };

    } catch (error) {
      debug('Error in identify_information_gaps:', error);
      return {
        success: false,
        error: `Failed to identify gaps: ${error instanceof Error ? error.message : String(error)}`,
        target,
        gaps: [],
      };
    }
  },
});
