import * as yaml from 'js-yaml';
import type { Note, NoteFrontmatter } from '../types/note';

/**
 * Convert a title to a URL-safe slug
 */
export function slugify(title: string, maxLength = 50): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '')         // Trim hyphens from ends
    .slice(0, maxLength);
}

/**
 * Generate a filename from title and timestamp
 * Format: YYYYMMDD-HHMMSS-{title-slug}.md
 */
export function generateNoteFilename(title: string, createdAt: string): string {
  const date = new Date(createdAt);
  const timestamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
    '-',
    String(date.getUTCHours()).padStart(2, '0'),
    String(date.getUTCMinutes()).padStart(2, '0'),
    String(date.getUTCSeconds()).padStart(2, '0')
  ].join('');

  const slug = slugify(title);
  return `${timestamp}-${slug}.md`;
}

/**
 * Parse a markdown file with YAML frontmatter into a Note
 */
export function parseNoteFrontmatter(markdown: string): Note {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    throw new Error('Missing frontmatter: file must start with ---');
  }

  const [, frontmatterYaml, content] = match;
  const frontmatter = yaml.load(frontmatterYaml) as NoteFrontmatter;

  // Validate required fields
  if (!frontmatter.id) throw new Error('Missing required field: id');
  if (!frontmatter.title) throw new Error('Missing required field: title');
  if (!frontmatter.created_at) throw new Error('Missing required field: created_at');
  if (!frontmatter.updated_at) throw new Error('Missing required field: updated_at');

  return {
    id: frontmatter.id,
    title: frontmatter.title,
    content: content.trim(),
    tags: frontmatter.tags || [],
    createdAt: frontmatter.created_at,
    updatedAt: frontmatter.updated_at,
    source: frontmatter.source || 'user'
  };
}

/**
 * Serialize a Note to markdown with YAML frontmatter
 */
export function serializeNote(note: Note): string {
  const frontmatter: NoteFrontmatter = {
    id: note.id,
    title: note.title,
    tags: note.tags,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    source: note.source
  };

  const yamlStr = yaml.dump(frontmatter, {
    lineWidth: -1, // Don't wrap lines
    quotingType: '"',
    forceQuotes: false
  });

  return `---\n${yamlStr}---\n\n${note.content}\n`;
}
