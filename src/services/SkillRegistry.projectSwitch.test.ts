/**
 * Tests for skill discovery on project switch
 *
 * Updated for Agent Skills specification (agentskills.io)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SkillRegistry } from './SkillRegistry';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

describe('SkillRegistry - Project Switch Discovery', () => {
  const testProjectPath = join(process.cwd(), '.llpm-test-project');
  const skillsPath = join(testProjectPath, '.skills');
  const altSkillsPath = join(testProjectPath, 'skills');

  beforeEach(async () => {
    // Clean up test directory if it exists
    if (existsSync(testProjectPath)) {
      await rm(testProjectPath, { recursive: true, force: true });
    }
  });

  afterEach(async () => {
    // Clean up test directory
    if (existsSync(testProjectPath)) {
      await rm(testProjectPath, { recursive: true, force: true });
    }
  });

  it('should discover skills from .skills on startup', async () => {
    // Create test skill in .skills
    const skillDir = join(skillsPath, 'test-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---
name: test-skill
description: "Test skill for project"
---

# Test Skill

When testing skill discovery, use this test skill.
`
    );

    const registry = new SkillRegistry({
      enabled: true,
      maxSkillsPerPrompt: 3,
      paths: [join(testProjectPath, '.skills')],
      enforceAllowedTools: false
    });

    await registry.scan();
    const skills = registry.getAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0]?.name).toBe('test-skill');
    expect(skills[0]?.source).toBe('project');
  });

  it('should discover skills from skills/ on startup', async () => {
    // Create test skill in skills/
    const skillDir = join(altSkillsPath, 'alt-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---
name: alt-skill
description: "Alternative project skill"
---

# Alternative Skill

When testing alternative skills directory, use this skill.
`
    );

    const registry = new SkillRegistry({
      enabled: true,
      maxSkillsPerPrompt: 3,
      paths: [join(testProjectPath, 'skills')],
      enforceAllowedTools: false
    });

    await registry.scan();
    const skills = registry.getAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0]?.name).toBe('alt-skill');
    expect(skills[0]?.source).toBe('project');
  });

  it('should discover skills from both .skills and skills/', async () => {
    // Create skill in .skills
    const projectSkillDir = join(skillsPath, 'project-skill');
    await mkdir(projectSkillDir, { recursive: true });
    await writeFile(
      join(projectSkillDir, 'SKILL.md'),
      `---
name: project-skill
description: "Project-wide skill from .skills"
---

# Project Skill

When testing project-wide skills, use this skill.
`
    );

    // Create skill in skills/
    const altSkillDir = join(altSkillsPath, 'alt-skill');
    await mkdir(altSkillDir, { recursive: true });
    await writeFile(
      join(altSkillDir, 'SKILL.md'),
      `---
name: alt-skill
description: "Alternative skill from skills/"
---

# Alt Skill

When testing alternative skills, use this skill.
`
    );

    const registry = new SkillRegistry({
      enabled: true,
      maxSkillsPerPrompt: 3,
      paths: [
        join(testProjectPath, '.skills'),
        join(testProjectPath, 'skills')
      ],
      enforceAllowedTools: false
    });

    await registry.scan();
    const skills = registry.getAllSkills();

    expect(skills).toHaveLength(2);
    expect(skills.map(s => s.name).sort()).toEqual(['alt-skill', 'project-skill']);
  });

  it('should rescan and pick up new skills after project switch', async () => {
    // Initial scan with no skills
    const registry = new SkillRegistry({
      enabled: true,
      maxSkillsPerPrompt: 3,
      paths: [
        join(testProjectPath, '.skills'),
        join(testProjectPath, 'skills')
      ],
      enforceAllowedTools: false
    });

    await registry.scan();
    expect(registry.getAllSkills()).toHaveLength(0);

    // Add a new skill (simulating project switch to a project with skills)
    const skillDir = join(skillsPath, 'new-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---
name: new-skill
description: "Newly discovered skill"
---

# New Skill

When testing newly discovered skills, use this skill.
`
    );

    // Rescan (this is what happens on project switch)
    await registry.scan();
    const skills = registry.getAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0]?.name).toBe('new-skill');
  });

  it('should clear old skills when rescanning', async () => {
    // Create initial skill
    const skillDir1 = join(skillsPath, 'old-skill');
    await mkdir(skillDir1, { recursive: true });
    await writeFile(
      join(skillDir1, 'SKILL.md'),
      `---
name: old-skill
description: "Old skill to be replaced"
---

# Old Skill

When testing old skills, use this skill.
`
    );

    const registry = new SkillRegistry({
      enabled: true,
      maxSkillsPerPrompt: 3,
      paths: [join(testProjectPath, '.skills')],
      enforceAllowedTools: false
    });

    await registry.scan();
    expect(registry.getAllSkills()).toHaveLength(1);
    expect(registry.getAllSkills()[0]?.name).toBe('old-skill');

    // Remove old skill and add new skill (simulating switch to different project)
    await rm(skillDir1, { recursive: true, force: true });

    const skillDir2 = join(skillsPath, 'new-skill');
    await mkdir(skillDir2, { recursive: true });
    await writeFile(
      join(skillDir2, 'SKILL.md'),
      `---
name: new-skill
description: "New skill after clearing old ones"
---

# New Skill

When testing new skills after clearing old ones, use this skill.
`
    );

    // Rescan
    await registry.scan();
    const skills = registry.getAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0]?.name).toBe('new-skill');
    expect(skills.find(s => s.name === 'old-skill')).toBeUndefined();
  });
});
