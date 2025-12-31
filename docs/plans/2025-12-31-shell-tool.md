# Shell Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a first-class shell tool to LLPM that executes shell commands in a controlled, auditable way with structured output.

**Architecture:** Create a new `shellTools.ts` module with `run_shell_command` and `stream_shell_command` tools. Commands execute via Bun's shell API (`Bun.$`) with configurable timeouts, working directory constraints, and audit logging. Permission is controlled via project-level config that must explicitly enable shell execution.

**Tech Stack:** Bun shell API (`Bun.$`), Zod schemas, existing tool instrumentation, project config system.

---

## Phase 1: Core Shell Tool (This Plan)

### Task 1: Create Shell Config Types

**Files:**
- Create: `src/types/shell.ts`
- Test: `src/types/shell.test.ts`

**Step 1: Write the failing test**

```typescript
// src/types/shell.test.ts
import { describe, it, expect } from 'vitest';
import type { ShellConfig, ShellResult, ShellAuditEntry } from './shell';

describe('shell types', () => {
  it('should define ShellConfig with correct shape', () => {
    const config: ShellConfig = {
      enabled: false,
      allowedCommands: ['git', 'npm', 'bun'],
      deniedCommands: ['rm -rf', 'sudo'],
      defaultTimeout: 30000,
      maxTimeout: 300000,
      allowedPaths: ['/project'],
      auditEnabled: true
    };

    expect(config.enabled).toBe(false);
    expect(config.allowedCommands).toContain('git');
    expect(config.defaultTimeout).toBe(30000);
  });

  it('should define ShellResult with correct shape', () => {
    const result: ShellResult = {
      success: true,
      stdout: 'output',
      stderr: '',
      exitCode: 0,
      command: 'ls -la',
      cwd: '/project',
      durationMs: 150
    };

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('should define ShellAuditEntry with correct shape', () => {
    const entry: ShellAuditEntry = {
      timestamp: new Date().toISOString(),
      command: 'git status',
      cwd: '/project',
      exitCode: 0,
      durationMs: 100,
      userId: 'user-123',
      projectId: 'project-456'
    };

    expect(entry.command).toBe('git status');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- --run src/types/shell.test.ts`
Expected: FAIL with "Cannot find module './shell'"

**Step 3: Write minimal implementation**

```typescript
// src/types/shell.ts
/**
 * Configuration for shell tool execution
 */
export interface ShellConfig {
  /** Whether shell execution is enabled for this project */
  enabled: boolean;
  /** Commands or prefixes that are allowed (empty = all allowed) */
  allowedCommands?: string[];
  /** Commands or prefixes that are explicitly denied */
  deniedCommands?: string[];
  /** Default timeout in milliseconds (default: 30000) */
  defaultTimeout: number;
  /** Maximum allowed timeout in milliseconds (default: 300000) */
  maxTimeout: number;
  /** Paths where commands can be executed (empty = project path only) */
  allowedPaths?: string[];
  /** Whether to log all command executions for audit */
  auditEnabled: boolean;
}

/**
 * Result from a shell command execution
 */
export interface ShellResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  cwd: string;
  durationMs: number;
  timedOut?: boolean;
  error?: string;
}

/**
 * Audit log entry for shell command execution
 */
export interface ShellAuditEntry {
  timestamp: string;
  command: string;
  cwd: string;
  exitCode: number;
  durationMs: number;
  userId?: string;
  projectId?: string;
  timedOut?: boolean;
  error?: string;
}

/**
 * Default shell configuration (shell disabled by default)
 */
export const DEFAULT_SHELL_CONFIG: ShellConfig = {
  enabled: false,
  allowedCommands: [],
  deniedCommands: ['rm -rf /', 'sudo', 'su ', ':(){ :|:& };:'],
  defaultTimeout: 30000,
  maxTimeout: 300000,
  allowedPaths: [],
  auditEnabled: true
};
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- --run src/types/shell.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/shell.ts src/types/shell.test.ts
git commit -m "feat(shell): add shell config and result types"
```

---

### Task 2: Create Shell Permission Validator

**Files:**
- Create: `src/utils/shellPermissions.ts`
- Test: `src/utils/shellPermissions.test.ts`

**Step 1: Write the failing test**

```typescript
// src/utils/shellPermissions.test.ts
import '../../test/setup';
import { describe, it, expect } from 'vitest';
import {
  isShellEnabled,
  isCommandAllowed,
  isPathAllowed,
  validateShellExecution
} from './shellPermissions';
import type { ShellConfig } from '../types/shell';
import { DEFAULT_SHELL_CONFIG } from '../types/shell';

describe('shellPermissions', () => {
  describe('isShellEnabled', () => {
    it('should return false when shell is disabled', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: false };
      expect(isShellEnabled(config)).toBe(false);
    });

    it('should return true when shell is enabled', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: true };
      expect(isShellEnabled(config)).toBe(true);
    });
  });

  describe('isCommandAllowed', () => {
    it('should allow all commands when allowedCommands is empty', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: true, allowedCommands: [] };
      expect(isCommandAllowed('git status', config)).toBe(true);
      expect(isCommandAllowed('ls -la', config)).toBe(true);
    });

    it('should only allow commands in allowedCommands list', () => {
      const config: ShellConfig = {
        ...DEFAULT_SHELL_CONFIG,
        enabled: true,
        allowedCommands: ['git', 'npm', 'bun']
      };
      expect(isCommandAllowed('git status', config)).toBe(true);
      expect(isCommandAllowed('npm install', config)).toBe(true);
      expect(isCommandAllowed('curl http://example.com', config)).toBe(false);
    });

    it('should deny commands in deniedCommands list', () => {
      const config: ShellConfig = {
        ...DEFAULT_SHELL_CONFIG,
        enabled: true,
        deniedCommands: ['rm -rf', 'sudo']
      };
      expect(isCommandAllowed('rm -rf /', config)).toBe(false);
      expect(isCommandAllowed('sudo apt install', config)).toBe(false);
      expect(isCommandAllowed('rm file.txt', config)).toBe(true);
    });
  });

  describe('isPathAllowed', () => {
    it('should allow project path when allowedPaths is empty', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: true, allowedPaths: [] };
      expect(isPathAllowed('/project/src', '/project', config)).toBe(true);
    });

    it('should deny paths outside project', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: true, allowedPaths: [] };
      expect(isPathAllowed('/etc/passwd', '/project', config)).toBe(false);
    });

    it('should allow explicitly configured paths', () => {
      const config: ShellConfig = {
        ...DEFAULT_SHELL_CONFIG,
        enabled: true,
        allowedPaths: ['/project', '/tmp']
      };
      expect(isPathAllowed('/tmp/build', '/project', config)).toBe(true);
    });
  });

  describe('validateShellExecution', () => {
    it('should return error when shell is disabled', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: false };
      const result = validateShellExecution('git status', '/project', '/project', config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('disabled');
    });

    it('should return error when command is denied', () => {
      const config: ShellConfig = {
        ...DEFAULT_SHELL_CONFIG,
        enabled: true,
        deniedCommands: ['sudo']
      };
      const result = validateShellExecution('sudo rm -rf /', '/project', '/project', config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denied');
    });

    it('should return error when path is not allowed', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: true };
      const result = validateShellExecution('ls', '/etc', '/project', config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('path');
    });

    it('should return allowed when all checks pass', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: true };
      const result = validateShellExecution('git status', '/project', '/project', config);
      expect(result.allowed).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- --run src/utils/shellPermissions.test.ts`
Expected: FAIL with "Cannot find module './shellPermissions'"

**Step 3: Write minimal implementation**

```typescript
// src/utils/shellPermissions.ts
import { resolve, relative } from 'path';
import type { ShellConfig } from '../types/shell';

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if shell execution is enabled in config
 */
export function isShellEnabled(config: ShellConfig): boolean {
  return config.enabled === true;
}

/**
 * Check if a command is allowed based on allowlist/denylist
 */
export function isCommandAllowed(command: string, config: ShellConfig): boolean {
  const commandLower = command.toLowerCase();

  // Check denylist first (always applies)
  if (config.deniedCommands && config.deniedCommands.length > 0) {
    for (const denied of config.deniedCommands) {
      if (commandLower.includes(denied.toLowerCase())) {
        return false;
      }
    }
  }

  // If allowlist is empty, allow all (that aren't denied)
  if (!config.allowedCommands || config.allowedCommands.length === 0) {
    return true;
  }

  // Check if command starts with any allowed prefix
  for (const allowed of config.allowedCommands) {
    if (commandLower.startsWith(allowed.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a path is allowed for command execution
 */
export function isPathAllowed(
  requestedPath: string,
  projectPath: string,
  config: ShellConfig
): boolean {
  const resolvedPath = resolve(requestedPath);
  const resolvedProject = resolve(projectPath);

  // Check if path is within project directory
  const relativePath = relative(resolvedProject, resolvedPath);
  const isWithinProject = !relativePath.startsWith('..') && !relativePath.startsWith('/');

  if (isWithinProject) {
    return true;
  }

  // Check explicitly allowed paths
  if (config.allowedPaths && config.allowedPaths.length > 0) {
    for (const allowedPath of config.allowedPaths) {
      const resolvedAllowed = resolve(allowedPath);
      const relativeToAllowed = relative(resolvedAllowed, resolvedPath);
      if (!relativeToAllowed.startsWith('..') && !relativeToAllowed.startsWith('/')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validate all aspects of a shell execution request
 */
export function validateShellExecution(
  command: string,
  cwd: string,
  projectPath: string,
  config: ShellConfig
): ValidationResult {
  // Check if shell is enabled
  if (!isShellEnabled(config)) {
    return {
      allowed: false,
      reason: 'Shell execution is disabled for this project. Enable it in project settings.'
    };
  }

  // Check command allowlist/denylist
  if (!isCommandAllowed(command, config)) {
    return {
      allowed: false,
      reason: `Command is denied by policy: "${command.substring(0, 50)}..."`
    };
  }

  // Check path permissions
  if (!isPathAllowed(cwd, projectPath, config)) {
    return {
      allowed: false,
      reason: `Execution path "${cwd}" is not within allowed paths.`
    };
  }

  return { allowed: true };
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- --run src/utils/shellPermissions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/shellPermissions.ts src/utils/shellPermissions.test.ts
git commit -m "feat(shell): add shell permission validation"
```

---

### Task 3: Create Shell Executor Service

**Files:**
- Create: `src/services/shellExecutor.ts`
- Test: `src/services/shellExecutor.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/shellExecutor.test.ts
import '../../test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShellExecutor } from './shellExecutor';
import type { ShellConfig } from '../types/shell';
import { DEFAULT_SHELL_CONFIG } from '../types/shell';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('ShellExecutor', () => {
  let executor: ShellExecutor;
  let testDir: string;
  let enabledConfig: ShellConfig;

  beforeEach(() => {
    testDir = join(tmpdir(), 'llpm-shell-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });

    enabledConfig = {
      ...DEFAULT_SHELL_CONFIG,
      enabled: true,
      defaultTimeout: 5000
    };

    executor = new ShellExecutor(enabledConfig, testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('execute', () => {
    it('should execute a simple command and return result', async () => {
      const result = await executor.execute('echo "hello world"');

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe('hello world');
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
      expect(result.command).toBe('echo "hello world"');
    });

    it('should capture stderr', async () => {
      const result = await executor.execute('ls /nonexistent-path-12345');

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toBeTruthy();
    });

    it('should respect timeout', async () => {
      const shortTimeoutConfig = { ...enabledConfig, defaultTimeout: 100 };
      const shortExecutor = new ShellExecutor(shortTimeoutConfig, testDir);

      const result = await shortExecutor.execute('sleep 10');

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
    });

    it('should reject when shell is disabled', async () => {
      const disabledConfig = { ...DEFAULT_SHELL_CONFIG, enabled: false };
      const disabledExecutor = new ShellExecutor(disabledConfig, testDir);

      const result = await disabledExecutor.execute('echo test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should reject denied commands', async () => {
      const result = await executor.execute('sudo rm -rf /');

      expect(result.success).toBe(false);
      expect(result.error).toContain('denied');
    });

    it('should use custom cwd when provided', async () => {
      const result = await executor.execute('pwd', { cwd: testDir });

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe(testDir);
      expect(result.cwd).toBe(testDir);
    });

    it('should track execution duration', async () => {
      const result = await executor.execute('echo test');

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeLessThan(5000);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- --run src/services/shellExecutor.test.ts`
Expected: FAIL with "Cannot find module './shellExecutor'"

**Step 3: Write minimal implementation**

```typescript
// src/services/shellExecutor.ts
import { $ } from 'bun';
import type { ShellConfig, ShellResult } from '../types/shell';
import { validateShellExecution } from '../utils/shellPermissions';
import { debug } from '../utils/logger';

export interface ExecuteOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export class ShellExecutor {
  private config: ShellConfig;
  private projectPath: string;

  constructor(config: ShellConfig, projectPath: string) {
    this.config = config;
    this.projectPath = projectPath;
  }

  async execute(command: string, options: ExecuteOptions = {}): Promise<ShellResult> {
    const cwd = options.cwd || this.projectPath;
    const timeout = Math.min(
      options.timeout || this.config.defaultTimeout,
      this.config.maxTimeout
    );
    const startTime = Date.now();

    // Validate execution is allowed
    const validation = validateShellExecution(command, cwd, this.projectPath, this.config);
    if (!validation.allowed) {
      return {
        success: false,
        stdout: '',
        stderr: '',
        exitCode: -1,
        command,
        cwd,
        durationMs: Date.now() - startTime,
        error: validation.reason
      };
    }

    debug(`Executing shell command: ${command} in ${cwd}`);

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const result = await $`${{ raw: command }}`
          .cwd(cwd)
          .env({ ...process.env, ...options.env })
          .quiet()
          .nothrow();

        clearTimeout(timeoutId);

        const durationMs = Date.now() - startTime;

        return {
          success: result.exitCode === 0,
          stdout: result.stdout.toString(),
          stderr: result.stderr.toString(),
          exitCode: result.exitCode,
          command,
          cwd,
          durationMs
        };
      } catch (error) {
        clearTimeout(timeoutId);

        // Check if it was aborted due to timeout
        if (controller.signal.aborted) {
          return {
            success: false,
            stdout: '',
            stderr: '',
            exitCode: -1,
            command,
            cwd,
            durationMs: Date.now() - startTime,
            timedOut: true,
            error: `Command timed out after ${timeout}ms`
          };
        }

        throw error;
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      debug(`Shell command failed: ${errorMessage}`);

      return {
        success: false,
        stdout: '',
        stderr: errorMessage,
        exitCode: -1,
        command,
        cwd,
        durationMs,
        error: errorMessage
      };
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- --run src/services/shellExecutor.test.ts`
Expected: PASS (some timeout tests may need adjustment)

**Step 5: Commit**

```bash
git add src/services/shellExecutor.ts src/services/shellExecutor.test.ts
git commit -m "feat(shell): add shell executor service"
```

---

### Task 4: Create Shell Audit Logger

**Files:**
- Create: `src/utils/shellAudit.ts`
- Test: `src/utils/shellAudit.test.ts`

**Step 1: Write the failing test**

```typescript
// src/utils/shellAudit.test.ts
import '../../test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShellAuditLogger, getShellAuditLogger } from './shellAudit';
import type { ShellAuditEntry } from '../types/shell';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('ShellAuditLogger', () => {
  let auditDir: string;
  let logger: ShellAuditLogger;

  beforeEach(() => {
    auditDir = join(tmpdir(), 'llpm-audit-test-' + Date.now());
    mkdirSync(auditDir, { recursive: true });
    logger = new ShellAuditLogger(auditDir);
  });

  afterEach(() => {
    if (existsSync(auditDir)) {
      rmSync(auditDir, { recursive: true, force: true });
    }
  });

  describe('log', () => {
    it('should write audit entry to file', async () => {
      const entry: ShellAuditEntry = {
        timestamp: new Date().toISOString(),
        command: 'git status',
        cwd: '/project',
        exitCode: 0,
        durationMs: 100,
        projectId: 'test-project'
      };

      await logger.log(entry);

      const files = existsSync(auditDir) ? require('fs').readdirSync(auditDir) : [];
      expect(files.length).toBeGreaterThan(0);
    });

    it('should format entry as JSON', async () => {
      const entry: ShellAuditEntry = {
        timestamp: '2025-01-01T00:00:00.000Z',
        command: 'echo test',
        cwd: '/project',
        exitCode: 0,
        durationMs: 50
      };

      await logger.log(entry);

      const files = require('fs').readdirSync(auditDir);
      const content = readFileSync(join(auditDir, files[0]), 'utf-8');
      const logged = JSON.parse(content.trim().split('\n').pop()!);

      expect(logged.command).toBe('echo test');
      expect(logged.exitCode).toBe(0);
    });
  });

  describe('getRecentEntries', () => {
    it('should return recent audit entries', async () => {
      const entry1: ShellAuditEntry = {
        timestamp: new Date().toISOString(),
        command: 'cmd1',
        cwd: '/project',
        exitCode: 0,
        durationMs: 100
      };

      const entry2: ShellAuditEntry = {
        timestamp: new Date().toISOString(),
        command: 'cmd2',
        cwd: '/project',
        exitCode: 0,
        durationMs: 200
      };

      await logger.log(entry1);
      await logger.log(entry2);

      const recent = await logger.getRecentEntries(10);
      expect(recent.length).toBe(2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- --run src/utils/shellAudit.test.ts`
Expected: FAIL with "Cannot find module './shellAudit'"

**Step 3: Write minimal implementation**

```typescript
// src/utils/shellAudit.ts
import { appendFile, readFile, readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ShellAuditEntry } from '../types/shell';
import { debug } from './logger';

export class ShellAuditLogger {
  private auditDir: string;

  constructor(auditDir: string) {
    this.auditDir = auditDir;
  }

  private getAuditFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return join(this.auditDir, `shell-audit-${date}.jsonl`);
  }

  async log(entry: ShellAuditEntry): Promise<void> {
    try {
      // Ensure audit directory exists
      if (!existsSync(this.auditDir)) {
        await mkdir(this.auditDir, { recursive: true });
      }

      const filePath = this.getAuditFilePath();
      const line = JSON.stringify(entry) + '\n';

      await appendFile(filePath, line, 'utf-8');
      debug(`Shell audit logged: ${entry.command.substring(0, 50)}`);
    } catch (error) {
      debug('Failed to write shell audit log:', error);
      // Don't throw - audit logging should not block execution
    }
  }

  async getRecentEntries(limit: number = 100): Promise<ShellAuditEntry[]> {
    const entries: ShellAuditEntry[] = [];

    try {
      if (!existsSync(this.auditDir)) {
        return entries;
      }

      const files = await readdir(this.auditDir);
      const auditFiles = files
        .filter(f => f.startsWith('shell-audit-') && f.endsWith('.jsonl'))
        .sort()
        .reverse();

      for (const file of auditFiles) {
        if (entries.length >= limit) break;

        const content = await readFile(join(this.auditDir, file), 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);

        for (const line of lines.reverse()) {
          if (entries.length >= limit) break;
          try {
            entries.push(JSON.parse(line));
          } catch {
            // Skip malformed entries
          }
        }
      }
    } catch (error) {
      debug('Failed to read shell audit logs:', error);
    }

    return entries;
  }
}

// Singleton instance
let globalAuditLogger: ShellAuditLogger | null = null;

export function getShellAuditLogger(auditDir?: string): ShellAuditLogger {
  if (!globalAuditLogger && auditDir) {
    globalAuditLogger = new ShellAuditLogger(auditDir);
  }
  if (!globalAuditLogger) {
    throw new Error('Shell audit logger not initialized');
  }
  return globalAuditLogger;
}

export function initShellAuditLogger(auditDir: string): ShellAuditLogger {
  globalAuditLogger = new ShellAuditLogger(auditDir);
  return globalAuditLogger;
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- --run src/utils/shellAudit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/shellAudit.ts src/utils/shellAudit.test.ts
git commit -m "feat(shell): add shell audit logging"
```

---

### Task 5: Create Shell AI Tool

**Files:**
- Create: `src/tools/shellTools.ts`
- Test: `src/tools/shellTools.test.ts`

**Step 1: Write the failing test**

```typescript
// src/tools/shellTools.test.ts
import '../../test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runShellCommandTool } from './shellTools';
import * as projectConfig from '../utils/projectConfig';
import type { Project } from '../types/project';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('shellTools', () => {
  let testDir: string;
  let mockProject: Project;

  beforeEach(() => {
    testDir = join(tmpdir(), 'llpm-shell-tool-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });

    // Create a shell config file that enables shell
    const configDir = join(testDir, '.llpm');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'shell.json'),
      JSON.stringify({ enabled: true, defaultTimeout: 5000 })
    );

    mockProject = {
      id: 'test-project',
      name: 'Test Project',
      description: 'A test project',
      repository: 'test/repo',
      path: testDir,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(mockProject);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('runShellCommandTool', () => {
    it('should have correct inputSchema', () => {
      expect(runShellCommandTool.inputSchema).toBeDefined();
    });

    it('should execute command and return structured result', async () => {
      const result = await runShellCommandTool.execute({
        command: 'echo "hello"',
        cwd: testDir
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('hello');
      expect(result.exitCode).toBe(0);
    });

    it('should reject when no project is set', async () => {
      vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(null);

      const result = await runShellCommandTool.execute({
        command: 'echo test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('project');
    });

    it('should respect timeout parameter', async () => {
      const result = await runShellCommandTool.execute({
        command: 'sleep 10',
        timeout: 100
      });

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- --run src/tools/shellTools.test.ts`
Expected: FAIL with "Cannot find module './shellTools'"

**Step 3: Write minimal implementation**

```typescript
// src/tools/shellTools.ts
import { tool } from './instrumentedTool';
import * as z from 'zod';
import { getCurrentProject } from '../utils/projectConfig';
import { ShellExecutor } from '../services/shellExecutor';
import { initShellAuditLogger } from '../utils/shellAudit';
import { getConfigDir } from '../utils/config';
import { DEFAULT_SHELL_CONFIG } from '../types/shell';
import type { ShellConfig, ShellResult, ShellAuditEntry } from '../types/shell';
import { debug } from '../utils/logger';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Load shell config for the current project
 */
async function getShellConfig(projectPath: string): Promise<ShellConfig> {
  const configPath = join(projectPath, '.llpm', 'shell.json');

  if (!existsSync(configPath)) {
    return DEFAULT_SHELL_CONFIG;
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    return { ...DEFAULT_SHELL_CONFIG, ...config };
  } catch (error) {
    debug('Failed to load shell config:', error);
    return DEFAULT_SHELL_CONFIG;
  }
}

export const runShellCommandTool = tool({
  description: 'Execute a shell command in the current project directory. Returns structured output with stdout, stderr, and exit code. Shell must be enabled in project settings.',
  inputSchema: z.object({
    command: z.string().describe('The shell command to execute'),
    cwd: z.string().optional().describe('Working directory (defaults to project root)'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000, max: 300000)')
  }),
  execute: async ({ command, cwd, timeout }): Promise<ShellResult> => {
    debug('Shell tool invoked:', command);

    // Get current project
    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        stdout: '',
        stderr: '',
        exitCode: -1,
        command,
        cwd: cwd || '',
        durationMs: 0,
        error: 'No active project. Use /project switch to set a project first.'
      };
    }

    // Load shell config
    const config = await getShellConfig(project.path);

    // Create executor
    const executor = new ShellExecutor(config, project.path);

    // Execute command
    const result = await executor.execute(command, {
      cwd: cwd || project.path,
      timeout
    });

    // Log to audit if enabled
    if (config.auditEnabled) {
      try {
        const auditDir = join(getConfigDir(), 'audit');
        const auditLogger = initShellAuditLogger(auditDir);

        const auditEntry: ShellAuditEntry = {
          timestamp: new Date().toISOString(),
          command,
          cwd: result.cwd,
          exitCode: result.exitCode,
          durationMs: result.durationMs,
          projectId: project.id,
          timedOut: result.timedOut,
          error: result.error
        };

        await auditLogger.log(auditEntry);
      } catch (error) {
        debug('Failed to log shell audit:', error);
      }
    }

    return result;
  }
});
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- --run src/tools/shellTools.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/shellTools.ts src/tools/shellTools.test.ts
git commit -m "feat(shell): add run_shell_command AI tool"
```

---

### Task 6: Register Shell Tool

**Files:**
- Modify: `src/tools/registry.ts`

**Step 1: Write the failing test**

```typescript
// Add to existing registry tests or create new test
// src/tools/registry.test.ts (add this test case)

it('should include shell tools in registry', async () => {
  const registry = await getToolRegistry();
  expect(registry.run_shell_command).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- --run src/tools/registry.test.ts`
Expected: FAIL - run_shell_command not in registry

**Step 3: Modify registry.ts**

Add import at top:
```typescript
import { runShellCommandTool } from './shellTools';
```

Add to toolRegistry object:
```typescript
// Shell execution
run_shell_command: runShellCommandTool,
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- --run src/tools/registry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/registry.ts
git commit -m "feat(shell): register shell tool in tool registry"
```

---

### Task 7: Add Shell Config Documentation

**Files:**
- Create: `docs/shell-tool.md`

**Step 1: Create documentation**

```markdown
# Shell Tool

The shell tool allows LLPM to execute shell commands in project directories.

## Security

**Shell execution is disabled by default.** To enable it, create a config file in your project:

```bash
mkdir -p .llpm
echo '{"enabled": true}' > .llpm/shell.json
```

## Configuration

Create `.llpm/shell.json` in your project root:

```json
{
  "enabled": true,
  "allowedCommands": ["git", "npm", "bun", "yarn"],
  "deniedCommands": ["rm -rf", "sudo"],
  "defaultTimeout": 30000,
  "maxTimeout": 300000,
  "auditEnabled": true
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable shell execution |
| `allowedCommands` | string[] | `[]` | Command prefixes to allow (empty = all) |
| `deniedCommands` | string[] | `[...]` | Commands to always deny |
| `defaultTimeout` | number | `30000` | Default timeout in ms |
| `maxTimeout` | number | `300000` | Maximum allowed timeout |
| `auditEnabled` | boolean | `true` | Log all commands to audit |

## Usage

The AI can use the shell tool like this:

```
User: What's the git status of this project?
AI: I'll check the git status for you.
[uses run_shell_command with "git status"]
```

## Audit Logs

When `auditEnabled` is true, all commands are logged to:
`~/.llpm/audit/shell-audit-YYYY-MM-DD.jsonl`

Each entry contains:
- timestamp
- command executed
- working directory
- exit code
- duration
- project ID
```

**Step 2: Commit**

```bash
git add docs/shell-tool.md
git commit -m "docs: add shell tool documentation"
```

---

### Task 8: Run Full Test Suite and Verify

**Step 1: Run all tests**

```bash
bun run test
```

Expected: All tests pass

**Step 2: Run linting**

```bash
bun run lint
```

Expected: No errors

**Step 3: Run type check**

```bash
bun run typecheck
```

Expected: No errors

**Step 4: Check coverage**

```bash
bun run test --coverage
```

Expected: Coverage meets thresholds (90%+)

**Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address test/lint issues for shell tool"
```

---

## Summary

This plan implements Phase 1 of the shell tool with:

1. **Types** - ShellConfig, ShellResult, ShellAuditEntry
2. **Permission validation** - Command allowlist/denylist, path restrictions
3. **Executor service** - Bun shell execution with timeout support
4. **Audit logging** - JSONL audit trail for all executions
5. **AI tool** - run_shell_command tool for LLM use
6. **Documentation** - Setup and usage guide

**Not included (Phase 2):**
- Streaming output support
- PTY/interactive mode
- Container/sandbox execution

---

**Plan complete and saved to `docs/plans/2025-12-31-shell-tool.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
