/**
 * /skills command - Manage and interact with Agent Skills
 *
 * Implements the Agent Skills specification from agentskills.io
 * https://agentskills.io/specification
 */
import type { Command, CommandResult } from './types';
import { getSkillRegistry } from '../services/SkillRegistry';

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
async function listSkills(_args: string[]): Promise<CommandResult> {
  const registry = getSkillRegistry();
  const skills = registry.getAllSkills();

  if (skills.length === 0) {
    return {
      success: true,
      content: 'No skills discovered. Run `/skills reload` to scan for skills.'
    };
  }

  const lines: string[] = [];
  lines.push('# Discovered Skills\n');

  // Group by source per Agent Skills spec
  const userSkills = skills.filter(s => s.source === 'user');
  const projectSkills = skills.filter(s => s.source === 'project');
  const systemSkills = skills.filter(s => s.source === 'system');

  if (userSkills.length > 0) {
    lines.push('## User Skills (~/.config/llpm/skills or ~/.llpm/skills)\n');
    for (const skill of userSkills) {
      const status = skill.enabled ? '✓ enabled' : '✗ disabled';
      lines.push(`**${skill.name}** [${status}]`);
      lines.push(`  ${skill.description}`);
      if (skill.license) {
        lines.push(`  License: ${skill.license}`);
      }
      if (skill.allowedTools && skill.allowedTools.length > 0) {
        lines.push(`  Allowed tools: ${skill.allowedTools.join(', ')}`);
      }
      lines.push('');
    }
  }

  if (projectSkills.length > 0) {
    lines.push('## Project Skills (.skills or skills)\n');
    for (const skill of projectSkills) {
      const status = skill.enabled ? '✓ enabled' : '✗ disabled';
      lines.push(`**${skill.name}** [${status}]`);
      lines.push(`  ${skill.description}`);
      if (skill.license) {
        lines.push(`  License: ${skill.license}`);
      }
      if (skill.allowedTools && skill.allowedTools.length > 0) {
        lines.push(`  Allowed tools: ${skill.allowedTools.join(', ')}`);
      }
      lines.push('');
    }
  }

  if (systemSkills.length > 0) {
    lines.push('## System Skills (/usr/share/llpm/skills)\n');
    for (const skill of systemSkills) {
      const status = skill.enabled ? '✓ enabled' : '✗ disabled';
      lines.push(`**${skill.name}** [${status}]`);
      lines.push(`  ${skill.description}`);
      if (skill.license) {
        lines.push(`  License: ${skill.license}`);
      }
      if (skill.allowedTools && skill.allowedTools.length > 0) {
        lines.push(`  Allowed tools: ${skill.allowedTools.join(', ')}`);
      }
      lines.push('');
    }
  }

  const enabledCount = skills.filter(s => s.enabled).length;
  lines.push(`\nTotal: ${skills.length} skill(s)`);
  lines.push(`Enabled: ${enabledCount} skill(s)\n`);

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

  const skillName = args[0]!;
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
  lines.push(`**Path:** ${skill.path}`);
  lines.push(`**Description:** ${skill.description}`);
  lines.push(`**Enabled:** ${skill.enabled ? 'yes' : 'no'}`);
  lines.push('');

  if (skill.license) {
    lines.push(`**License:** ${skill.license}`);
  }

  if (skill.compatibility) {
    lines.push(`**Compatibility:** ${skill.compatibility}`);
  }

  if (skill.allowedTools && skill.allowedTools.length > 0) {
    lines.push(`\n**Allowed Tools:** ${skill.allowedTools.join(', ')}`);
    lines.push(`\nWhen active, this skill will restrict tool usage to the above list.`);
  }

  if (skill.metadata) {
    lines.push(`\n**Metadata:**`);
    for (const [key, value] of Object.entries(skill.metadata)) {
      lines.push(`  - ${key}: ${value}`);
    }
  }

  // Show skill content
  lines.push(`\n## Content\n`);

  lines.push('```markdown');
  lines.push(skill.content);
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

  const skillName = args[0]!;
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

  const skillName = args[0]!;
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

  const validationErrors: string[] = [];
  const discoveredSkills: string[] = [];

  // Listen for validation errors during scan
  const errorHandler = (event: { skillName: string; errors: string[] }) => {
    validationErrors.push(`${event.skillName}: ${event.errors.join(', ')}`);
  };

  const discoveryHandler = (event: { skillName: string }) => {
    discoveredSkills.push(event.skillName);
  };

  registry.on('skill.validation_error', errorHandler);
  registry.on('skill.discovered', discoveryHandler);

  try {
    await registry.scan();

    const skills = registry.getAllSkills();

    // Remove listeners
    registry.removeListener('skill.validation_error', errorHandler);
    registry.removeListener('skill.discovered', discoveryHandler);

    const lines: string[] = [];
    lines.push(`✓ Skills reloaded successfully\n`);
    lines.push(`Discovered: ${skills.length} skill(s)`);

    if (discoveredSkills.length > 0) {
      lines.push(`\n**Successfully loaded:**`);
      discoveredSkills.forEach(name => lines.push(`  ✓ ${name}`));
    }

    if (validationErrors.length > 0) {
      lines.push(`\n**Validation errors:**`);
      validationErrors.forEach(error => lines.push(`  ✗ ${error}`));
      lines.push(`\n💡 **Tip:** Skills must be in subdirectories with a SKILL.md file:`);
      lines.push(`   ~/.llpm/skills/my-skill-name/SKILL.md`);
    }

    lines.push(`\nUse \`/skills list\` to see all loaded skills.`);

    return {
      success: true,
      content: lines.join('\n')
    };
  } catch (error) {
    // Remove listeners on error
    registry.removeListener('skill.validation_error', errorHandler);
    registry.removeListener('skill.discovered', discoveryHandler);

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

Manage Agent Skills - reusable packages of instructions that the AI can invoke automatically.

Implements the Agent Skills specification: https://agentskills.io/specification

## Usage

\`/skills list\` - List all discovered skills and their status
\`/skills test <name>\` - Preview a skill's content and settings
\`/skills enable <name>\` - Enable a skill (eligible for automatic selection)
\`/skills disable <name>\` - Disable a skill (won't be selected)
\`/skills reload\` - Rescan skill directories and reload all skills
\`/skills help\` - Show this help message

## Skill Locations (per Agent Skills spec)

- **Project Skills:** .skills/*/SKILL.md or skills/*/SKILL.md
- **User Skills:** ~/.config/llpm/skills/*/SKILL.md or ~/.llpm/skills/*/SKILL.md
- **System Skills:** /usr/share/llpm/skills/*/SKILL.md (optional)

## How Skills Work

Skills are discovered automatically from the above locations. When you send a message,
LLPM evaluates your intent and selects relevant skills based on:

- **Name match**: Your message contains the skill name
- **Description keywords**: Keyword overlap with the skill description

Skills are selected fresh for each prompt (no persistent state). Selected skills augment
the AI's system prompt with their instructions.

**Configuration**: Set \`maxSkillsPerPrompt\` in config to limit how many skills can be
selected per message (default: 3).

## Creating a Skill (Agent Skills Spec)

Create a folder matching the skill name with a SKILL.md file:

\`\`\`markdown
---
name: my-skill
description: "What this skill does and when to use it (1-1024 chars)"
license: MIT
compatibility: "Requires Node.js 18+"
allowed-tools: "Bash(git:*) Read Write"
metadata:
  author: "Your Name"
  version: "1.0.0"
---

# My Skill Instructions

Your markdown instructions here...
\`\`\`

### Frontmatter Fields

- **name** (required): 1-64 chars, lowercase letters/numbers/hyphens, must match directory name
- **description** (required): 1-1024 chars, include keywords for matching
- **license** (optional): SPDX identifier or custom license
- **compatibility** (optional): Environment requirements (1-500 chars)
- **allowed-tools** (optional, experimental): Space-delimited list of pre-approved tools
- **metadata** (optional): Key-value string mapping for additional properties

### Optional Directories

- \`scripts/\` - Helper scripts the skill can invoke
- \`references/\` - Additional documentation or examples
- \`assets/\` - Binary assets (images, templates, etc.)

See https://agentskills.io/specification for full details.
`
  };
}
