/**
 * SkillRegistry: Central service for managing Skills in LLPM
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
  SkillEvent
} from '../types/skills';
import { parseSkillFile, applyVariableSubstitution } from '../utils/skillParser';
import { EventEmitter } from 'events';

/**
 * Default skills configuration
 */
const DEFAULT_CONFIG: SkillsConfig = {
  enabled: true,
  limit: 3,
  paths: ['~/.llpm/skills', '.llpm/skills'],
  requireConfirmationOnDeniedTool: true,
  minActivationScore: 0.3
};

/**
 * SkillRegistry manages the lifecycle of skills
 */
export class SkillRegistry extends EventEmitter {
  private skills: Map<string, Skill> = new Map();
  private config: SkillsConfig;
  private activeSkills: Set<string> = new Set();

  constructor(config: Partial<SkillsConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Scan configured paths and discover all valid skills
   */
  async scan(): Promise<void> {
    this.skills.clear();

    for (const configPath of this.config.paths) {
      const expandedPath = configPath.replace(/^~/, homedir());

      // Determine source type based on path
      const source = expandedPath.includes('.llpm/skills')
        ? 'project'
        : 'personal';

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
    source: 'personal' | 'project'
  ): Promise<void> {
    const result = await parseSkillFile(skillPath, source);

    if (!result.valid) {
      this.emit('skill.validation_error', {
        type: 'skill.validation_error',
        skillName: skillPath,
        errors: result.errors
      } as SkillEvent);
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
   * This uses a simple keyword-based approach for MVP.
   * Future: semantic similarity via vector search.
   */
  findRelevant(context: SkillActivationContext): SkillActivationResult[] {
    const results: SkillActivationResult[] = [];

    for (const skill of this.skills.values()) {
      if (!skill.enabled) continue;

      const score = this.calculateRelevanceScore(skill, context);

      if (score >= (this.config.minActivationScore || 0)) {
        results.push({
          skill,
          score,
          rationale: this.generateRationale(skill, context, score)
        });
      }
    }

    // Sort by score descending and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, this.config.limit);
  }

  /**
   * Calculate relevance score for a skill given context
   *
   * MVP: Simple keyword matching
   * Future: Semantic similarity with embeddings
   */
  private calculateRelevanceScore(
    skill: Skill,
    context: SkillActivationContext
  ): number {
    const userMessageLower = context.userMessage.toLowerCase();
    const descriptionLower = skill.description.toLowerCase();
    const nameLower = skill.name.toLowerCase();

    let score = 0;

    // Exact name match = high score
    if (userMessageLower.includes(nameLower)) {
      score += 0.5;
    }

    // Tag matches
    if (skill.tags) {
      for (const tag of skill.tags) {
        if (userMessageLower.includes(tag.toLowerCase())) {
          score += 0.2;
        }
      }
    }

    // Description keyword overlap
    const descriptionWords = descriptionLower.split(/\s+/);
    const messageWords = userMessageLower.split(/\s+/);

    const overlap = descriptionWords.filter(word =>
      word.length > 3 && messageWords.includes(word)
    ).length;

    const overlapRatio = overlap / Math.max(descriptionWords.length, 1);
    score += overlapRatio * 0.4;

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Generate a brief rationale for why a skill was selected
   */
  private generateRationale(
    skill: Skill,
    context: SkillActivationContext,
    score: number
  ): string {
    const parts: string[] = [];

    if (context.userMessage.toLowerCase().includes(skill.name.toLowerCase())) {
      parts.push('name match');
    }

    if (skill.tags?.some(tag => context.userMessage.toLowerCase().includes(tag.toLowerCase()))) {
      parts.push('tag match');
    }

    if (parts.length === 0) {
      parts.push('description similarity');
    }

    return parts.join(', ');
  }

  /**
   * Activate a skill for the current session
   */
  activateSkill(skillName: string): void {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    this.activeSkills.add(skillName);

    // Emit activation event
    this.emit('skill.activated', {
      type: 'skill.activated',
      skillName,
      score: 1.0,
      rationale: 'manually activated'
    } as SkillEvent);
  }

  /**
   * Deactivate a skill
   */
  deactivateSkill(skillName: string): void {
    this.activeSkills.delete(skillName);

    this.emit('skill.deactivated', {
      type: 'skill.deactivated',
      skillName
    } as SkillEvent);
  }

  /**
   * Get all active skills
   */
  getActiveSkills(): Skill[] {
    return Array.from(this.activeSkills)
      .map(name => this.skills.get(name))
      .filter((s): s is Skill => s !== undefined);
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
      this.deactivateSkill(name); // Also deactivate if currently active
    }
  }

  /**
   * Check if a tool is allowed for currently active skills
   *
   * Returns:
   * - true: tool is allowed
   * - false: tool is denied (requires confirmation)
   */
  isToolAllowed(toolName: string): boolean {
    const activeSkills = this.getActiveSkills();

    // If no skills have allowed_tools restrictions, allow all
    const skillsWithRestrictions = activeSkills.filter(s => s.allowed_tools);
    if (skillsWithRestrictions.length === 0) {
      return true;
    }

    // Check if ANY active skill allows this tool
    for (const skill of skillsWithRestrictions) {
      if (skill.allowed_tools?.includes(toolName)) {
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
   * Generate augmented prompt content for active skills
   */
  async generatePromptAugmentation(): Promise<string> {
    const activeSkills = this.getActiveSkills();

    if (activeSkills.length === 0) {
      return '';
    }

    const sections: string[] = [];

    sections.push('# Active Skills\n');
    sections.push('The following skills are currently active. Follow their instructions:\n');

    for (const skill of activeSkills) {
      sections.push(`\n## Skill: ${skill.name}`);
      sections.push(`${skill.description}\n`);

      // Apply variable substitution
      let content = skill.content;
      if (skill.vars) {
        content = applyVariableSubstitution(content, skill.vars);
      }

      sections.push(content);

      // Emit event
      this.emit('skill.applied_to_prompt', {
        type: 'skill.applied_to_prompt',
        skillName: skill.name,
        promptSection: 'system'
      } as SkillEvent);
    }

    return sections.join('\n');
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
