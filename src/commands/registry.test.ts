import '../../test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCommandRegistry, parseCommand, executeCommand } from './registry';

describe('commandRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(registry.help!.name).toBe('help');
      expect(registry.help!.description).toBeTruthy();
      expect(typeof registry.help!.execute).toBe('function');
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
    });

    it('should handle unknown commands', async () => {
      const result = await executeCommand('nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.content).toContain('❌ Unknown command: /nonexistent');
      expect(result.content).toContain('Type /help to see available commands');
    });

    it('should pass arguments to commands', async () => {
      // Test with debug command that accepts numeric arguments
      const result = await executeCommand('debug', ['1']);
      
      // Should succeed (even if no logs available)
      expect(result.success).toBe(true);
    });

    it('should handle command execution errors', async () => {
      // Create a mock command that throws an error
      const registry = getCommandRegistry();
      const originalInfo = registry.info!;
      
      // Mock info command to throw an error
      registry.info = {
        name: 'info',
        description: 'Test mock command',
        execute: () => { throw new Error('Test error'); }
      };
      
      const result = await executeCommand('info');
      
      expect(result.success).toBe(false);
      expect(result.content).toContain('❌ Error executing command /info');
      expect(result.content).toContain('Test error');
      
      // Restore original command
      registry.info = originalInfo;
    });

    it('should handle commands that throw non-Error objects', async () => {
      const registry = getCommandRegistry();
      const originalHelp = registry.help!;
      
      // Mock help command to throw a string
      registry.help = {
        name: 'help',
        description: 'Test mock command',
        execute: () => { throw 'String error'; }
      };
      
      const result = await executeCommand('help');
      
      expect(result.success).toBe(false);
      expect(result.content).toContain('❌ Error executing command /help');
      expect(result.content).toContain('Unknown error');
      
      // Restore original command
      registry.help = originalHelp;
    });

    it('should handle async commands', async () => {
      // Test with clear command which is async
      const result = await executeCommand('clear');
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.content).toBe('string');
    });

    it('should default to empty args array when none provided', async () => {
      const result = await executeCommand('help');
      
      expect(result.success).toBe(true);
      expect(result.content).toBeTruthy();
    });
  });
});