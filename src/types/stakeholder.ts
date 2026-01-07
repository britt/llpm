/**
 * A goal with optional linked GitHub issues
 */
export interface StakeholderGoal {
  /** The goal text describing what the stakeholder wants to achieve */
  text: string;
  /** GitHub issue numbers linked to this goal */
  linkedIssues: number[];
}

/**
 * A stakeholder profile with goals, pain points, and priorities
 */
export interface Stakeholder {
  /** Unique name/identifier for the stakeholder */
  name: string;
  /** Role title (e.g., "Daily user", "Product decision maker") */
  role: string;
  /** Brief description of this stakeholder */
  description: string;
  /** What the stakeholder wants to achieve */
  goals: StakeholderGoal[];
  /** Current frustrations or problems */
  painPoints: string[];
  /** Ranked list of priorities (most important first) */
  priorities: string[];
}

/**
 * A documented resolution of a conflict between stakeholders
 */
export interface ConflictResolution {
  /** ISO 8601 date when the conflict was resolved */
  date: string;
  /** Name of first stakeholder in conflict */
  stakeholder1: string;
  /** Name of second stakeholder in conflict */
  stakeholder2: string;
  /** Description of the conflict */
  conflict: string;
  /** The resolution decision made */
  decision: string;
  /** Rationale for the decision */
  rationale: string;
}

/**
 * The complete stakeholder file structure
 */
export interface StakeholderFile {
  /** Schema version for future compatibility */
  version: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
  /** All stakeholder profiles */
  stakeholders: Stakeholder[];
  /** History of resolved conflicts */
  conflictResolutions: ConflictResolution[];
}

/**
 * Input for creating a new stakeholder
 */
export interface StakeholderInput {
  name: string;
  role: string;
  description: string;
  goals?: string[];
  painPoints?: string[];
  priorities?: string[];
}

/**
 * Partial update for an existing stakeholder
 */
export interface StakeholderUpdate {
  role?: string;
  description?: string;
  goals?: string[];
  painPoints?: string[];
  priorities?: string[];
}

/**
 * Summary of a stakeholder for listing
 */
export interface StakeholderSummary {
  name: string;
  role: string;
  goalCount: number;
  painPointCount: number;
  linkedIssueCount: number;
}

/**
 * Coverage status for a single goal
 */
export interface GoalCoverage {
  goal: string;
  linkedIssues: number[];
  status: 'covered' | 'gap';
}

/**
 * Coverage report for a single stakeholder
 */
export interface StakeholderCoverage {
  name: string;
  role: string;
  goals: GoalCoverage[];
  painPointsAddressed: { painPoint: string; issueNumber?: number }[];
  goalsCoveredPercent: number;
  painPointsAddressedPercent: number;
}

/**
 * A detected conflict between stakeholder priorities
 */
export interface DetectedConflict {
  stakeholder1: string;
  stakeholder2: string;
  priority1: string;
  priority2: string;
  description: string;
  relatedIssues: number[];
}

/**
 * Full coverage report
 */
export interface CoverageReport {
  generatedAt: string;
  stakeholders: StakeholderCoverage[];
  summary: {
    totalGoals: number;
    coveredGoals: number;
    gapGoals: number;
    overallCoveragePercent: number;
  };
  recommendedActions: string[];
}
