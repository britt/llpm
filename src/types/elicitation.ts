/**
 * Supported project domains for requirement elicitation.
 * Each domain has specific question sets and focus areas.
 */
export type ProjectDomain =
  | 'web-app'
  | 'api'
  | 'full-stack'
  | 'cli'
  | 'mobile'
  | 'data-pipeline'
  | 'library'
  | 'infrastructure'
  | 'ai-ml'
  | 'general';

/**
 * Status of an elicitation section.
 */
export type SectionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/**
 * Status of an elicitation session.
 */
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

/**
 * A recorded answer to a requirement question.
 */
export interface RequirementAnswer {
  questionId: string;
  question: string;
  answer: string;
  timestamp: string;
  section: string;
  followUpTriggered?: boolean;
}

/**
 * A section within the elicitation process.
 */
export interface ElicitationSection {
  id: string;
  name: string;
  status: SectionStatus;
  answers: RequirementAnswer[];
  currentQuestionIndex: number;
}

/**
 * An elicitation session tracking all state.
 */
export interface ElicitationSession {
  id: string;
  projectId: string;
  domain: ProjectDomain;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  sections: ElicitationSection[];
  currentSectionId: string;
  status: SessionStatus;
}

/**
 * Question definition with branching logic.
 */
export interface ElicitationQuestion {
  id: string;
  section: string;
  question: string;
  description?: string;
  required: boolean;
  followUpCondition?: {
    pattern: RegExp | string;
    questions: string[];
  };
}

/**
 * Domain-specific question set.
 */
export interface DomainQuestionSet {
  domain: ProjectDomain;
  name: string;
  description: string;
  sections: {
    id: string;
    name: string;
    questions: ElicitationQuestion[];
  }[];
}
