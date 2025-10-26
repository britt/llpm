/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseSkillFile, applyVariableSubstitution } from './skillParser';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('skillParser', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temp directory for test skills
    testDir = join(tmpdir(), `llpm-skill-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('parseSkillFile', () => {
    it('should parse a valid SKILL.md file', async () => {
      const skillPath = join(testDir, 'test-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: test-skill
description: "A test skill for unit testing"
instructions: "When testing the skill system, use this skill"
tags:
  - test
  - example
---

# Test Skill

This is a test skill.
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'personal');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.skill).toBeDefined();
      expect(result.skill?.name).toBe('test-skill');
      expect(result.skill?.description).toBe('A test skill for unit testing');
      expect(result.skill?.instructions).toBe('When testing the skill system, use this skill');
      expect(result.skill?.tags).toEqual(['test', 'example']);
      expect(result.skill?.content).toContain('# Test Skill');
    });

    it('should fail when SKILL.md does not exist', async () => {
      const skillPath = join(testDir, 'nonexistent-skill');
      await mkdir(skillPath, { recursive: true });

      const result = await parseSkillFile(skillPath, 'personal');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('SKILL.md not found');
    });

    it('should fail when name is missing', async () => {
      const skillPath = join(testDir, 'invalid-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
description: "Missing name field"
---

# Invalid Skill
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'personal');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: name');
    });

    it('should fail when description is missing', async () => {
      const skillPath = join(testDir, 'invalid-skill-2');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: invalid-skill-2
---

# Invalid Skill
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'personal');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: description');
    });

    it('should fail when instructions is missing', async () => {
      const skillPath = join(testDir, 'no-instructions-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: no-instructions-skill
description: "Skill without instructions field"
---

# Skill Without Instructions

This skill is missing the required instructions field.
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'personal');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Missing required field: instructions - Skills without instructions will not be loaded into the system prompt'
      );
    });

    it('should fail when instructions is not a string', async () => {
      const skillPath = join(testDir, 'invalid-instructions-type');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: invalid-instructions-type
description: "Skill with invalid instructions type"
instructions: 123
---

# Invalid Instructions Type
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'personal');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "instructions" must be a string');
    });

    it('should fail when instructions is empty', async () => {
      const skillPath = join(testDir, 'empty-instructions-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: empty-instructions-skill
description: "Skill with empty instructions"
instructions: "   "
---

# Empty Instructions
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'personal');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "instructions" cannot be empty');
    });

    it('should parse a skill with valid instructions', async () => {
      const skillPath = join(testDir, 'valid-instructions-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: valid-instructions-skill
description: "Skill with valid instructions"
instructions: "When asked to perform a specific task, use this skill"
tags:
  - test
---

# Valid Instructions Skill

This skill has proper instructions.
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'personal');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.skill).toBeDefined();
      expect(result.skill?.instructions).toBe(
        'When asked to perform a specific task, use this skill'
      );
    });

    it('should fail when name contains invalid characters', async () => {
      const skillPath = join(testDir, 'invalid-name-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: Invalid_Skill!
description: "Name has invalid characters"
---

# Invalid Skill
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'personal');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase letters, numbers, and hyphens'))).toBe(
        true
      );
    });

    it('should parse allowed_tools correctly', async () => {
      const skillPath = join(testDir, 'tools-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: tools-skill
description: "Skill with allowed tools"
instructions: "When using this skill, only specific tools are allowed"
allowed_tools:
  - github
  - shell
  - notes
---

# Tools Skill
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'personal');

      expect(result.valid).toBe(true);
      expect(result.skill?.allowed_tools).toEqual(['github', 'shell', 'notes']);
    });

    it('should parse vars correctly', async () => {
      const skillPath = join(testDir, 'vars-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: vars-skill
description: "Skill with variables"
instructions: "When using variables in skills, they get substituted"
vars:
  repoName: "my-repo"
  owner: "john-doe"
---

# Vars Skill

Repository: {{repoName}}
Owner: {{owner}}
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'personal');

      expect(result.valid).toBe(true);
      expect(result.skill?.vars).toEqual({ repoName: 'my-repo', owner: 'john-doe' });
    });
  });

  describe('applyVariableSubstitution', () => {
    it('should replace variables in content', () => {
      const content = 'Hello {{name}}, welcome to {{project}}!';
      const vars = { name: 'Alice', project: 'LLPM' };

      const result = applyVariableSubstitution(content, vars);

      expect(result).toBe('Hello Alice, welcome to LLPM!');
    });

    it('should handle multiple occurrences of same variable', () => {
      const content = '{{name}} is great. {{name}} is awesome!';
      const vars = { name: 'Bob' };

      const result = applyVariableSubstitution(content, vars);

      expect(result).toBe('Bob is great. Bob is awesome!');
    });

    it('should handle variables with whitespace', () => {
      const content = 'Value: {{ value }}';
      const vars = { value: '42' };

      const result = applyVariableSubstitution(content, vars);

      expect(result).toBe('Value: 42');
    });

    it('should leave unreferenced variables unchanged', () => {
      const content = 'Only {{foo}} here';
      const vars = { foo: 'bar', unused: 'value' };

      const result = applyVariableSubstitution(content, vars);

      expect(result).toBe('Only bar here');
    });
  });
});
