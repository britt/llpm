# Help System Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix `/help` markdown rendering, add `llpm --help` CLI flag, and support `--help` flag across all commands (Issues #311, #313).

**Architecture:** Three independent improvements to the help system: (1) Reformat `/help` output as proper markdown so the existing `cli-markdown` renderer produces clean output, (2) Add `--help`/`-h` CLI flag handling in `index.ts` that prints help and exits, (3) Normalize `--help` as an alias for the `help` sub-command in `executeCommand()` so it works for all commands both in-app and from CLI.

**Tech Stack:** Bun, TypeScript, Vitest, Ink, cli-markdown

---

## Task 1: Reformat `/help` Output as Markdown

The `/help` command output in `src/commands/help.ts` uses bullet chars (`•`) and emoji headers but lacks markdown structure. The `cli-markdown` renderer (which already processes `ui-notification` messages) needs proper markdown syntax to render correctly.

**Files:**
- Modify: `src/commands/help.ts`
- Modify: `src/commands/help.test.ts`

### Step 1: Write failing tests for markdown-formatted help output

Add tests to `src/commands/help.test.ts` that verify the help output uses markdown formatting:

```typescript
it('should format commands as a markdown list', async () => {
  const result = await helpCommand.execute([]);

  expect(result.success).toBe(true);
  // Commands should be in markdown bold + code format
  expect(result.content).toContain('`/help`');
  expect(result.content).toContain('`/quit`');
  expect(result.content).toContain('`/model`');
});

it('should use markdown headers for sections', async () => {
  const result = await helpCommand.execute([]);

  expect(result.success).toBe(true);
  // Should use ## or ### headers, not emoji-only headers
  expect(result.content).toMatch(/^##\s/m);
});

it('should format keyboard shortcuts as markdown list', async () => {
  const result = await helpCommand.execute([]);

  expect(result.success).toBe(true);
  // Shortcuts should use markdown bold for key combos
  expect(result.content).toContain('**Ctrl+A**');
  expect(result.content).toContain('**Ctrl+C**');
});
```

### Step 2: Run tests to verify they fail

Run: `bun run test src/commands/help.test.ts`
Expected: FAIL — current output uses `•` bullets and plain text, not markdown formatting.

### Step 3: Reformat help output in `src/commands/help.ts`

Replace the `helpText` array in the `execute` function:

```typescript
const helpText = [
  '## Available Commands\n',
  ...commands.map(cmd => `- \`/${cmd.name}\` — ${cmd.description}`),
  '',
  '> **Tip:** Get detailed help for any command with `/<command> help` or `/<command> --help`\n',
  '## Keyboard Shortcuts\n',
  '| Key | Action |',
  '|-----|--------|',
  '| **Ctrl+A** | Move cursor to beginning of input |',
  '| **Ctrl+E** | Move cursor to end of input |',
  '| **Ctrl+U** | Clear input line |',
  '| **Ctrl+V** | Paste from clipboard |',
  '| **Shift+Tab** | Switch project |',
  '| **Option+M** | Switch model |',
  '| **Up/Down** | Navigate input history |',
  '| **Ctrl+C** | Exit application |',
  '',
  'Regular messages are sent to the AI assistant. Type `/quit` to exit gracefully.'
].join('\n');
```

Also update the `/help help` output to use markdown:

```typescript
if (args.length > 0 && args[0]?.toLowerCase() === 'help') {
  return {
    content: [
      '## Help Command\n',
      '- `/help` — Show available commands and shortcuts',
      '- `/help help` — Show this help message\n',
      'Displays all available commands, keyboard shortcuts, and usage information.',
      '',
      '> Most commands support a `help` sub-command (e.g., `/project help`).'
    ].join('\n'),
    success: true
  };
}
```

### Step 4: Update existing test expectations

Some existing tests check for strings that changed. Update:

- `'Available Commands'` → still matches (`## Available Commands`)
- `'Keyboard Shortcuts'` → still matches (`## Keyboard Shortcuts`)
- `'Help Command'` → still matches (`## Help Command`)
- `'/project help'` → still matches
- `'/model help'` → update test: the tip line mentions `/<command> help` generically, so check for that pattern or for `/project help` in a different way (if no longer listed individually, adjust the test)

Review each existing test assertion and fix any that break due to the reformatting. The key assertions to preserve:
- Lists all registered commands
- Shows keyboard shortcuts (Ctrl+A, Ctrl+C)
- Mentions sub-command help
- Help about help works
- Case insensitive help argument

### Step 5: Run tests to verify they pass

Run: `bun run test src/commands/help.test.ts`
Expected: ALL PASS

### Step 6: Commit

```bash
git add src/commands/help.ts src/commands/help.test.ts
git commit -m "feat(help): reformat /help output as markdown

- RED: Tests for markdown headers, code-formatted commands, bold shortcuts
- GREEN: Rewrote help output with ## headers, backtick commands, markdown table
- Status: all help tests passing, build successful
- Closes #311"
```

---

## Task 2: Normalize `--help` Flag in `executeCommand()`

Add `--help` and `-h` flag normalization in `executeCommand()` so that for any command, passing `--help` is equivalent to passing the `help` sub-command. This handles both in-app usage (`/project --help`) and will be reused by the CLI flag (Task 3).

**Files:**
- Modify: `src/commands/registry.ts`
- Modify: `src/commands/registry.test.ts`

### Step 1: Write failing tests for `--help` normalization

Add tests to `src/commands/registry.test.ts`:

```typescript
describe('--help flag normalization', () => {
  it('should treat --help as help sub-command', async () => {
    const mockCommand: Command = {
      name: 'project',
      description: 'Manage projects',
      execute: vi.fn().mockReturnValue({ content: 'project help output', success: true })
    };

    // Register mock command (use your existing mock setup pattern)
    // Execute with --help flag
    const result = await executeCommand('project', ['--help']);

    expect(mockCommand.execute).toHaveBeenCalledWith(['help'], undefined);
    expect(result.success).toBe(true);
  });

  it('should treat -h as help sub-command', async () => {
    const mockCommand: Command = {
      name: 'project',
      description: 'Manage projects',
      execute: vi.fn().mockReturnValue({ content: 'project help output', success: true })
    };

    const result = await executeCommand('project', ['-h']);

    expect(mockCommand.execute).toHaveBeenCalledWith(['help'], undefined);
    expect(result.success).toBe(true);
  });

  it('should treat --help anywhere in args as help sub-command', async () => {
    const mockCommand: Command = {
      name: 'model',
      description: 'Model management',
      execute: vi.fn().mockReturnValue({ content: 'model help output', success: true })
    };

    const result = await executeCommand('model', ['list', '--help']);

    expect(mockCommand.execute).toHaveBeenCalledWith(['help'], undefined);
    expect(result.success).toBe(true);
  });
});
```

Note: Adapt the test setup to match the existing pattern in `registry.test.ts` for mocking the command registry.

### Step 2: Run tests to verify they fail

Run: `bun run test src/commands/registry.test.ts`
Expected: FAIL — `executeCommand` currently passes args through without normalization.

### Step 3: Add `--help` normalization in `executeCommand()`

In `src/commands/registry.ts`, modify `executeCommand()`:

```typescript
export async function executeCommand(command: string, args: string[] = [], context?: import('./types').CommandContext) {
  debug('Executing command:', command, 'with args:', args);

  const registry = getCommandRegistry();
  const cmd = registry[command];

  if (!cmd) {
    debug('Command not found:', command);
    return {
      content: `❌ Unknown command: /${command}\nType /help to see available commands.`,
      success: false
    };
  }

  // Normalize --help and -h flags to 'help' sub-command
  const normalizedArgs = (args.includes('--help') || args.includes('-h'))
    ? ['help']
    : args;

  try {
    const result = await cmd.execute(normalizedArgs, context);
    debug('Command execution result:', result.success ? 'success' : 'failure');
    return result;
  } catch (error) {
    debug('Command execution error:', error);
    return {
      content: `❌ Error executing command /${command}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false
    };
  }
}
```

### Step 4: Run tests to verify they pass

Run: `bun run test src/commands/registry.test.ts`
Expected: ALL PASS

### Step 5: Commit

```bash
git add src/commands/registry.ts src/commands/registry.test.ts
git commit -m "feat(help): normalize --help and -h flags to help sub-command

- RED: Tests for --help, -h, and --help anywhere in args
- GREEN: Added flag normalization in executeCommand()
- Status: all registry tests passing, build successful"
```

---

## Task 3: Add `llpm --help` CLI Flag

Add `--help` and `-h` flag handling to the CLI entry point so `llpm --help` prints help text and exits, and `llpm <command> --help` prints command-specific help.

**Files:**
- Modify: `index.ts`
- Create: `src/utils/cliHelp.ts`
- Create: `src/utils/cliHelp.test.ts`

### Step 1: Write failing tests for CLI help text generation

Create `src/utils/cliHelp.test.ts`:

```typescript
import '../../test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCLIHelp } from './cliHelp';
import * as registry from '../commands/registry';

describe('generateCLIHelp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(registry, 'getCommandRegistry').mockReturnValue({
      help: { name: 'help', description: 'Show available commands', execute: vi.fn() },
      quit: { name: 'quit', description: 'Exit the application', execute: vi.fn() },
      model: { name: 'model', description: 'Switch AI models', execute: vi.fn() },
      project: { name: 'project', description: 'Manage projects', execute: vi.fn() },
    } as any);
  });

  it('should include LLPM name and description', () => {
    const help = generateCLIHelp();
    expect(help).toContain('LLPM');
    expect(help).toContain('AI-powered');
  });

  it('should include usage line', () => {
    const help = generateCLIHelp();
    expect(help).toContain('Usage:');
    expect(help).toContain('llpm');
  });

  it('should list all commands', () => {
    const help = generateCLIHelp();
    expect(help).toContain('/help');
    expect(help).toContain('/quit');
    expect(help).toContain('/model');
    expect(help).toContain('/project');
  });

  it('should include CLI flags', () => {
    const help = generateCLIHelp();
    expect(help).toContain('--help');
    expect(help).toContain('--verbose');
    expect(help).toContain('--profile');
  });

  it('should mention sub-command help', () => {
    const help = generateCLIHelp();
    expect(help).toContain('<command> --help');
  });
});
```

### Step 2: Run tests to verify they fail

Run: `bun run test src/utils/cliHelp.test.ts`
Expected: FAIL — module does not exist.

### Step 3: Implement `generateCLIHelp()` in `src/utils/cliHelp.ts`

```typescript
import { getCommandRegistry } from '../commands/registry';

/**
 * Generate CLI help text for `llpm --help`.
 * Plain text (not markdown) since this prints to stdout before Ink starts.
 */
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
```

### Step 4: Run tests to verify they pass

Run: `bun run test src/utils/cliHelp.test.ts`
Expected: ALL PASS

### Step 5: Commit

```bash
git add src/utils/cliHelp.ts src/utils/cliHelp.test.ts
git commit -m "feat(help): add generateCLIHelp for llpm --help output

- RED: Tests for CLI help text content, commands list, flags
- GREEN: Implemented generateCLIHelp() with plain-text formatting
- Status: all cliHelp tests passing, build successful"
```

### Step 6: Write failing test for CLI `--help` flag handling

We cannot easily test the `index.ts` entry point directly since it starts Ink. Instead, we test the argument detection logic. Add to `src/utils/cliHelp.test.ts`:

```typescript
import { shouldShowCLIHelp, getCommandFromArgs } from './cliHelp';

describe('shouldShowCLIHelp', () => {
  it('should return true for --help', () => {
    expect(shouldShowCLIHelp(['--help'])).toBe(true);
  });

  it('should return true for -h', () => {
    expect(shouldShowCLIHelp(['-h'])).toBe(true);
  });

  it('should return false for no help flag', () => {
    expect(shouldShowCLIHelp(['--verbose'])).toBe(false);
  });

  it('should return false for empty args', () => {
    expect(shouldShowCLIHelp([])).toBe(false);
  });
});

describe('getCommandFromArgs', () => {
  it('should return command name from args', () => {
    expect(getCommandFromArgs(['project', '--help'])).toBe('project');
  });

  it('should return command name ignoring flags', () => {
    expect(getCommandFromArgs(['--verbose', 'model', '--help'])).toBe('model');
  });

  it('should return null when no command found', () => {
    expect(getCommandFromArgs(['--help'])).toBeNull();
  });

  it('should return null for empty args', () => {
    expect(getCommandFromArgs([])).toBeNull();
  });

  it('should skip flag values', () => {
    expect(getCommandFromArgs(['--profile', 'default', 'project', '--help'])).toBe('project');
  });
});
```

### Step 7: Run tests to verify they fail

Run: `bun run test src/utils/cliHelp.test.ts`
Expected: FAIL — functions not exported yet.

### Step 8: Implement helper functions in `src/utils/cliHelp.ts`

Add to the file:

```typescript
/**
 * Check if CLI args include a help flag.
 */
export function shouldShowCLIHelp(args: string[]): boolean {
  return args.includes('--help') || args.includes('-h');
}

/**
 * Extract a command name from CLI args (ignoring flags).
 * Returns null if no command is found.
 * Used for `llpm project --help` → returns 'project'.
 */
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
    // Skip 'setup' as it's handled separately
    if (arg === 'setup') {
      continue;
    }
    return arg;
  }

  return null;
}
```

### Step 9: Run tests to verify they pass

Run: `bun run test src/utils/cliHelp.test.ts`
Expected: ALL PASS

### Step 10: Add `--help` handling to `index.ts`

In `index.ts`, add early in the async IIFE (after arg parsing, before setup check):

```typescript
// Handle --help flag before launching Ink UI
if (shouldShowCLIHelp(args)) {
  const commandName = getCommandFromArgs(args);
  if (commandName) {
    // llpm <command> --help → execute command's help sub-command
    const { executeCommand } = await import('./src/commands/registry');
    const result = await executeCommand(commandName, ['help']);
    console.log(result.content);
  } else {
    // llpm --help → show top-level CLI help
    const { generateCLIHelp } = await import('./src/utils/cliHelp');
    console.log(generateCLIHelp());
  }
  process.exit(0);
}
```

Add the import at the top of `index.ts`:

```typescript
import { shouldShowCLIHelp, getCommandFromArgs } from './src/utils/cliHelp';
```

Note: Use dynamic imports for `executeCommand` and `generateCLIHelp` since they're only needed in this path and `executeCommand` requires registry initialization. Actually, the command registry is statically initialized (not async), so static imports work fine too. Choose whichever is simpler — a static import of `shouldShowCLIHelp` and `getCommandFromArgs` is best since they're always needed for the check.

### Step 11: Run full test suite and verify build

Run: `bun run test`
Run: `bun run build`
Run: `bun run lint`
Expected: ALL PASS, build successful, no lint errors.

### Step 12: Commit

```bash
git add index.ts src/utils/cliHelp.ts src/utils/cliHelp.test.ts
git commit -m "feat(help): add llpm --help and llpm <command> --help CLI flags

- RED: Tests for shouldShowCLIHelp, getCommandFromArgs
- GREEN: Added CLI help flag handling in index.ts entry point
- Status: all tests passing, build successful
- Partially addresses #313"
```

---

## Task 4: Final Verification and Cleanup

**Files:**
- Modify: `PROGRESS.md`

### Step 1: Run full test suite with coverage

Run: `bun run test --coverage`
Verify: Lines 90%+, Functions 90%+, Branches 85%+, Statements 90%+

### Step 2: Run build and lint

Run: `bun run build`
Run: `bun run lint`
Run: `bun run typecheck`
Expected: All clean.

### Step 3: Run quick verification

Start LLPM with `bun run dev` and test:
1. `/help` — verify markdown renders with proper headers, table, formatting
2. `/project --help` — verify it shows project help (same as `/project help`)
3. `/model -h` — verify it shows model help
4. Exit and run `bun run index.ts --help` — verify CLI help prints and exits
5. Run `bun run index.ts project --help` — verify project help prints and exits

### Step 4: Update PROGRESS.md

Document completion of both issues.

### Step 5: Commit

```bash
git add PROGRESS.md
git commit -m "docs: update progress for help system improvements (#311, #313)"
```

---

## Summary

| Task | What | Files Changed |
|------|------|---------------|
| 1 | Reformat `/help` as markdown | `help.ts`, `help.test.ts` |
| 2 | `--help` flag normalization | `registry.ts`, `registry.test.ts` |
| 3 | `llpm --help` CLI flag | `index.ts`, `cliHelp.ts`, `cliHelp.test.ts` |
| 4 | Verification and cleanup | `PROGRESS.md` |

**Version bump:** MINOR (new CLI flag feature) — bump to `1.10.0` in `package.json` after all tasks pass.
