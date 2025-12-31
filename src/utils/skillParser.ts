/**
 * Utilities for parsing and validating SKILL.md files
 *
 * Implements the Agent Skills specification from agentskills.io
 * https://agentskills.io/specification
 */
import matter from 'gray-matter';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join, basename } from 'path';
import type { Skill, SkillFrontmatter, SkillValidationResult, SkillMetadata, SkillSource } from '../types/skills';

/**
 * Validation error with field context
 */
interface ValidationError {
  field: string;
  message: string;
}

/**
 * Parse a SKILL.md file and extract frontmatter + content
 */
export async function parseSkillFile(
  skillPath: string,
  source: SkillSource
): Promise<SkillValidationResult> {
  const skillFilePath = join(skillPath, 'SKILL.md');

  if (!existsSync(skillFilePath)) {
    return {
      valid: false,
      errors: [`SKILL.md not found in ${skillPath}`]
    };
  }

  try {
    const fileContent = await readFile(skillFilePath, 'utf-8');
    const { data, content } = matter(fileContent);

    // Get directory name for validation
    const directoryName = basename(skillPath);

    // Validate frontmatter
    const validationErrors = validateFrontmatter(data, directoryName);
    if (validationErrors.length > 0) {
      return {
        valid: false,
        errors: validationErrors.map(e => `Skill '${directoryName}': ${e.message}`)
      };
    }

    const frontmatter = data as SkillFrontmatter;

    // Parse allowed-tools from space-delimited string to array
    const allowedTools = frontmatter['allowed-tools']
      ? parseAllowedTools(frontmatter['allowed-tools'])
      : undefined;

    // Create Skill object
    const skill: Skill = {
      name: frontmatter.name,
      description: frontmatter.description,
      content: content.trim(),
      source,
      path: skillPath,
      license: frontmatter.license,
      compatibility: frontmatter.compatibility,
      metadata: frontmatter.metadata,
      allowedTools,
      enabled: true
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
 * Parse only the metadata (name + description) for progressive disclosure
 * This is a lightweight parse that only extracts what's needed at startup
 */
export async function parseSkillMetadata(
  skillPath: string,
  source: SkillSource
): Promise<SkillMetadata | null> {
  const skillFilePath = join(skillPath, 'SKILL.md');

  if (!existsSync(skillFilePath)) {
    return null;
  }

  try {
    const fileContent = await readFile(skillFilePath, 'utf-8');
    const { data } = matter(fileContent);

    // Only extract name and description - minimal validation
    if (!data.name || !data.description) {
      return null;
    }

    return {
      name: data.name,
      description: data.description,
      source,
      path: skillPath
    };
  } catch {
    return null;
  }
}

/**
 * Validate frontmatter against Agent Skills spec
 */
function validateFrontmatter(data: any, directoryName: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required: name
  if (!data.name) {
    errors.push({ field: 'name', message: 'Missing required field: name' });
  } else if (typeof data.name !== 'string') {
    errors.push({ field: 'name', message: 'Field "name" must be a string' });
  } else {
    // Validate name format per Agent Skills spec
    const name = data.name;

    if (name.length === 0) {
      errors.push({ field: 'name', message: 'Field "name" cannot be empty' });
    } else if (name.length > 64) {
      errors.push({ field: 'name', message: 'Field "name" exceeds 64 character limit' });
    } else if (!/^[a-z0-9-]+$/.test(name)) {
      errors.push({ field: 'name', message: 'name must be lowercase letters, numbers, and hyphens only' });
    } else if (name.startsWith('-') || name.endsWith('-')) {
      errors.push({ field: 'name', message: 'name cannot start or end with a hyphen' });
    } else if (name.includes('--')) {
      errors.push({ field: 'name', message: 'name cannot contain consecutive hyphens' });
    }

    // Validate name matches directory name
    if (name !== directoryName) {
      errors.push({
        field: 'name',
        message: `name field '${name}' does not match directory name '${directoryName}'`
      });
    }
  }

  // Required: description
  if (!data.description) {
    errors.push({ field: 'description', message: 'Missing required field: description' });
  } else if (typeof data.description !== 'string') {
    errors.push({ field: 'description', message: 'Field "description" must be a string' });
  } else {
    if (data.description.length === 0) {
      errors.push({ field: 'description', message: 'Field "description" cannot be empty' });
    } else if (data.description.length > 1024) {
      errors.push({ field: 'description', message: 'description exceeds 1024 character limit' });
    }
  }

  // Optional: license (no specific constraints in spec)
  if (data.license !== undefined && typeof data.license !== 'string') {
    errors.push({ field: 'license', message: 'Field "license" must be a string' });
  }

  // Optional: compatibility (max 500 chars)
  if (data.compatibility !== undefined) {
    if (typeof data.compatibility !== 'string') {
      errors.push({ field: 'compatibility', message: 'Field "compatibility" must be a string' });
    } else if (data.compatibility.length > 500) {
      errors.push({ field: 'compatibility', message: 'compatibility exceeds 500 character limit' });
    }
  }

  // Optional: metadata (key-value string mapping)
  if (data.metadata !== undefined) {
    if (typeof data.metadata !== 'object' || Array.isArray(data.metadata) || data.metadata === null) {
      errors.push({ field: 'metadata', message: 'Field "metadata" must be an object' });
    } else {
      // Validate all values are strings
      for (const [key, value] of Object.entries(data.metadata)) {
        if (typeof value !== 'string') {
          errors.push({
            field: 'metadata',
            message: `metadata.${key} must be a string, got ${typeof value}`
          });
        }
      }
    }
  }

  // Optional: allowed-tools (space-delimited string)
  if (data['allowed-tools'] !== undefined) {
    if (typeof data['allowed-tools'] !== 'string') {
      errors.push({ field: 'allowed-tools', message: 'Field "allowed-tools" must be a string' });
    }
  }

  return errors;
}

/**
 * Parse allowed-tools from space-delimited string
 * Example: "Bash(git:*) Bash(jq:*) Read" -> ["Bash(git:*)", "Bash(jq:*)", "Read"]
 */
function parseAllowedTools(allowedToolsString: string): string[] {
  return allowedToolsString
    .split(/\s+/)
    .map(tool => tool.trim())
    .filter(tool => tool.length > 0);
}

/**
 * Load resource files from a skill's directories
 * Supports scripts/, references/, and assets/ per Agent Skills spec
 */
export async function loadSkillResources(
  skill: Skill,
  resourceType: 'scripts' | 'references' | 'assets'
): Promise<Map<string, string>> {
  const resourceContents = new Map<string, string>();
  const resourceDir = join(skill.path, resourceType);

  if (!existsSync(resourceDir)) {
    return resourceContents;
  }

  try {
    const { readdir } = await import('fs/promises');
    const entries = await readdir(resourceDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const filePath = join(resourceDir, entry.name);
      try {
        const content = await readFile(filePath, 'utf-8');
        resourceContents.set(entry.name, content);
      } catch (error) {
        console.warn(`Failed to load ${resourceType}/${entry.name}:`, error);
      }
    }
  } catch (error) {
    console.warn(`Failed to read ${resourceType} directory:`, error);
  }

  return resourceContents;
}

/**
 * Validate a skill directory against the Agent Skills spec
 * Returns a detailed validation result suitable for CLI output
 */
export async function validateSkillDirectory(
  skillPath: string
): Promise<SkillValidationResult> {
  const skillFilePath = join(skillPath, 'SKILL.md');
  const directoryName = basename(skillPath);

  // Check SKILL.md exists
  if (!existsSync(skillFilePath)) {
    return {
      valid: false,
      errors: [`SKILL.md not found in ${skillPath}`]
    };
  }

  try {
    const fileContent = await readFile(skillFilePath, 'utf-8');
    const { data, content } = matter(fileContent);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate frontmatter
    const frontmatterErrors = validateFrontmatter(data, directoryName);
    errors.push(...frontmatterErrors.map(e => `${e.field}: ${e.message}`));

    // Check body content recommendations
    const bodyLines = content.split('\n').length;
    if (bodyLines > 500) {
      warnings.push(`SKILL.md body has ${bodyLines} lines; recommended to keep under 500 and use references/ for detailed content`);
    }

    // Estimate token count (rough approximation: ~4 chars per token)
    const estimatedTokens = Math.ceil(content.length / 4);
    if (estimatedTokens > 5000) {
      warnings.push(`SKILL.md body is approximately ${estimatedTokens} tokens; recommended to keep under 5000`);
    }

    // Check optional directories exist (informational)
    const optionalDirs = ['scripts', 'references', 'assets'];
    for (const dir of optionalDirs) {
      const dirPath = join(skillPath, dir);
      if (existsSync(dirPath)) {
        // Directory exists, could add info about files inside
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Parse the skill if valid
    const frontmatter = data as SkillFrontmatter;
    const allowedTools = frontmatter['allowed-tools']
      ? parseAllowedTools(frontmatter['allowed-tools'])
      : undefined;

    const skill: Skill = {
      name: frontmatter.name,
      description: frontmatter.description,
      content: content.trim(),
      source: 'user', // Default for validation
      path: skillPath,
      license: frontmatter.license,
      compatibility: frontmatter.compatibility,
      metadata: frontmatter.metadata,
      allowedTools,
      enabled: true
    };

    return {
      valid: true,
      errors: [],
      warnings: warnings.length > 0 ? warnings : undefined,
      skill
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to parse SKILL.md: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}
