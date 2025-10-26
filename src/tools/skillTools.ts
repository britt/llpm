/**
 * Tools for managing and loading skills
 */
import { z } from 'zod';
import { tool } from './instrumentedTool';
import { getSkillRegistry } from '../services/SkillRegistry';
import { debug } from '../utils/logger';

/**
 * load_skills - Explicitly load one or more skills to augment current context
 *
 * Use this tool when you need specific skills that weren't automatically selected,
 * or when you want to ensure certain skills are available for the current task.
 *
 * Example use cases:
 * - Loading specialized skills for a specific task
 * - Ensuring critical guidelines are included
 * - Loading multiple related skills together
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
    skill_names: z
      .array(z.string())
      .min(1)
      .describe('Array of skill names to load (e.g., ["mermaid-diagrams", "user-story-template"])'),
    reason: z
      .string()
      .optional()
      .describe('Optional explanation of why you are loading these skills')
  }),

  execute: async ({ skill_names, reason }) => {
    debug('load_skills called with:', { skill_names, reason });

    const registry = getSkillRegistry();
    const results: Array<{ name: string; loaded: boolean; error?: string; description?: string }> =
      [];
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
 * list_available_skills - List all available skills that can be loaded
 *
 * Use this to discover what skills are available before loading them.
 */
export const listAvailableSkillsTool = tool({
  name: 'list_available_skills',
  description:
    'List all available skills that can be loaded, including their descriptions and status.',

  inputSchema: z.object({
    filter_tags: z
      .array(z.string())
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
        return filter_tags.some(tag => skill.tags?.includes(tag));
      });
    }

    const enabledSkills = skills.filter(s => s.enabled);
    const disabledSkills = skills.filter(s => !s.enabled);

    const lines: string[] = [];
    lines.push(
      `Found ${skills.length} skill(s)${filter_tags ? ` matching tags: ${filter_tags.join(', ')}` : ''}`
    );
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
