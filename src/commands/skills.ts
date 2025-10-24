/**
 * /skills command - Manage and interact with Agent Skills
 */
import type { Command, CommandResult } from './types';
import { getSkillRegistry } from '../services/SkillRegistry';
import { applyVariableSubstitution } from '../utils/skillParser';

export const skillsCommand: Command = {
  name: 'skills',
  description: 'Manage Agent Skills (list, test, enable, disable, reload)',

  async execute(args: string[]): Promise<CommandResult> {
    const subcommand = args[0] || 'list';

    switch (subcommand) {
      case 'list':
        return await listSkills(args.slice(1));

      case 'test':
        return await testSkill(args.slice(1));

      case 'enable':
        return await enableSkill(args.slice(1));

      case 'disable':
        return await disableSkill(args.slice(1));

      case 'reload':
        return await reloadSkills();

      case 'help':
      default:
        return showHelp();
    }
  }
};

/**
 * List all discovered skills
 */
async function listSkills(args: string[]): Promise<CommandResult> {
  const registry = getSkillRegistry();
  const skills = registry.getAllSkills();

  if (skills.length === 0) {
    return {
      success: true,
      content: 'No skills discovered. Run `/skills reload` to scan for skills.'
    };
  }

  const activeSkillNames = new Set(
    registry.getActiveSkills().map(s => s.name)
  );

  const lines: string[] = [];
  lines.push('# Discovered Skills\n');

  // Group by source
  const personalSkills = skills.filter(s => s.source === 'personal');
  const projectSkills = skills.filter(s => s.source === 'project');

  if (personalSkills.length > 0) {
    lines.push('## Personal Skills (~/.llpm/skills)\n');
    for (const skill of personalSkills) {
      const status = activeSkillNames.has(skill.name) ? '✓ ACTIVE' :
                     skill.enabled ? '○ enabled' : '✗ disabled';
      lines.push(`**${skill.name}** [${status}]`);
      lines.push(`  ${skill.description}`);
      if (skill.tags && skill.tags.length > 0) {
        lines.push(`  Tags: ${skill.tags.join(', ')}`);
      }
      if (skill.allowed_tools && skill.allowed_tools.length > 0) {
        lines.push(`  Allowed tools: ${skill.allowed_tools.join(', ')}`);
      }
      lines.push('');
    }
  }

  if (projectSkills.length > 0) {
    lines.push('## Project Skills (.llpm/skills)\n');
    for (const skill of projectSkills) {
      const status = activeSkillNames.has(skill.name) ? '✓ ACTIVE' :
                     skill.enabled ? '○ enabled' : '✗ disabled';
      lines.push(`**${skill.name}** [${status}]`);
      lines.push(`  ${skill.description}`);
      if (skill.tags && skill.tags.length > 0) {
        lines.push(`  Tags: ${skill.tags.join(', ')}`);
      }
      if (skill.allowed_tools && skill.allowed_tools.length > 0) {
        lines.push(`  Allowed tools: ${skill.allowed_tools.join(', ')}`);
      }
      lines.push('');
    }
  }

  lines.push(`\nTotal: ${skills.length} skill(s)`);
  lines.push(`Active: ${activeSkillNames.size} skill(s)\n`);

  return {
    success: true,
    content: lines.join('\n')
  };
}

/**
 * Test a skill (dry-run)
 */
async function testSkill(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /skills test <skill-name>\n\nShows how the skill would alter context and tooling without activating it.'
    };
  }

  const skillName = args[0];
  const registry = getSkillRegistry();
  const skill = registry.getSkill(skillName);

  if (!skill) {
    return {
      success: false,
      content: `Skill not found: ${skillName}\n\nRun \`/skills list\` to see available skills.`
    };
  }

  const lines: string[] = [];
  lines.push(`# Skill Test: ${skill.name}\n`);
  lines.push(`**Source:** ${skill.source}`);
  lines.push(`**Description:** ${skill.description}`);
  lines.push(`**Enabled:** ${skill.enabled ? 'yes' : 'no'}`);
  lines.push('');

  if (skill.tags && skill.tags.length > 0) {
    lines.push(`**Tags:** ${skill.tags.join(', ')}`);
  }

  if (skill.vars) {
    lines.push(`\n**Variables:**`);
    for (const [key, value] of Object.entries(skill.vars)) {
      lines.push(`  - {{${key}}} = "${value}"`);
    }
  }

  if (skill.allowed_tools) {
    lines.push(`\n**Allowed Tools:** ${skill.allowed_tools.join(', ')}`);
    lines.push(`\nWhen active, this skill will restrict tool usage to the above list.`);
  }

  if (skill.resources && skill.resources.length > 0) {
    lines.push(`\n**Resources:**`);
    for (const resource of skill.resources) {
      lines.push(`  - ${resource}`);
    }
  }

  // Show content with variable substitution applied
  lines.push(`\n## Content (with variables applied)\n`);

  let content = skill.content;
  if (skill.vars) {
    content = applyVariableSubstitution(content, skill.vars);
  }

  lines.push('```markdown');
  lines.push(content);
  lines.push('```\n');

  return {
    success: true,
    content: lines.join('\n')
  };
}

/**
 * Enable a skill
 */
async function enableSkill(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /skills enable <skill-name>'
    };
  }

  const skillName = args[0];
  const registry = getSkillRegistry();
  const skill = registry.getSkill(skillName);

  if (!skill) {
    return {
      success: false,
      content: `Skill not found: ${skillName}`
    };
  }

  if (skill.enabled) {
    return {
      success: true,
      content: `Skill "${skillName}" is already enabled.\n\nUse \`/skills list\` to see all skills.`
    };
  }

  registry.enableSkill(skillName);

  return {
    success: true,
    content: `✓ Enabled skill: ${skillName}\n\nThe skill can now be automatically selected when relevant.\nUse \`/skills list\` to verify.`
  };
}

/**
 * Disable a skill
 */
async function disableSkill(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /skills disable <skill-name>'
    };
  }

  const skillName = args[0];
  const registry = getSkillRegistry();
  const skill = registry.getSkill(skillName);

  if (!skill) {
    return {
      success: false,
      content: `Skill not found: ${skillName}`
    };
  }

  if (!skill.enabled) {
    return {
      success: true,
      content: `Skill "${skillName}" is already disabled.\n\nUse \`/skills list\` to see all skills.`
    };
  }

  registry.disableSkill(skillName);

  return {
    success: true,
    content: `✓ Disabled skill: ${skillName}\n\nThe skill will not be automatically selected.\nUse \`/skills list\` to verify.`
  };
}

/**
 * Reload skills from disk
 */
async function reloadSkills(): Promise<CommandResult> {
  const registry = getSkillRegistry();

  try {
    await registry.scan();

    const skills = registry.getAllSkills();

    return {
      success: true,
      content: `Skills reloaded successfully.\n\nDiscovered ${skills.length} skill(s). Use \`/skills list\` to see them.`
    };
  } catch (error) {
    return {
      success: false,
      content: `Failed to reload skills: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Show help for /skills command
 */
function showHelp(): CommandResult {
  return {
    success: true,
    content: `
# Skills Command

Manage Agent Skills - reusable packages of instructions that Claude can invoke automatically.

## Usage

\`/skills list\` - List all discovered skills and their status
\`/skills test <name>\` - Dry-run a skill (shows content without activating)
\`/skills enable <name>\` - Enable a skill
\`/skills disable <name>\` - Disable a skill
\`/skills reload\` - Rescan skill directories and reload all skills
\`/skills help\` - Show this help message

## Skill Locations

- **Personal Skills:** ~/.llpm/skills/*/SKILL.md
- **Project Skills:** .llpm/skills/*/SKILL.md

## How Skills Work

Skills are discovered automatically from the above locations. When you send a message,
Claude evaluates your intent and activates relevant skills based on:

- Name and tag matches with your message
- Description similarity with your request
- Relevance score (configurable threshold)

Active skills augment Claude's system prompt with their instructions, and can optionally
restrict tool usage to an allowed list.

## Creating a Skill

Create a folder in ~/.llpm/skills/ or .llpm/skills/ with a SKILL.md file:

\`\`\`markdown
---
name: my-skill
description: "What this skill does and when to use it"
tags: [tag1, tag2]
allowed_tools: [github, shell]
---

# My Skill Instructions

Your markdown instructions here...
\`\`\`

See the documentation for full schema and examples.
`
  };
}
