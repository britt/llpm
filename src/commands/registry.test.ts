import '../../test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCommandRegistry, parseCommand, executeCommand } from './registry';
import type { Command } from './types';
import * as systemPrompt from '../utils/systemPrompt';
import * as markdownHighlight from '../utils/markdownHighlight';

describe('commandRegistry', () => {
  let originalRegistry: Record<string, Command | undefined>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Store original registry for restoration
    originalRegistry = { ...getCommandRegistry() };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original registry to prevent test pollution
    const registry = getCommandRegistry();
    Object.keys(originalRegistry).forEach(key => {
      if (originalRegistry[key]) {
        registry[key as keyof typeof registry] = originalRegistry[key];
      }
    });
  });

  describe('getCommandRegistry', () => {
    it('should return a registry with expected commands', () => {
      const registry = getCommandRegistry();

      expect(registry).toBeDefined();
      expect(typeof registry).toBe('object');

      // Verify common commands exist
      expect(registry.help).toBeDefined();
      expect(registry.info).toBeDefined();
      expect(registry.quit).toBeDefined();
      expect(registry.exit).toBeDefined();
      expect(registry.clear).toBeDefined();

      // Verify command structure
      expect(registry.help).toBeDefined();
      if (registry.help) {
        expect(registry.help.name).toBe('help');
        expect(registry.help.description).toBeTruthy();
        expect(typeof registry.help.execute).toBe('function');
      }
    });

    it('should return consistent registry across calls', () => {
      const registry1 = getCommandRegistry();
      const registry2 = getCommandRegistry();

      expect(registry1).toBe(registry2);
    });
  });

  describe('parseCommand', () => {
    it('should parse simple commands correctly', () => {
      const result = parseCommand('/help');

      expect(result.isCommand).toBe(true);
      expect(result.command).toBe('help');
      expect(result.args).toEqual([]);
    });

    it('should parse commands with arguments', () => {
      const result = parseCommand('/debug 5');

      expect(result.isCommand).toBe(true);
      expect(result.command).toBe('debug');
      expect(result.args).toEqual(['5']);
    });

    it('should parse commands with multiple arguments', () => {
      const result = parseCommand('/project add "My Project" https://github.com/user/repo');

      expect(result.isCommand).toBe(true);
      expect(result.command).toBe('project');
      expect(result.args).toEqual(['add', '"My', 'Project"', 'https://github.com/user/repo']);
    });

    it('should handle commands with extra whitespace', () => {
      const result = parseCommand('/  help   arg1   arg2  ');

      expect(result.isCommand).toBe(true);
      expect(result.command).toBe('help');
      expect(result.args).toEqual(['arg1', 'arg2']);
    });

    it('should be case insensitive for command names', () => {
      const result = parseCommand('/HELP');

      expect(result.isCommand).toBe(true);
      expect(result.command).toBe('help');
    });

    it('should not parse non-command inputs', () => {
      const result = parseCommand('regular message');

      expect(result.isCommand).toBe(false);
      expect(result.command).toBeUndefined();
      expect(result.args).toBeUndefined();
    });

    it('should not parse empty slash command', () => {
      const result = parseCommand('/');

      expect(result.isCommand).toBe(false);
    });

    it('should not parse slash with only whitespace', () => {
      const result = parseCommand('/   ');

      expect(result.isCommand).toBe(false);
    });
  });

  describe('executeCommand', () => {
    it('should execute known commands successfully', async () => {
      const result = await executeCommand('help');

      expect(result.success).toBe(true);
      expect(result.content).toBeTruthy();
    }, 10000); // 10 second timeout

    it('should handle unknown commands', async () => {
      const result = await executeCommand('nonexistent');

      expect(result.success).toBe(false);
      expect(result.content).toContain('❌ Unknown command: /nonexistent');
      expect(result.content).toContain('Type /help to see available commands');
    }, 10000); // 10 second timeout

    it('should pass arguments to commands', async () => {
      // Test with debug command that accepts numeric arguments
      const result = await executeCommand('debug', ['1']);

      // Should succeed (even if no logs available)
      expect(result.success).toBe(true);
    }, 10000); // 10 second timeout

    it('should handle command execution errors', async () => {
      // Create a mock command that throws an error
      const registry = getCommandRegistry();
      const originalInfo = registry.info;

      if (!originalInfo) {
        throw new Error('Expected info command to exist');
      }

      try {
        // Mock info command to throw an error
        registry.info = {
          name: 'info',
          description: 'Test mock command',
          execute: () => {
            throw new Error('Test error');
          }
        };

        const result = await executeCommand('info');

        expect(result.success).toBe(false);
        expect(result.content).toContain('❌ Error executing command /info');
        expect(result.content).toContain('Test error');
      } finally {
        // Always restore original command, even if test fails
        registry.info = originalInfo;
      }
    }, 10000); // 10 second timeout

    it('should handle commands that throw non-Error objects', async () => {
      const registry = getCommandRegistry();
      const originalHelp = registry.help;

      if (!originalHelp) {
        throw new Error('Expected help command to exist');
      }

      try {
        // Mock help command to throw a string
        registry.help = {
          name: 'help',
          description: 'Test mock command',
          execute: () => {
            throw 'String error';
          }
        };

        const result = await executeCommand('help');

        expect(result.success).toBe(false);
        expect(result.content).toContain('❌ Error executing command /help');
        expect(result.content).toContain('Unknown error');
      } finally {
        // Always restore original command, even if test fails
        registry.help = originalHelp;
      }
    }, 10000); // 10 second timeout

    it('should handle async commands', async () => {
      // Test with clear command which is async
      const result = await executeCommand('clear');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.content).toBe('string');
    }, 10000); // 10 second timeout

    it('should default to empty args array when none provided', async () => {
      const result = await executeCommand('help');

      expect(result.success).toBe(true);
      expect(result.content).toBeTruthy();
    }, 10000); // 10 second timeout

    describe('info prompt integration', () => {
      it('should execute /info prompt command successfully', async () => {
        const mockPrompt = 'Integration test system prompt content';
        const mockHighlighted = 'Highlighted integration test system prompt content';

        vi.spyOn(systemPrompt, 'getSystemPrompt').mockResolvedValue(mockPrompt);
        vi.spyOn(markdownHighlight, 'highlightMarkdown').mockReturnValue(mockHighlighted);

        const parseResult = parseCommand('/info prompt');
        expect(parseResult.isCommand).toBe(true);
        expect(parseResult.command).toBe('info');
        expect(parseResult.args).toEqual(['prompt']);

        const executeResult = await executeCommand('info', ['prompt']);

        expect(executeResult.success).toBe(true);
        expect(executeResult.content).toContain('📋 Current System Prompt:');
        expect(executeResult.content).toContain(mockHighlighted);
      }, 10000); // 10 second timeout

      it('should handle /info prompt parsing and execution with case insensitive sub-command', async () => {
        const mockPrompt = 'Test prompt for case insensitive test';
        const mockHighlighted = 'Highlighted test prompt for case insensitive test';

        vi.spyOn(systemPrompt, 'getSystemPrompt').mockResolvedValue(mockPrompt);
        vi.spyOn(markdownHighlight, 'highlightMarkdown').mockReturnValue(mockHighlighted);

        const parseResult = parseCommand('/info PROMPT');
        const executeResult = await executeCommand(parseResult.command as string, parseResult.args);

        expect(executeResult.success).toBe(true);
        expect(executeResult.content).toContain(mockHighlighted);
      }, 10000); // 10 second timeout

      it('should handle /info prompt errors through full command pipeline', async () => {
        vi.spyOn(systemPrompt, 'getSystemPrompt').mockRejectedValue(
          new Error('Integration test error')
        );

        const parseResult = parseCommand('/info prompt');
        const executeResult = await executeCommand(parseResult.command as string, parseResult.args);

        expect(executeResult.success).toBe(false);
        expect(executeResult.content).toContain('❌ Error retrieving system prompt:');
        expect(executeResult.content).toContain('Integration test error');
      }, 10000); // 10 second timeout

      it('should handle /info with unknown sub-command through full pipeline', async () => {
        const parseResult = parseCommand('/info unknown');
        const executeResult = await executeCommand(parseResult.command as string, parseResult.args);

        expect(executeResult.success).toBe(false);
        expect(executeResult.content).toContain('❌ Unknown sub-command: unknown');
        expect(executeResult.content).toContain('Available sub-commands: prompt');
      }, 10000); // 10 second timeout

      it('should still execute regular /info command when no args provided', async () => {
        const parseResult = parseCommand('/info');
        const executeResult = await executeCommand(parseResult.command as string, parseResult.args);

        expect(executeResult.success).toBe(true);
        expect(executeResult.content).toContain('📱 LLPM v0.14.0');
        expect(executeResult.content).not.toContain('📋 Current System Prompt:');
      }, 10000); // 10 second timeout
    });
  });
});
