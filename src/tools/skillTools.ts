/**
 * Skills Management Tools
 *
 * These tools are exposed to the LLM for managing and loading skills.
 * Each tool's `description` field is a @prompt that instructs the LLM
 * on when and how to use the tool. The `inputSchema` descriptions are
 * also @prompt content that guide the LLM on parameter usage.
 */
import { z } from 'zod';
import { join } from 'path';
import { tool } from './instrumentedTool';
import { getSkillRegistry } from '../services/SkillRegistry';
import { MarketplaceService } from '../services/MarketplaceService';
import { CONFIG_FILE, CONFIG_DIR } from '../utils/config';
import { debug } from '../utils/logger';

/**
 * @prompt Tool: load_skills
 * Description and parameter descriptions sent to LLM explaining tool usage.
 * Use this tool when you need specific skills that weren't automatically selected,
 * or when you want to ensure certain skills are available for the current task.
 */
export const loadSkillsTool = tool({
  name: 'load_skills',
  description: `Load one or more skills to augment your current context with their instructions and guidelines.

Use this when:
- You need specialized instructions for a specific task
- You want to ensure certain guidelines are followed
- You need expertise from a particular skill domain
- You want to see what skills are available

Skills are injected as additional context and their instructions become part of your working knowledge for this conversation turn.`,

  inputSchema: z.object({
    skill_names: z.array(z.string())
      .min(1)
      .describe('Array of skill names to load (e.g., ["mermaid-diagrams", "user-story-template"])'),
    reason: z.string()
      .optional()
      .describe('Optional explanation of why you are loading these skills')
  }),

  execute: async ({ skill_names, reason }) => {
    debug('load_skills called with:', { skill_names, reason });

    const registry = getSkillRegistry();
    const results: Array<{ name: string; loaded: boolean; error?: string; description?: string }> = [];
    const loadedSkills: any[] = [];

    for (const skillName of skill_names) {
      const skill = registry.getSkill(skillName);

      if (!skill) {
        results.push({
          name: skillName,
          loaded: false,
          error: 'Skill not found'
        });
        continue;
      }

      if (!skill.enabled) {
        results.push({
          name: skillName,
          loaded: false,
          error: 'Skill is disabled'
        });
        continue;
      }

      loadedSkills.push(skill);
      results.push({
        name: skillName,
        loaded: true,
        description: skill.description
      });

      // Emit skill selected event for tracking
      registry.emit('skill.selected', {
        type: 'skill.selected',
        skillName: skill.name,
        rationale: reason || 'Explicitly loaded via load_skills tool'
      });
    }

    // Generate augmented content for successfully loaded skills
    let skillsContent = '';
    if (loadedSkills.length > 0) {
      skillsContent = await registry.generatePromptAugmentation(loadedSkills);
    }

    const successCount = results.filter(r => r.loaded).length;
    const failCount = results.filter(r => !r.loaded).length;

    const summary = [
      `Successfully loaded ${successCount} skill(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
      ''
    ];

    if (reason) {
      summary.push(`**Reason:** ${reason}`);
      summary.push('');
    }

    summary.push('**Results:**');
    for (const result of results) {
      if (result.loaded) {
        const skill = loadedSkills.find(s => s.name === result.name);
        summary.push(`  ✓ ${result.name}: ${result.description}`);
        if (skill?.instructions) {
          summary.push(`    Instructions: ${skill.instructions}`);
        }
      } else {
        summary.push(`  ✗ ${result.name}: ${result.error}`);
      }
    }

    if (successCount > 0) {
      summary.push('');
      summary.push('**Loaded Skills Content:**');
      summary.push(skillsContent);
    }

    return {
      success: successCount > 0,
      loaded_count: successCount,
      failed_count: failCount,
      results,
      skills_content: skillsContent,
      message: summary.join('\n')
    };
  }
});

/**
 * @prompt Tool: list_available_skills
 * Description and parameter descriptions sent to LLM explaining tool usage.
 * Use this to discover what skills are available before loading them.
 */
export const listAvailableSkillsTool = tool({
  name: 'list_available_skills',
  description: 'List all available skills that can be loaded, including their descriptions and status.',

  inputSchema: z.object({
    filter_tags: z.array(z.string())
      .optional()
      .describe('Optional: Filter skills by tags (e.g., ["diagram", "documentation"])')
  }),

  execute: async ({ filter_tags }) => {
    debug('list_available_skills called with:', { filter_tags });

    const registry = getSkillRegistry();
    const allSkills = registry.getAllSkills();

    // Filter by tags if provided
    let skills = allSkills;
    if (filter_tags && filter_tags.length > 0) {
      skills = allSkills.filter(skill => {
        if (!skill.tags) return false;
        return filter_tags.some((tag: string) => skill.tags?.includes(tag));
      });
    }

    const enabledSkills = skills.filter(s => s.enabled);
    const disabledSkills = skills.filter(s => !s.enabled);

    const lines: string[] = [];
    lines.push(`Found ${skills.length} skill(s)${filter_tags ? ` matching tags: ${filter_tags.join(', ')}` : ''}`);
    lines.push('');

    if (enabledSkills.length > 0) {
      lines.push('**Available Skills (Enabled):**');
      for (const skill of enabledSkills) {
        lines.push(`  • **${skill.name}**: ${skill.description}`);
        if (skill.instructions) {
          lines.push(`    _When to use: ${skill.instructions}_`);
        }
        if (skill.tags && skill.tags.length > 0) {
          lines.push(`    Tags: ${skill.tags.join(', ')}`);
        }
      }
      lines.push('');
    }

    if (disabledSkills.length > 0) {
      lines.push('**Disabled Skills:**');
      for (const skill of disabledSkills) {
        lines.push(`  • **${skill.name}**: ${skill.description}`);
      }
      lines.push('');
    }

    if (enabledSkills.length === 0) {
      lines.push('_No skills available. Skills can be added to ~/.llpm/skills/ or .llpm/skills/_');
    }

    return {
      success: true,
      total_count: skills.length,
      enabled_count: enabledSkills.length,
      disabled_count: disabledSkills.length,
      skills: enabledSkills.map(s => ({
        name: s.name,
        description: s.description,
        instructions: s.instructions,
        tags: s.tags || [],
        source: s.source
      })),
      message: lines.join('\n')
    };
  }
});

function getMarketplaceService(): MarketplaceService {
  return new MarketplaceService(CONFIG_FILE, join(CONFIG_DIR, 'skills'));
}

/**
 * @prompt Tool: install_skill
 * Install a skill from a registered marketplace into the user's skills directory.
 */
export const installSkillTool = tool({
  name: 'install_skill',
  description: `Install a skill from a registered marketplace repository.

Use this when:
- The user asks to install a skill from a marketplace
- You want to add new capabilities by installing a marketplace skill

The skill will be copied from the marketplace repo into the user's skills directory.`,

  inputSchema: z.object({
    skill_name: z.string().describe('Name of the skill to install'),
    marketplace: z.string().describe('Name of the marketplace to install from'),
    force: z.boolean().optional().describe('Overwrite existing skill if it already exists')
  }),

  execute: async ({ skill_name, marketplace, force }) => {
    debug('install_skill called with:', { skill_name, marketplace, force });

    const service = getMarketplaceService();
    try {
      const result = await service.installSkill(skill_name, marketplace, { force: force || false });

      if (result.conflict) {
        return {
          success: false,
          message: `Skill "${skill_name}" already exists at ${result.existingPath}. Use force: true to overwrite.`
        };
      }

      // Reload skills so the new one appears
      const registry = getSkillRegistry();
      await registry.scan();

      return {
        success: true,
        message: `Installed "${skill_name}" from ${marketplace}. Use load_skills to activate it.`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to install: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
});

/**
 * @prompt Tool: search_marketplace_skills
 * Search across all registered marketplace indexes for skills matching a query.
 */
export const searchMarketplaceSkillsTool = tool({
  name: 'search_marketplace_skills',
  description: `Search for skills across all registered marketplaces.

Use this when:
- The user wants to find skills available for installation
- You want to discover marketplace skills matching a topic or keyword

Searches locally cached marketplace indexes (run /skills sync first to update).`,

  inputSchema: z.object({
    query: z.string().optional().describe('Search query to filter skills by name or description. Omit to list all.')
  }),

  execute: async ({ query }) => {
    debug('search_marketplace_skills called with:', { query });

    const service = getMarketplaceService();
    try {
      const results = await service.searchSkills(query || '');

      const lines: string[] = [];
      if (results.length === 0) {
        lines.push('No skills found' + (query ? ` matching "${query}"` : '') + '.');
        lines.push('Run `/skills sync <marketplace>` to update indexes.');
      } else {
        lines.push(`Found ${results.length} skill(s)${query ? ` matching "${query}"` : ''}:`);
        lines.push('');
        for (const skill of results) {
          lines.push(`  • **${skill.name}** (${skill.marketplace}): ${skill.description}`);
        }
        lines.push('');
        lines.push('Install with: `/skills install <name>@<marketplace>` or use the install_skill tool.');
      }

      return {
        success: true,
        results,
        message: lines.join('\n')
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        message: `Search failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
});
