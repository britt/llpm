/**
 * Skill system types for LLPM
 *
 * Skills are reusable packages of instructions that Claude can invoke automatically
 * based on user intent and session context.
 */

/**
 * Skill metadata from YAML frontmatter
 */
export interface SkillFrontmatter {
  /** Unique skill identifier (lowercase letters, numbers, hyphens, <=64 chars) */
  name: string;

  /** Brief summary of what the skill does and when to use it (<=1024 chars) */
  description: string;

  /** Optional: Single-line instruction for when to use this skill */
  instructions?: string;

  /** Optional: List of allowed tools/MCP servers when this skill is active */
  allowed_tools?: string[];

  /** Optional: Tags for categorization */
  tags?: string[];

  /** Optional: Variables for simple templating (e.g., {{repoName}}) */
  vars?: Record<string, string>;

  /** Optional: List of resource file paths (relative to skill folder) */
  resources?: string[];
}

/**
 * Represents a fully loaded Skill
 */
export interface Skill {
  /** Skill name from frontmatter */
  name: string;

  /** Description from frontmatter */
  description: string;

  /** Single-line instruction for when to use this skill */
  instructions?: string;

  /** Full markdown content (excluding frontmatter) */
  content: string;

  /** Source type: personal or project */
  source: 'personal' | 'project';

  /** Absolute path to skill folder */
  path: string;

  /** Allowed tools list (if specified) */
  allowed_tools?: string[];

  /** Tags for categorization */
  tags?: string[];

  /** Template variables */
  vars?: Record<string, string>;

  /** Resource file paths */
  resources?: string[];

  /** Whether this skill is currently enabled */
  enabled: boolean;
}

/**
 * Result of skill validation
 */
export interface SkillValidationResult {
  /** Whether the skill is valid */
  valid: boolean;

  /** List of validation errors (if any) */
  errors: string[];

  /** Parsed skill (if valid) */
  skill?: Skill;
}

/**
 * Skill activation context
 */
export interface SkillActivationContext {
  /** User's current message/intent */
  userMessage: string;

  /** Recent conversation messages */
  conversationHistory?: Array<{ role: string; content: string }>;

  /** Current project context */
  projectContext?: string;

  /** Available tools in current session */
  availableTools?: string[];
}

/**
 * Result of skill selection
 */
export interface SkillActivationResult {
  /** Selected skill */
  skill: Skill;

  /** Brief rationale for why this skill was selected */
  rationale: string;
}

/**
 * Configuration for skills system
 */
export interface SkillsConfig {
  /** Whether skills are enabled globally */
  enabled: boolean;

  /** Maximum number of skills to include per prompt */
  maxSkillsPerPrompt: number;

  /** Paths to scan for skills */
  paths: string[];

  /** Whether to require confirmation when a tool is denied */
  requireConfirmationOnDeniedTool: boolean;
}

/**
 * Telemetry events for skills lifecycle
 */
export type SkillEvent =
  | { type: 'skill.discovered'; skillName: string; source: 'personal' | 'project' }
  | { type: 'skill.validation_error'; skillName: string; errors: string[] }
  | { type: 'skill.selected'; skillName: string; rationale: string }
  | { type: 'skill.denied_tool'; skillName: string; toolName: string }
  | { type: 'skill.applied_to_prompt'; skillName: string; promptSection: 'system' | 'assistant' };
