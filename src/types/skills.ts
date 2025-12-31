/**
 * Skill system types for LLPM
 *
 * Implements the Agent Skills specification from agentskills.io
 * https://agentskills.io/specification
 */

/**
 * Skill metadata from YAML frontmatter (Agent Skills spec)
 */
export interface SkillFrontmatter {
  /**
   * Unique skill identifier
   * - 1-64 characters
   * - Lowercase letters, numbers, hyphens only
   * - Cannot start/end with hyphen or contain consecutive hyphens
   * - Must match parent directory name
   */
  name: string;

  /**
   * Brief summary of what the skill does and when to use it
   * - 1-1024 characters
   * - Should include keywords helping agents identify relevant tasks
   */
  description: string;

  /**
   * Optional: License for the skill
   * Can reference bundled license file (e.g., "Apache-2.0")
   */
  license?: string;

  /**
   * Optional: Environment requirements (1-500 chars if included)
   * Indicates products, system packages, network access needed
   */
  compatibility?: string;

  /**
   * Optional: Arbitrary key-value string mapping for additional properties
   * Recommended to use unique key names to avoid conflicts
   */
  metadata?: Record<string, string>;

  /**
   * Optional (Experimental): Space-delimited list of pre-approved tools
   * Example: "Bash(git:*) Bash(jq:*) Read"
   */
  'allowed-tools'?: string;
}

/**
 * Represents a fully loaded Skill
 */
export interface Skill {
  /** Skill name from frontmatter */
  name: string;

  /** Description from frontmatter */
  description: string;

  /** Full markdown content (excluding frontmatter) */
  content: string;

  /** Source type: user, project, or system */
  source: SkillSource;

  /** Absolute path to skill folder */
  path: string;

  /** License (if specified) */
  license?: string;

  /** Compatibility requirements (if specified) */
  compatibility?: string;

  /** Additional metadata */
  metadata?: Record<string, string>;

  /** Allowed tools list (parsed from space-delimited string) */
  allowedTools?: string[];

  /** Whether this skill is currently enabled */
  enabled: boolean;
}

/**
 * Source types for skills (where they were discovered)
 */
export type SkillSource = 'user' | 'project' | 'system';

/**
 * Result of skill validation
 */
export interface SkillValidationResult {
  /** Whether the skill is valid */
  valid: boolean;

  /** List of validation errors (if any) */
  errors: string[];

  /** List of validation warnings (non-fatal issues) */
  warnings?: string[];

  /** Parsed skill (if valid) */
  skill?: Skill;
}

/**
 * Skill metadata for progressive disclosure (loaded at startup)
 * Only name and description to minimize token usage (~100 tokens)
 */
export interface SkillMetadata {
  /** Skill name */
  name: string;

  /** Skill description */
  description: string;

  /** Source type */
  source: SkillSource;

  /** Path to skill directory */
  path: string;
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

  /**
   * Paths to scan for skills (in order of priority)
   * Standard paths per Agent Skills spec:
   * - Project-local: .skills/ or skills/
   * - User-global: ~/.config/llpm/skills/ or ~/.llpm/skills/
   * - System: /usr/share/llpm/skills/ (optional)
   */
  paths: string[];

  /** Whether to enforce allowed-tools restrictions */
  enforceAllowedTools: boolean;
}

/**
 * Telemetry events for skills lifecycle
 */
export type SkillEvent =
  | { type: 'skill.discovered'; skillName: string; source: SkillSource }
  | { type: 'skill.validation_error'; skillName: string; errors: string[] }
  | { type: 'skill.validation_warning'; skillName: string; warnings: string[] }
  | { type: 'skill.selected'; skillName: string; rationale: string }
  | { type: 'skill.loaded'; skillName: string }
  | { type: 'skill.denied_tool'; skillName: string; toolName: string }
  | { type: 'skill.applied_to_prompt'; skillName: string };
