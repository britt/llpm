/**
 * /skills command - Manage and interact with Agent Skills
 *
 * Implements the Agent Skills specification from agentskills.io
 * https://agentskills.io/specification
 */
import type { Command, CommandResult } from './types';
import { getSkillRegistry } from '../services/SkillRegistry';
import { MarketplaceService } from '../services/MarketplaceService';
import { reinstallCoreSkills, CONFIG_FILE, CONFIG_DIR } from '../utils/config';
import { join } from 'path';

function getMarketplaceService(): MarketplaceService {
  return new MarketplaceService(CONFIG_FILE, join(CONFIG_DIR, 'skills'));
}

export const skillsCommand: Command = {
  name: 'skills',
  description: 'Manage Agent Skills (list, test, enable, disable, reload, reinstall, marketplace, install, remove, search)',

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
      case 'reinstall':
        return await reinstallSkills();
      case 'marketplace':
        return await handleMarketplace(args.slice(1));
      case 'sync':
        return await handleSync(args.slice(1));
      case 'install':
        return await handleInstall(args.slice(1));
      case 'remove':
        return await handleRemove(args.slice(1));
      case 'search':
        return await handleSearch(args.slice(1));
      case 'help':
      default:
        return showHelp();
    }
  }
};

function formatSkillList(skills: Array<{ name: string; description: string; enabled: boolean; license?: string; allowedTools?: string[] }>): string[] {
  const lines: string[] = [];
  for (const skill of skills) {
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
  return lines;
}

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

  const userSkills = skills.filter(s => s.source === 'user');
  const projectSkills = skills.filter(s => s.source === 'project');
  const systemSkills = skills.filter(s => s.source === 'system');
  const marketplaceSkills = skills.filter(s => s.source === 'marketplace');

  if (userSkills.length > 0) {
    lines.push('## User Skills (~/.llpm/skills)\n');
    lines.push(...formatSkillList(userSkills));
  }

  if (projectSkills.length > 0) {
    lines.push('## Project Skills (.skills or skills)\n');
    lines.push(...formatSkillList(projectSkills));
  }

  if (systemSkills.length > 0) {
    lines.push('## System Skills (/usr/share/llpm/skills)\n');
    lines.push(...formatSkillList(systemSkills));
  }

  if (marketplaceSkills.length > 0) {
    lines.push('## Marketplace Skills\n');
    lines.push(...formatSkillList(marketplaceSkills));
  }

  const enabledCount = skills.filter(s => s.enabled).length;
  lines.push(`\nTotal: ${skills.length} skill(s)`);
  lines.push(`Enabled: ${enabledCount} skill(s)\n`);

  return {
    success: true,
    content: lines.join('\n')
  };
}

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

  lines.push(`\n## Content\n`);
  lines.push('```markdown');
  lines.push(skill.content);
  lines.push('```\n');

  return {
    success: true,
    content: lines.join('\n')
  };
}

async function enableSkill(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return { success: false, content: 'Usage: /skills enable <skill-name>' };
  }

  const skillName = args[0]!;
  const registry = getSkillRegistry();
  const skill = registry.getSkill(skillName);

  if (!skill) {
    return { success: false, content: `Skill not found: ${skillName}` };
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

async function disableSkill(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return { success: false, content: 'Usage: /skills disable <skill-name>' };
  }

  const skillName = args[0]!;
  const registry = getSkillRegistry();
  const skill = registry.getSkill(skillName);

  if (!skill) {
    return { success: false, content: `Skill not found: ${skillName}` };
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

async function reloadSkills(): Promise<CommandResult> {
  const registry = getSkillRegistry();

  const validationErrors: string[] = [];
  const discoveredSkills: string[] = [];

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

    return { success: true, content: lines.join('\n') };
  } catch (error) {
    registry.removeListener('skill.validation_error', errorHandler);
    registry.removeListener('skill.discovered', discoveryHandler);

    return {
      success: false,
      content: `Failed to reload skills: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function reinstallSkills(): Promise<CommandResult> {
  try {
    const count = await reinstallCoreSkills();
    const registry = getSkillRegistry();
    await registry.scan();

    const lines: string[] = [];
    lines.push(`✓ Core skills reinstalled successfully\n`);
    lines.push(`Reinstalled: ${count} skill(s)`);
    lines.push(`\nUse \`/skills list\` to see all loaded skills.`);

    return { success: true, content: lines.join('\n') };
  } catch (error) {
    return {
      success: false,
      content: `Failed to reinstall skills: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function handleMarketplace(args: string[]): Promise<CommandResult> {
  const sub = args[0];
  const service = getMarketplaceService();

  switch (sub) {
    case 'add': {
      const repo = args[1];
      if (!repo) {
        return { success: false, content: 'Usage: /skills marketplace add <owner/repo>' };
      }
      try {
        const entry = await service.addMarketplace(repo);
        return {
          success: true,
          content: `✓ Registered marketplace: ${entry.name} (${entry.repo})\n\nRun \`/skills sync ${entry.name}\` to fetch the skill index.`
        };
      } catch (error) {
        return {
          success: false,
          content: `Failed to add marketplace: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    case 'remove': {
      const name = args[1];
      if (!name) {
        return { success: false, content: 'Usage: /skills marketplace remove <name>' };
      }
      try {
        await service.removeMarketplace(name);
        return { success: true, content: `✓ Removed marketplace: ${name}` };
      } catch (error) {
        return {
          success: false,
          content: `Failed to remove marketplace: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    case 'list': {
      const marketplaces = await service.listMarketplaces();
      if (marketplaces.length === 0) {
        return {
          success: true,
          content: 'No marketplaces registered.\n\nAdd one with: `/skills marketplace add <owner/repo>`'
        };
      }
      const lines = ['# Registered Marketplaces\n'];
      for (const mp of marketplaces) {
        lines.push(`**${mp.name}** — ${mp.repo}`);
        lines.push(`  Added: ${mp.addedAt}`);
        lines.push('');
      }
      return { success: true, content: lines.join('\n') };
    }

    default:
      return {
        success: true,
        content: `Usage:\n  /skills marketplace add <owner/repo>\n  /skills marketplace remove <name>\n  /skills marketplace list`
      };
  }
}

async function handleSync(args: string[]): Promise<CommandResult> {
  const name = args[0];
  if (!name) {
    return { success: false, content: 'Usage: /skills sync <marketplace-name>' };
  }

  const service = getMarketplaceService();
  try {
    const index = await service.syncMarketplace(name);
    return {
      success: true,
      content: `✓ Synced ${name}: ${index.length} skill(s) indexed\n\nUse \`/skills search\` to browse available skills.`
    };
  } catch (error) {
    return {
      success: false,
      content: `Failed to sync marketplace: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function handleInstall(args: string[]): Promise<CommandResult> {
  let force = false;
  const filteredArgs = args.filter(a => {
    if (a === '--force') { force = true; return false; }
    return true;
  });

  const spec = filteredArgs[0];
  if (!spec) {
    return { success: false, content: 'Usage: /skills install <skill-name>@<marketplace> [--force]' };
  }

  const atIdx = spec.lastIndexOf('@');
  if (atIdx <= 0) {
    return {
      success: false,
      content: `Invalid format: "${spec}"\n\nExpected: <skill-name>@<marketplace>\nExample: /skills install code-review@anthropics-skills`
    };
  }

  const skillName = spec.substring(0, atIdx);
  const marketplaceName = spec.substring(atIdx + 1);

  const service = getMarketplaceService();
  try {
    const result = await service.installSkill(skillName, marketplaceName, { force });

    if (result.conflict) {
      return {
        success: false,
        content: `Skill "${skillName}" already exists at ${result.existingPath}\n\nUse \`/skills install --force ${spec}\` to overwrite.`
      };
    }

    // Reload skills so the new one appears
    const registry = getSkillRegistry();
    await registry.scan();

    return {
      success: true,
      content: `✓ Installed "${skillName}" from ${marketplaceName}\n\nUse \`/skills test ${skillName}\` to preview.`
    };
  } catch (error) {
    return {
      success: false,
      content: `Failed to install skill: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function handleRemove(args: string[]): Promise<CommandResult> {
  const skillName = args[0];
  if (!skillName) {
    return { success: false, content: 'Usage: /skills remove <skill-name>' };
  }

  const service = getMarketplaceService();
  try {
    await service.removeSkill(skillName);

    const registry = getSkillRegistry();
    await registry.scan();

    return {
      success: true,
      content: `✓ Removed skill: ${skillName}`
    };
  } catch (error) {
    return {
      success: false,
      content: `Failed to remove skill: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function handleSearch(args: string[]): Promise<CommandResult> {
  const query = args.join(' ');
  const service = getMarketplaceService();

  try {
    const results = await service.searchSkills(query);

    if (results.length === 0) {
      return {
        success: true,
        content: query
          ? `No skills found matching "${query}".\n\nTry a different search term or run \`/skills sync <marketplace>\` to update indexes.`
          : 'No skills found. Register a marketplace and sync it first.'
      };
    }

    const lines = [`# Search Results${query ? ` for "${query}"` : ''}\n`];
    lines.push(`Found ${results.length} skill(s):\n`);

    for (const skill of results) {
      lines.push(`**${skill.name}** (${skill.marketplace})`);
      lines.push(`  ${skill.description}`);
      lines.push(`  Install: \`/skills install ${skill.name}@${skill.marketplace}\``);
      lines.push('');
    }

    return { success: true, content: lines.join('\n') };
  } catch (error) {
    return {
      success: false,
      content: `Search failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

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
\`/skills reinstall\` - Reinstall core skills from bundled directory (overwrites existing)

## Marketplace

\`/skills marketplace add <owner/repo>\` - Register a Git repo as a skill marketplace
\`/skills marketplace remove <name>\` - Unregister a marketplace
\`/skills marketplace list\` - List registered marketplaces
\`/skills sync <marketplace>\` - Fetch/update the skill index from a marketplace
\`/skills install <skill>@<marketplace>\` - Install a skill from a marketplace
\`/skills remove <skill-name>\` - Uninstall a marketplace skill
\`/skills search [query]\` - Search across registered marketplaces

\`/skills help\` - Show this help message

## Skill Locations (per Agent Skills spec)

- **Project Skills:** .skills/*/SKILL.md or skills/*/SKILL.md
- **User Skills:** ~/.llpm/skills/*/SKILL.md
- **Marketplace Skills:** Installed from Git repos into ~/.llpm/skills/
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
