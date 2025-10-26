/**
 * Tests for skill discovery on project switch
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SkillRegistry } from './SkillRegistry';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

describe('SkillRegistry - Project Switch Discovery', () => {
  const testProjectPath = join(process.cwd(), '.llpm-test-project');
  const skillsPath = join(testProjectPath, '.llpm', 'skills');
  const userSkillsPath = join(testProjectPath, '.llpm', 'skills', 'user');

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

  it('should discover skills from .llpm/skills on startup', async () => {
    // Create test skill in .llpm/skills
    const skillDir = join(skillsPath, 'test-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---
name: test-skill
description: "Test skill for project"
instructions: "When testing skill discovery, use this test skill"
---

# Test Skill
`
    );

    const registry = new SkillRegistry({
      enabled: true,
      maxSkillsPerPrompt: 3,
      paths: [join(testProjectPath, '.llpm', 'skills')],
      requireConfirmationOnDeniedTool: false
    });

    await registry.scan();
    const skills = registry.getAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('test-skill');
    expect(skills[0].source).toBe('project');
  });

  it('should discover skills from .llpm/skills/user on startup', async () => {
    // Create test skill in .llpm/skills/user
    const skillDir = join(userSkillsPath, 'user-specific-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---
name: user-specific-skill
description: "User-specific test skill"
instructions: "When testing user-specific skills, use this skill"
---

# User Specific Skill
`
    );

    const registry = new SkillRegistry({
      enabled: true,
      maxSkillsPerPrompt: 3,
      paths: [join(testProjectPath, '.llpm', 'skills', 'user')],
      requireConfirmationOnDeniedTool: false
    });

    await registry.scan();
    const skills = registry.getAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('user-specific-skill');
    expect(skills[0].source).toBe('project');
  });

  it('should discover skills from both .llpm/skills and .llpm/skills/user', async () => {
    // Create skill in .llpm/skills
    const projectSkillDir = join(skillsPath, 'project-skill');
    await mkdir(projectSkillDir, { recursive: true });
    await writeFile(
      join(projectSkillDir, 'SKILL.md'),
      `---
name: project-skill
description: "Project-wide skill"
instructions: "When testing project-wide skills, use this skill"
---

# Project Skill
`
    );

    // Create skill in .llpm/skills/user
    const userSkillDir = join(userSkillsPath, 'user-skill');
    await mkdir(userSkillDir, { recursive: true });
    await writeFile(
      join(userSkillDir, 'SKILL.md'),
      `---
name: user-skill
description: "User-specific skill"
instructions: "When testing user skills, use this skill"
---

# User Skill
`
    );

    const registry = new SkillRegistry({
      enabled: true,
      maxSkillsPerPrompt: 3,
      paths: [
        join(testProjectPath, '.llpm', 'skills'),
        join(testProjectPath, '.llpm', 'skills', 'user')
      ],
      requireConfirmationOnDeniedTool: false
    });

    await registry.scan();
    const skills = registry.getAllSkills();

    expect(skills).toHaveLength(2);
    expect(skills.map(s => s.name).sort()).toEqual(['project-skill', 'user-skill']);
  });

  it('should rescan and pick up new skills after project switch', async () => {
    // Initial scan with no skills
    const registry = new SkillRegistry({
      enabled: true,
      maxSkillsPerPrompt: 3,
      paths: [
        join(testProjectPath, '.llpm', 'skills'),
        join(testProjectPath, '.llpm', 'skills', 'user')
      ],
      requireConfirmationOnDeniedTool: false
    });

    await registry.scan();
    expect(registry.getAllSkills()).toHaveLength(0);

    // Add a new skill (simulating project switch to a project with skills)
    const skillDir = join(userSkillsPath, 'new-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---
name: new-skill
description: "Newly discovered skill"
instructions: "When testing newly discovered skills, use this skill"
---

# New Skill
`
    );

    // Rescan (this is what happens on project switch)
    await registry.scan();
    const skills = registry.getAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('new-skill');
  });

  it('should clear old skills when rescanning', async () => {
    // Create initial skill
    const skillDir1 = join(skillsPath, 'old-skill');
    await mkdir(skillDir1, { recursive: true });
    await writeFile(
      join(skillDir1, 'SKILL.md'),
      `---
name: old-skill
description: "Old skill"
instructions: "When testing old skills, use this skill"
---

# Old Skill
`
    );

    const registry = new SkillRegistry({
      enabled: true,
      maxSkillsPerPrompt: 3,
      paths: [join(testProjectPath, '.llpm', 'skills')],
      requireConfirmationOnDeniedTool: false
    });

    await registry.scan();
    expect(registry.getAllSkills()).toHaveLength(1);
    expect(registry.getAllSkills()[0].name).toBe('old-skill');

    // Remove old skill and add new skill (simulating switch to different project)
    await rm(skillDir1, { recursive: true, force: true });

    const skillDir2 = join(skillsPath, 'new-skill');
    await mkdir(skillDir2, { recursive: true });
    await writeFile(
      join(skillDir2, 'SKILL.md'),
      `---
name: new-skill
description: "New skill"
instructions: "When testing new skills after clearing old ones, use this skill"
---

# New Skill
`
    );

    // Rescan
    await registry.scan();
    const skills = registry.getAllSkills();

    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('new-skill');
    expect(skills.find(s => s.name === 'old-skill')).toBeUndefined();
  });
});
