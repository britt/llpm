import { getCommandRegistry } from '../commands/registry';

export function generateCLIHelp(): string {
  const registry = getCommandRegistry();
  const commands = Object.values(registry);

  const lines = [
    'LLPM — AI-powered project management CLI\n',
    'Usage: llpm [options] [command]\n',
    'Options:',
    '  --help, -h           Show this help message',
    '  --verbose, -v        Enable verbose logging',
    '  --profile, -p <name> Use a specific credential profile',
    '',
    'Commands:',
    '  setup                Run the setup wizard',
    '',
    'In-app slash commands:',
    ...commands.map(cmd => `  /${cmd.name.padEnd(16)} ${cmd.description}`),
    '',
    'Run llpm <command> --help for sub-command help (e.g., llpm project --help).',
  ];

  return lines.join('\n');
}

export function shouldShowCLIHelp(args: string[]): boolean {
  return args.includes('--help') || args.includes('-h');
}

export function getCommandFromArgs(args: string[]): string | null {
  const flagsWithValues = new Set(['--profile', '-p']);
  let skipNext = false;

  for (const arg of args) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (flagsWithValues.has(arg)) {
      skipNext = true;
      continue;
    }
    if (arg.startsWith('-')) {
      continue;
    }
    if (arg === 'setup') {
      continue;
    }
    return arg;
  }

  return null;
}
