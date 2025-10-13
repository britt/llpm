import cliMd from 'cli-markdown';

export async function renderMarkdown(markdown: string): Promise<string> {
  return cliMd(markdown);
}

export function isASCIICapableTerminal(force: boolean = false): boolean {
  if (force) {
    return true;
  }

  // Check if stdout is a TTY
  if (typeof process !== 'undefined' && process.stdout && !process.stdout.isTTY) {
    return false;
  }

  // Check environment variables
  if (process.env.NO_COLOR || process.env.CI === 'true') {
    return false;
  }

  return true;
}
