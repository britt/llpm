/**
 * Context-Aware Question Generator Tools
 *
 * These tools are exposed to the LLM for generating questions about project context.
 * Each tool's `description` field is a @prompt that instructs the LLM
 * on when and how to use the tool.
 */
import { tool } from './instrumentedTool';
import * as z from 'zod';
import { getCurrentProject } from '../utils/projectConfig';
import { listIssues } from '../services/github';
import { GapAnalyzer } from '../services/gapAnalyzer';
import type { Question, QuestionPriority } from '../types/questions';
import { debug } from '../utils/logger';

const PRIORITY_LEVELS: Record<QuestionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

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
        const minLevel = PRIORITY_LEVELS[min_priority];
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
