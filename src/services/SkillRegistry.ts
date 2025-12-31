/**
 * SkillRegistry: Central service for managing Skills in LLPM
 *
 * Implements the Agent Skills specification from agentskills.io
 * https://agentskills.io/specification
 *
 * Responsibilities:
 * - Discover skills from configured paths
 * - Parse and validate SKILL.md files
 * - Select relevant skills based on context
 * - Enforce tool permissions
 * - Emit telemetry events
 */
import { readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import type {
  Skill,
  SkillsConfig,
  SkillActivationContext,
  SkillActivationResult,
  SkillEvent,
  SkillMetadata,
  SkillSource
} from '../types/skills';
import { parseSkillFile, parseSkillMetadata } from '../utils/skillParser';
import { EventEmitter } from 'events';

/**
 * Default skills configuration per Agent Skills spec
 * Discovery paths (in order of priority):
 * - Project-local: .skills/ or skills/
 * - User-global: ~/.config/llpm/skills/ or ~/.llpm/skills/
 */
const DEFAULT_CONFIG: SkillsConfig = {
  enabled: true,
  maxSkillsPerPrompt: 3,
  paths: [
    '.skills',           // Project-local (Agent Skills spec)
    'skills',            // Project-local alternative
    '~/.config/llpm/skills',  // User-global (XDG standard)
    '~/.llpm/skills'     // User-global fallback
  ],
  enforceAllowedTools: true
};

/**
 * SkillRegistry manages the lifecycle of skills
 */
export class SkillRegistry extends EventEmitter {
  private skills: Map<string, Skill> = new Map();
  private skillMetadata: Map<string, SkillMetadata> = new Map();
  private config: SkillsConfig;

  constructor(config: Partial<SkillsConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Determine source type based on path
   * Per Agent Skills spec:
   * - 'project': .skills/ or skills/ in current directory
   * - 'user': ~/.config/llpm/skills/ or ~/.llpm/skills/
   * - 'system': /usr/share/llpm/skills/ (optional)
   */
  private determineSource(path: string): SkillSource {
    const expandedPath = path.replace(/^~/, homedir());

    // System-level skills
    if (expandedPath.startsWith('/usr/share/') || expandedPath.startsWith('/opt/')) {
      return 'system';
    }

    // User-level skills (in home directory)
    if (expandedPath.includes('.config/llpm/skills') || expandedPath.includes('.llpm/skills')) {
      return 'user';
    }

    // Project-level skills (relative paths or in current project)
    return 'project';
  }

  /**
   * Quick scan to load only skill metadata (progressive disclosure)
   * This is called at startup to minimize token usage (~100 tokens per skill)
   */
  async scanMetadata(): Promise<void> {
    this.skillMetadata.clear();

    for (const configPath of this.config.paths) {
      const expandedPath = configPath.replace(/^~/, homedir());
      const source = this.determineSource(configPath);

      if (!existsSync(expandedPath)) {
        continue;
      }

      try {
        const entries = await readdir(expandedPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const skillPath = join(expandedPath, entry.name);
          const metadata = await parseSkillMetadata(skillPath, source);

          if (metadata) {
            this.skillMetadata.set(metadata.name, metadata);
          }
        }
      } catch (error) {
        // Silent fail for metadata scanning
      }
    }
  }

  /**
   * Scan configured paths and discover all valid skills
   */
  async scan(): Promise<void> {
    this.skills.clear();

    for (const configPath of this.config.paths) {
      const expandedPath = configPath.replace(/^~/, homedir());
      const source = this.determineSource(configPath);

      if (!existsSync(expandedPath)) {
        continue; // Skip non-existent paths
      }

      try {
        // Read all subdirectories (each is a potential skill)
        const entries = await readdir(expandedPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const skillPath = join(expandedPath, entry.name);
          await this.loadSkill(skillPath, source);
        }
      } catch (error) {
        console.error(`Failed to scan skills path ${expandedPath}:`, error);
      }
    }
  }

  /**
   * Load a single skill from a directory
   */
  private async loadSkill(
    skillPath: string,
    source: SkillSource
  ): Promise<void> {
    // Check if SKILL.md exists - if not, skip silently (allows organizational directories)
    const skillFilePath = join(skillPath, 'SKILL.md');
    if (!existsSync(skillFilePath)) {
      return; // Not a skill directory, just skip
    }

    const result = await parseSkillFile(skillPath, source);

    if (!result.valid) {
      this.emit('skill.validation_error', {
        type: 'skill.validation_error',
        skillName: skillPath,
        errors: result.errors
      } as SkillEvent);

      // Also emit warnings if present
      if (result.warnings?.length) {
        this.emit('skill.validation_warning', {
          type: 'skill.validation_warning',
          skillName: skillPath,
          warnings: result.warnings
        } as SkillEvent);
      }
      return;
    }

    const skill = result.skill!;

    // Store skill
    this.skills.set(skill.name, skill);

    // Emit discovery event
    this.emit('skill.discovered', {
      type: 'skill.discovered',
      skillName: skill.name,
      source: skill.source
    } as SkillEvent);
  }

  /**
   * Find skills relevant to the current context
   *
   * Uses binary matching: a skill either matches or doesn't (no scoring)
   * Matching criteria:
   * 1. User message contains skill name
   * 2. User message contains any skill tag
   */
  findRelevant(context: SkillActivationContext): SkillActivationResult[] {
    const results: SkillActivationResult[] = [];

    for (const skill of this.skills.values()) {
      if (!skill.enabled) continue;

      const match = this.checkMatch(skill, context);
      if (match) {
        results.push({
          skill,
          rationale: match.reason
        });
      }
    }

    // Sort alphabetically (deterministic without scores)
    results.sort((a, b) => a.skill.name.localeCompare(b.skill.name));

    // Apply limit
    return results.slice(0, this.config.maxSkillsPerPrompt);
  }

  /**
   * Check if a skill matches the context (binary yes/no)
   * Agent Skills spec relies on description keywords for matching
   */
  private checkMatch(
    skill: Skill,
    context: SkillActivationContext
  ): { reason: string } | null {
    const userMessageLower = context.userMessage.toLowerCase();

    // Check 1: Skill name in message
    if (userMessageLower.includes(skill.name.toLowerCase())) {
      return { reason: 'name match' };
    }

    // Check 2: Description keyword overlap
    // Extract meaningful words from description (>3 chars, not common words)
    const commonWords = new Set(['the', 'this', 'that', 'with', 'from', 'have', 'been', 'will', 'when', 'what', 'which', 'your', 'they', 'them', 'then', 'than', 'into', 'some', 'such', 'only', 'also', 'over', 'more', 'most', 'just', 'each', 'both', 'here', 'there', 'where', 'about', 'after', 'before', 'because', 'through', 'should', 'could', 'would', 'these', 'those', 'other', 'first', 'second', 'third']);

    const descriptionWords = skill.description
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^a-z]/g, ''))
      .filter(w => w.length > 3 && !commonWords.has(w));

    const messageWords = new Set(
      userMessageLower
        .split(/\s+/)
        .map(w => w.replace(/[^a-z]/g, ''))
        .filter(w => w.length > 3)
    );

    const matchedKeyword = descriptionWords.find(word => messageWords.has(word));
    if (matchedKeyword) {
      return { reason: `keyword: ${matchedKeyword}` };
    }

    return null;
  }


  /**
   * Get all discovered skills
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get a skill by name
   */
  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * Enable a skill
   */
  enableSkill(name: string): void {
    const skill = this.skills.get(name);
    if (skill) {
      skill.enabled = true;
    }
  }

  /**
   * Disable a skill
   */
  disableSkill(name: string): void {
    const skill = this.skills.get(name);
    if (skill) {
      skill.enabled = false;
    }
  }

  /**
   * Check if a tool is allowed for given skills
   *
   * Per Agent Skills spec, allowed-tools is an experimental feature.
   * Returns:
   * - true: tool is allowed
   * - false: tool is denied (requires confirmation if enforceAllowedTools is true)
   */
  isToolAllowed(toolName: string, selectedSkills: Skill[] = []): boolean {
    // Skip enforcement if disabled in config
    if (!this.config.enforceAllowedTools) {
      return true;
    }

    // If no skills have allowedTools restrictions, allow all
    const skillsWithRestrictions = selectedSkills.filter(s => s.allowedTools && s.allowedTools.length > 0);
    if (skillsWithRestrictions.length === 0) {
      return true;
    }

    // Check if ANY selected skill allows this tool
    // Supports exact match and pattern matching (e.g., "Bash(git:*)")
    for (const skill of skillsWithRestrictions) {
      if (this.matchesTool(toolName, skill.allowedTools!)) {
        return true;
      }
    }

    // Tool is not in any allowed list - emit denial event
    for (const skill of skillsWithRestrictions) {
      this.emit('skill.denied_tool', {
        type: 'skill.denied_tool',
        skillName: skill.name,
        toolName
      } as SkillEvent);
    }

    return false;
  }

  /**
   * Check if a tool name matches any of the allowed tool patterns
   * Supports:
   * - Exact match: "Read" matches "Read"
   * - Pattern match: "Bash(git:*)" matches "Bash" with git commands
   */
  private matchesTool(toolName: string, allowedTools: string[]): boolean {
    for (const pattern of allowedTools) {
      // Exact match
      if (pattern === toolName) {
        return true;
      }

      // Pattern match for tool with command restrictions like "Bash(git:*)"
      const patternMatch = pattern.match(/^(\w+)\((.+)\)$/);
      if (patternMatch) {
        const [, baseTool, commandPattern] = patternMatch;
        if (baseTool === toolName) {
          // For now, if the base tool matches, allow it
          // Full command pattern matching would require more context
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate augmented prompt content for selected skills
   * Per Agent Skills spec, this includes the full skill content
   */
  async generatePromptAugmentation(selectedSkills: Skill[]): Promise<string> {
    if (selectedSkills.length === 0) {
      return '';
    }

    const sections: string[] = [];

    for (const skill of selectedSkills) {
      sections.push(`## ${skill.name}`);
      sections.push(`${skill.description}\n`);
      sections.push(skill.content);
      sections.push(''); // Empty line between skills

      // Emit event
      this.emit('skill.applied_to_prompt', {
        type: 'skill.applied_to_prompt',
        skillName: skill.name
      } as SkillEvent);
    }

    return sections.join('\n').trim();
  }

  /**
   * Get all skill metadata (for progressive disclosure)
   * This returns lightweight metadata loaded at startup
   */
  getAllMetadata(): SkillMetadata[] {
    return Array.from(this.skillMetadata.values());
  }

  /**
   * Get skill metadata by name
   */
  getMetadata(name: string): SkillMetadata | undefined {
    return this.skillMetadata.get(name);
  }

  /**
   * Load a skill on demand by name (progressive disclosure)
   * Returns the full skill content when needed
   */
  async loadSkillByName(name: string): Promise<Skill | null> {
    // Check if already loaded
    const existing = this.skills.get(name);
    if (existing) {
      this.emit('skill.loaded', {
        type: 'skill.loaded',
        skillName: name
      } as SkillEvent);
      return existing;
    }

    // Check if we have metadata for this skill
    const metadata = this.skillMetadata.get(name);
    if (!metadata) {
      return null;
    }

    // Load the full skill
    const result = await parseSkillFile(metadata.path, metadata.source);
    if (!result.valid || !result.skill) {
      return null;
    }

    // Cache the loaded skill
    this.skills.set(name, result.skill);

    this.emit('skill.loaded', {
      type: 'skill.loaded',
      skillName: name
    } as SkillEvent);

    return result.skill;
  }

  /**
   * Get current configuration
   */
  getConfig(): SkillsConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SkillsConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Global registry instance
let globalRegistry: SkillRegistry | null = null;

/**
 * Get or create the global skill registry
 */
export function getSkillRegistry(config?: Partial<SkillsConfig>): SkillRegistry {
  if (!globalRegistry) {
    globalRegistry = new SkillRegistry(config);
  } else if (config) {
    globalRegistry.updateConfig(config);
  }
  return globalRegistry;
}
