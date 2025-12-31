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
