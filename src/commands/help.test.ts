import '../../test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { helpCommand } from './help';
import * as registry from './registry';

describe('helpCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the registry
    vi.spyOn(registry, 'getCommandRegistry').mockReturnValue({
      help: { name: 'help', description: 'Show available commands', execute: vi.fn() },
      quit: { name: 'quit', description: 'Exit the application', execute: vi.fn() },
      model: { name: 'model', description: 'Switch AI models', execute: vi.fn() }
    } as any);
  });

  it('should have correct name and description', () => {
    expect(helpCommand.name).toBe('help');
    expect(helpCommand.description).toBe('Show available commands');
  });

  it('should list available commands', () => {
    const result = helpCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toContain('Available Commands');
    expect(result.content).toContain('/help');
    expect(result.content).toContain('/quit');
    expect(result.content).toContain('/model');
  });

  it('should show keyboard shortcuts', () => {
    const result = helpCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toContain('Keyboard Shortcuts');
    expect(result.content).toContain('Ctrl+A');
    expect(result.content).toContain('Ctrl+C');
  });

  it('should show help when help argument is passed', () => {
    const result = helpCommand.execute(['help']);

    expect(result.success).toBe(true);
    expect(result.content).toContain('Help Command');
    expect(result.content).toContain('/help');
    expect(result.content).toContain('available commands');
  });

  it('should be case insensitive for help argument', () => {
    const result = helpCommand.execute(['HELP']);

    expect(result.success).toBe(true);
    expect(result.content).toContain('Help Command');
  });

  it('should mention sub-commands', () => {
    const result = helpCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toContain('/project help');
    expect(result.content).toContain('/model help');
  });
});
