import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseSkillFile, parseSkillMetadata, validateSkillDirectory, loadSkillResources } from './skillParser';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Skill } from '../types/skills';

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

  describe('parseSkillFile - additional validation', () => {
    it('should fail when name is too long', async () => {
      const skillPath = join(testDir, 'long-name-skill');
      await mkdir(skillPath, { recursive: true });

      const longName = 'a'.repeat(65);
      const skillContent = `---
name: ${longName}
description: "Name exceeds 64 characters"
---

# Long Name Skill
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('64 character'))).toBe(true);
    });

    it('should fail when name starts with hyphen', async () => {
      const skillPath = join(testDir, '-invalid-start');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: -invalid-start
description: "Name starts with hyphen"
---

# Invalid Start
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('start or end with a hyphen'))).toBe(true);
    });

    it('should fail when name ends with hyphen', async () => {
      const skillPath = join(testDir, 'invalid-end-');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: invalid-end-
description: "Name ends with hyphen"
---

# Invalid End
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('start or end with a hyphen'))).toBe(true);
    });

    it('should fail when name has consecutive hyphens', async () => {
      const skillPath = join(testDir, 'double--hyphen');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: double--hyphen
description: "Name has consecutive hyphens"
---

# Double Hyphen
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('consecutive hyphens'))).toBe(true);
    });

    it('should fail when name is not a string', async () => {
      const skillPath = join(testDir, 'number-name');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: 12345
description: "Name is a number"
---

# Number Name
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
    });

    it('should fail when description is too long', async () => {
      const skillPath = join(testDir, 'long-desc');
      await mkdir(skillPath, { recursive: true });

      const longDesc = 'a'.repeat(1025);
      const skillContent = `---
name: long-desc
description: "${longDesc}"
---

# Long Description
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('1024 character'))).toBe(true);
    });

    it('should fail when description is empty string', async () => {
      const skillPath = join(testDir, 'empty-desc');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: empty-desc
description: ""
---

# Empty Description
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      // Empty string is falsy in YAML, so it triggers "Missing required field"
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('description'))).toBe(true);
    });

    it('should fail when license is not a string', async () => {
      const skillPath = join(testDir, 'bad-license');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: bad-license
description: "Has non-string license"
license: 123
---

# Bad License
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('license') && e.includes('string'))).toBe(true);
    });

    it('should fail when compatibility is too long', async () => {
      const skillPath = join(testDir, 'long-compat');
      await mkdir(skillPath, { recursive: true });

      const longCompat = 'a'.repeat(501);
      const skillContent = `---
name: long-compat
description: "Has long compatibility"
compatibility: "${longCompat}"
---

# Long Compatibility
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('500 character'))).toBe(true);
    });

    it('should fail when metadata values are not strings', async () => {
      const skillPath = join(testDir, 'bad-metadata');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: bad-metadata
description: "Has non-string metadata"
metadata:
  key1: 123
  key2: "valid"
---

# Bad Metadata
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('metadata'))).toBe(true);
    });

    it('should fail when allowed-tools is not a string', async () => {
      const skillPath = join(testDir, 'bad-tools');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: bad-tools
description: "Has array allowed-tools"
allowed-tools:
  - Read
  - Write
---

# Bad Tools
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('allowed-tools') && e.includes('string'))).toBe(true);
    });

    it('should parse metadata object correctly', async () => {
      const skillPath = join(testDir, 'with-metadata');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: with-metadata
description: "Has valid metadata"
metadata:
  author: "Test Author"
  version: "1.0.0"
---

# With Metadata
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.skill?.metadata).toEqual({
        author: 'Test Author',
        version: '1.0.0'
      });
    });
  });

  describe('validateSkillDirectory', () => {
    it('should validate a valid skill directory', async () => {
      const skillPath = join(testDir, 'valid-skill');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: valid-skill
description: "A valid skill for testing"
license: MIT
---

# Valid Skill

This is valid content.
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await validateSkillDirectory(skillPath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.skill).toBeDefined();
    });

    it('should return error when SKILL.md does not exist', async () => {
      const skillPath = join(testDir, 'no-skill-md');
      await mkdir(skillPath, { recursive: true });

      const result = await validateSkillDirectory(skillPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('SKILL.md not found'))).toBe(true);
    });

    it('should warn about large content', async () => {
      const skillPath = join(testDir, 'large-content');
      await mkdir(skillPath, { recursive: true });

      // Create content with many lines
      const lines = Array(600).fill('This is a line of content.').join('\n');
      const skillContent = `---
name: large-content
description: "Has large content"
---

${lines}
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await validateSkillDirectory(skillPath);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('lines'))).toBe(true);
    });

    it('should return validation errors for invalid frontmatter', async () => {
      const skillPath = join(testDir, 'invalid-frontmatter');
      await mkdir(skillPath, { recursive: true });

      const skillContent = `---
name: wrong-name
description: "Name doesn't match directory"
---

# Invalid
`;

      await writeFile(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');

      const result = await validateSkillDirectory(skillPath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('loadSkillResources', () => {
    it('should return empty map when resource directory does not exist', async () => {
      const skillPath = join(testDir, 'no-resources');
      await mkdir(skillPath, { recursive: true });

      const skill: Skill = {
        name: 'no-resources',
        description: 'Test skill',
        content: '# Test',
        source: 'user',
        path: skillPath,
        enabled: true
      };

      const resources = await loadSkillResources(skill, 'scripts');

      expect(resources.size).toBe(0);
    });

    it('should load script files from scripts directory', async () => {
      const skillPath = join(testDir, 'with-scripts');
      await mkdir(skillPath, { recursive: true });
      await mkdir(join(skillPath, 'scripts'), { recursive: true });

      // Create script files
      await writeFile(join(skillPath, 'scripts', 'test.sh'), '#!/bin/bash\necho "Hello"', 'utf-8');
      await writeFile(join(skillPath, 'scripts', 'helper.py'), 'print("Hello")', 'utf-8');

      const skill: Skill = {
        name: 'with-scripts',
        description: 'Test skill',
        content: '# Test',
        source: 'user',
        path: skillPath,
        enabled: true
      };

      const resources = await loadSkillResources(skill, 'scripts');

      expect(resources.size).toBe(2);
      expect(resources.get('test.sh')).toContain('#!/bin/bash');
      expect(resources.get('helper.py')).toContain('print');
    });

    it('should load reference files from references directory', async () => {
      const skillPath = join(testDir, 'with-refs');
      await mkdir(skillPath, { recursive: true });
      await mkdir(join(skillPath, 'references'), { recursive: true });

      await writeFile(join(skillPath, 'references', 'guide.md'), '# Guide\n\nSome content.', 'utf-8');

      const skill: Skill = {
        name: 'with-refs',
        description: 'Test skill',
        content: '# Test',
        source: 'user',
        path: skillPath,
        enabled: true
      };

      const resources = await loadSkillResources(skill, 'references');

      expect(resources.size).toBe(1);
      expect(resources.get('guide.md')).toContain('# Guide');
    });

    it('should skip directories in resource folder', async () => {
      const skillPath = join(testDir, 'with-subdirs');
      await mkdir(skillPath, { recursive: true });
      await mkdir(join(skillPath, 'scripts'), { recursive: true });
      await mkdir(join(skillPath, 'scripts', 'subdir'), { recursive: true });

      await writeFile(join(skillPath, 'scripts', 'main.sh'), '#!/bin/bash', 'utf-8');
      await writeFile(join(skillPath, 'scripts', 'subdir', 'nested.sh'), '#!/bin/bash', 'utf-8');

      const skill: Skill = {
        name: 'with-subdirs',
        description: 'Test skill',
        content: '# Test',
        source: 'user',
        path: skillPath,
        enabled: true
      };

      const resources = await loadSkillResources(skill, 'scripts');

      // Should only have main.sh, not the nested file
      expect(resources.size).toBe(1);
      expect(resources.has('main.sh')).toBe(true);
      expect(resources.has('nested.sh')).toBe(false);
    });
  });
});
