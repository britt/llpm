/**
 * Utilities for parsing and validating SKILL.md files
 */
import matter from 'gray-matter';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Skill, SkillFrontmatter, SkillValidationResult } from '../types/skills';

/**
 * Parse a SKILL.md file and extract frontmatter + content
 */
export async function parseSkillFile(
  skillPath: string,
  source: 'personal' | 'project'
): Promise<SkillValidationResult> {
  const errors: string[] = [];

  // Check if SKILL.md exists
  const skillFilePath = join(skillPath, 'SKILL.md');
  if (!existsSync(skillFilePath)) {
    return {
      valid: false,
      errors: [`SKILL.md not found in ${skillPath}`]
    };
  }

  try {
    // Read and parse file
    const fileContent = await readFile(skillFilePath, 'utf-8');
    const { data, content } = matter(fileContent);

    // Validate frontmatter
    const validationErrors = validateFrontmatter(data);
    if (validationErrors.length > 0) {
      return {
        valid: false,
        errors: validationErrors
      };
    }

    const frontmatter = data as SkillFrontmatter;

    // Create Skill object
    const skill: Skill = {
      name: frontmatter.name,
      description: frontmatter.description,
      content: content.trim(),
      source,
      path: skillPath,
      allowed_tools: frontmatter.allowed_tools,
      tags: frontmatter.tags,
      vars: frontmatter.vars,
      resources: frontmatter.resources,
      enabled: true // Default to enabled
    };

    return {
      valid: true,
      errors: [],
      skill
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to parse SKILL.md: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Validate frontmatter schema
 */
function validateFrontmatter(data: any): string[] {
  const errors: string[] = [];

  // Required: name
  if (!data.name) {
    errors.push('Missing required field: name');
  } else if (typeof data.name !== 'string') {
    errors.push('Field "name" must be a string');
  } else if (data.name.length > 64) {
    errors.push('Field "name" must be <=64 characters');
  } else if (!/^[a-z0-9-]+$/.test(data.name)) {
    errors.push('Field "name" must contain only lowercase letters, numbers, and hyphens');
  }

  // Required: description
  if (!data.description) {
    errors.push('Missing required field: description');
  } else if (typeof data.description !== 'string') {
    errors.push('Field "description" must be a string');
  } else if (data.description.length > 1024) {
    errors.push('Field "description" must be <=1024 characters');
  }

  // Optional: allowed_tools
  if (data.allowed_tools !== undefined) {
    if (!Array.isArray(data.allowed_tools)) {
      errors.push('Field "allowed_tools" must be an array');
    } else if (!data.allowed_tools.every((t: any) => typeof t === 'string')) {
      errors.push('Field "allowed_tools" must be an array of strings');
    }
  }

  // Optional: tags
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push('Field "tags" must be an array');
    } else if (!data.tags.every((t: any) => typeof t === 'string')) {
      errors.push('Field "tags" must be an array of strings');
    }
  }

  // Optional: vars
  if (data.vars !== undefined) {
    if (typeof data.vars !== 'object' || Array.isArray(data.vars)) {
      errors.push('Field "vars" must be an object');
    }
  }

  // Optional: resources
  if (data.resources !== undefined) {
    if (!Array.isArray(data.resources)) {
      errors.push('Field "resources" must be an array');
    } else if (!data.resources.every((r: any) => typeof r === 'string')) {
      errors.push('Field "resources" must be an array of strings');
    }
  }

  return errors;
}

/**
 * Apply variable substitution to skill content
 */
export function applyVariableSubstitution(
  content: string,
  vars: Record<string, string>
): string {
  let result = content;

  // Replace {{varName}} with var values
  for (const [key, value] of Object.entries(vars)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }

  return result;
}

/**
 * Load resource files referenced by a skill
 */
export async function loadSkillResources(
  skill: Skill
): Promise<Map<string, string>> {
  const resourceContents = new Map<string, string>();

  if (!skill.resources || skill.resources.length === 0) {
    return resourceContents;
  }

  for (const resourcePath of skill.resources) {
    const fullPath = join(skill.path, resourcePath);

    if (!existsSync(fullPath)) {
      console.warn(`Resource file not found: ${fullPath}`);
      continue;
    }

    try {
      const content = await readFile(fullPath, 'utf-8');
      resourceContents.set(resourcePath, content);
    } catch (error) {
      console.warn(`Failed to load resource ${resourcePath}:`, error);
    }
  }

  return resourceContents;
}
