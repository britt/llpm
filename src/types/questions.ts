/**
 * Types for the Context-Aware Question Generator feature
 *
 * This module defines the data structures for questions generated from
 * project context analysis (issues, PRs, notes, codebase).
 */

// Question categorization
export type QuestionCategory =
  | 'requirements'
  | 'technical'
  | 'documentation'
  | 'process'
  | 'consistency'
  | 'architecture';

// Question priority levels
export type QuestionPriority = 'high' | 'medium' | 'low';

// Source types where questions can originate
export type QuestionSourceType =
  | 'issue'
  | 'pr'
  | 'file'
  | 'note'
  | 'readme'
  | 'project-scan'
  | 'architecture';

// Source reference for a question
export interface QuestionSource {
  type: QuestionSourceType;
  reference: string;
  url?: string;
}

// Core question structure
export interface Question {
  id: string;
  category: QuestionCategory;
  priority: QuestionPriority;
  question: string;
  context: string;
  source: QuestionSource;
  suggestedAction?: string;
  requiresScan?: boolean;
}

// Input type for creating questions (without id)
export type QuestionInput = Omit<Question, 'id'>;

// Type guard to check if an object is a valid Question
export function isQuestion(obj: unknown): obj is Question {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const q = obj as Partial<Question>;

  return (
    typeof q.id === 'string' &&
    typeof q.category === 'string' &&
    typeof q.priority === 'string' &&
    typeof q.question === 'string' &&
    typeof q.context === 'string' &&
    typeof q.source === 'object' &&
    q.source !== null &&
    typeof q.source.type === 'string' &&
    typeof q.source.reference === 'string'
  );
}

// Factory function to create questions with unique IDs
let questionCounter = 0;
export function createQuestion(input: QuestionInput): Question {
  return {
    id: `q${Date.now()}_${++questionCounter}`,
    ...input,
  };
}

// Summary of analyzed sources
export interface SourcesAnalyzed {
  issues: number;
  pullRequests: number;
  files: number;
  notes: number;
  readme: boolean;
  projectScan: boolean;
}

// Summary of generated questions
export interface QuestionsSummary {
  total: number;
  byCategory: Record<QuestionCategory, number>;
  byPriority: Record<QuestionPriority, number>;
}

// Result structure for project-wide analysis
export interface ProjectQuestionsResult {
  questions: Question[];
  sourcesAnalyzed: SourcesAnalyzed;
  summary: QuestionsSummary;
  timestamp: string;
}

// Result structure for issue-specific analysis
export interface IssueQuestionsResult {
  issueNumber: number;
  questions: Question[];
  summary: QuestionsSummary;
  timestamp: string;
}

// Result structure for information gaps analysis
export interface InformationGapsResult {
  gaps: Question[];
  summary: QuestionsSummary;
  timestamp: string;
}

// Result structure for clarifications analysis
export interface ClarificationsResult {
  clarifications: Question[];
  summary: QuestionsSummary;
  timestamp: string;
}
