import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseSkillFile, parseSkillMetadata } from './skillParser';
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
license: MIT
---

# Test Skill

This is a test skill.
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.skill).toBeDefined();
      expect(result.skill?.name).toBe('test-skill');
      expect(result.skill?.description).toBe('A test skill for unit testing');
      expect(result.skill?.license).toBe('MIT');
      expect(result.skill?.content).toContain('# Test Skill');
    });

    it('should fail when SKILL.md does not exist', async () => {
      const skillPath = join(testDir, 'nonexistent-skill');
      await mkdir(skillPath, { recursive: true });

      const result = await parseSkillFile(skillPath, 'user');

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

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
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

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('description'))).toBe(true);
    });

    it('should fail when name does not match directory name', async () => {
      const skillPath = join(testDir, 'directory-name');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: different-name
description: "Name doesn't match directory"
---

# Mismatched Name
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('does not match directory'))).toBe(true);
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

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase letters, numbers, and hyphens'))).toBe(true);
    });

    it('should parse allowed-tools as space-delimited string', async () => {
      const skillPath = join(testDir, 'tools-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: tools-skill
description: "Skill with allowed tools"
allowed-tools: "Read Write Bash(git:*)"
---

# Tools Skill
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.skill?.allowedTools).toEqual(['Read', 'Write', 'Bash(git:*)']);
    });

    it('should handle skills without allowed-tools', async () => {
      const skillPath = join(testDir, 'no-tools-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: no-tools-skill
description: "Skill without tool restrictions"
---

# No Tools Skill
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.skill?.allowedTools).toBeUndefined();
    });

    it('should parse compatibility field', async () => {
      const skillPath = join(testDir, 'compat-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: compat-skill
description: "Skill with compatibility"
compatibility: "claude-code vscode-copilot"
---

# Compatible Skill
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.skill?.compatibility).toBe('claude-code vscode-copilot');
    });
  });

  describe('parseSkillMetadata', () => {
    it('should parse metadata for progressive disclosure', async () => {
      const skillPath = join(testDir, 'metadata-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: metadata-skill
description: "A skill for metadata testing"
license: Apache-2.0
---

# Metadata Skill

Full content here.
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const metadata = await parseSkillMetadata(skillPath, 'user');

      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBe('metadata-skill');
      expect(metadata?.description).toBe('A skill for metadata testing');
      expect(metadata?.source).toBe('user');
      expect(metadata?.path).toBe(skillPath);
    });

    it('should return null when SKILL.md does not exist', async () => {
      const skillPath = join(testDir, 'nonexistent');
      await mkdir(skillPath, { recursive: true });

      const metadata = await parseSkillMetadata(skillPath, 'user');

      expect(metadata).toBeNull();
    });

    it('should return null when frontmatter is missing required fields', async () => {
      const skillPath = join(testDir, 'no-frontmatter');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `# No Frontmatter

Just content, no YAML.
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const metadata = await parseSkillMetadata(skillPath, 'user');

      expect(metadata).toBeNull();
    });
  });
});
