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
  maxSkillsPerPrompt: 3,
  paths: ['~/.llpm/skills', '.llpm/skills'],
  requireConfirmationOnDeniedTool: true
};

/**
 * SkillRegistry manages the lifecycle of skills
 */
export class SkillRegistry extends EventEmitter {
  private skills: Map<string, Skill> = new Map();
  private config: SkillsConfig;

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
   * Uses binary matching: a skill either matches or doesn't (no scoring)
   * Matching criteria:
   * 1. User message contains skill name
   * 2. User message contains any skill tag
   * 3. User message has keyword overlap with description
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

    // Check 2: Any tag in message
    if (skill.tags) {
      for (const tag of skill.tags) {
        if (userMessageLower.includes(tag.toLowerCase())) {
          return { reason: `tag: ${tag}` };
        }
      }
    }

    // Check 3: Description keyword overlap
    const descriptionWords = skill.description
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3);
    const messageWords = userMessageLower.split(/\s+/);
    const hasOverlap = descriptionWords.some(word => messageWords.includes(word));

    if (hasOverlap) {
      return { reason: 'description keywords' };
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
   * Returns:
   * - true: tool is allowed
   * - false: tool is denied (requires confirmation)
   */
  isToolAllowed(toolName: string, selectedSkills: Skill[] = []): boolean {
    // If no skills have allowed_tools restrictions, allow all
    const skillsWithRestrictions = selectedSkills.filter(s => s.allowed_tools);
    if (skillsWithRestrictions.length === 0) {
      return true;
    }

    // Check if ANY selected skill allows this tool
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
   * Generate augmented prompt content for selected skills
   */
  async generatePromptAugmentation(selectedSkills: Skill[]): Promise<string> {
    if (selectedSkills.length === 0) {
      return '';
    }

    const sections: string[] = [];

    sections.push('# Selected Skills\n');
    sections.push('The following skills have been selected for this prompt. Follow their instructions:\n');

    for (const skill of selectedSkills) {
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
