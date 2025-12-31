import { ShellExecutor } from '../services/shellExecutor';
import { DEFAULT_SHELL_CONFIG } from '../types/shell';
import { getConfigDir } from './config';
import { parseNoteFrontmatter } from './notesFrontmatter';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { SearchOptions, SearchResult } from '../types/note';

/**
 * Check if a command exists in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  const executor = new ShellExecutor(
    { ...DEFAULT_SHELL_CONFIG, enabled: true },
    process.cwd()
  );

  const result = await executor.execute(`which ${command}`);
  return result.success && result.exitCode === 0;
}

/**
 * Ensure ripgrep is installed, or throw helpful error
 */
export async function ensureRipgrep(shellEnabled = false): Promise<void> {
  const hasRg = await commandExists('rg');

  if (hasRg) return;

  if (shellEnabled) {
    // Auto-install (platform detection would go here)
    const executor = new ShellExecutor(
      { ...DEFAULT_SHELL_CONFIG, enabled: true },
      process.cwd()
    );

    // Detect platform and install
    const platform = process.platform;
    let installCmd: string;

    if (platform === 'darwin') {
      installCmd = 'brew install ripgrep';
    } else if (platform === 'linux') {
      installCmd = 'sudo apt-get install -y ripgrep';
    } else {
      installCmd = 'cargo install ripgrep';
    }

    await executor.execute(installCmd);
  } else {
    throw new Error(
      'ripgrep (rg) is required for notes search.\n\n' +
      'Install it manually:\n' +
      '  macOS:  brew install ripgrep\n' +
      '  Ubuntu: sudo apt-get install ripgrep\n' +
      '  Cargo:  cargo install ripgrep\n\n' +
      'Or enable the shell tool to auto-install.'
    );
  }
}

/**
 * Search notes using ripgrep
 */
export async function searchNotesWithRipgrep(
  projectId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  await ensureRipgrep();

  const notesDir = join(getConfigDir(), 'projects', projectId, 'notes');

  if (!existsSync(notesDir)) {
    return [];
  }

  const executor = new ShellExecutor(
    { ...DEFAULT_SHELL_CONFIG, enabled: true },
    notesDir
  );

  // Build ripgrep command
  const args: string[] = ['rg'];

  // Case sensitivity
  if (!options.caseSensitive) {
    args.push('-i');
  }

  // JSON output for parsing
  args.push('--json');

  // Add query (escape for shell)
  const escapedQuery = query.replace(/"/g, '\\"');
  args.push(`"${escapedQuery}"`);

  // Search in notes directory
  args.push('.');

  const result = await executor.execute(args.join(' '));

  // rg returns exit code 1 when no matches (not an error)
  if (result.exitCode === 1 && !result.stdout) {
    return [];
  }

  if (!result.success && result.exitCode !== 1) {
    throw new Error(`ripgrep failed: ${result.stderr}`);
  }

  // Parse JSON output
  const results: SearchResult[] = [];
  const matchesByFile = new Map<string, { matches: string[]; title: string }>();

  const lines = result.stdout.split('\n').filter(Boolean);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);

      if (parsed.type === 'match' && parsed.data?.path?.text) {
        const filePath = parsed.data.path.text;
        const matchText = parsed.data.lines?.text?.trim() || '';

        if (!matchesByFile.has(filePath)) {
          // Read file to get title from frontmatter
          let title = 'Unknown';
          try {
            const content = readFileSync(filePath, 'utf-8');
            const note = parseNoteFrontmatter(content);
            title = note.title;
          } catch {
            // Use filename as fallback
            title = filePath.split('/').pop()?.replace('.md', '') || 'Unknown';
          }

          matchesByFile.set(filePath, { matches: [], title });
        }

        const fileData = matchesByFile.get(filePath)!;
        if (matchText && !fileData.matches.includes(matchText)) {
          fileData.matches.push(matchText);
        }
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  // Convert to results
  for (const [filePath, data] of matchesByFile) {
    const id = filePath.split('/').pop()?.replace('.md', '') || '';
    results.push({
      id,
      title: data.title,
      matches: data.matches,
      matchCount: data.matches.length
    });
  }

  // Apply limit
  if (options.limit && results.length > options.limit) {
    return results.slice(0, options.limit);
  }

  return results;
}
