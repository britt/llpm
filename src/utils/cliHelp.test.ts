import '../../test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCLIHelp, shouldShowCLIHelp, getCommandFromArgs } from './cliHelp';
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
