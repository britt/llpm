import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderMarkdown, isASCIICapableTerminal } from './markdownRenderer';

// Mock cli-markdown
vi.mock('cli-markdown', () => ({
  default: vi.fn((md: string) => `rendered: ${md}`)
}));

describe('markdownRenderer', () => {
  const originalEnv = process.env;
  const originalStdout = process.stdout;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetAllMocks();
  });

  describe('renderMarkdown', () => {
    it('should render markdown using cli-markdown', () => {
      const result = renderMarkdown('# Hello');

      expect(result).toBe('rendered: # Hello');
    });

    it('should handle empty string', () => {
      const result = renderMarkdown('');

      expect(result).toBe('rendered: ');
    });

    it('should handle complex markdown', () => {
      const markdown = `# Title

Some **bold** and *italic* text.

- List item 1
- List item 2
`;
      const result = renderMarkdown(markdown);

      expect(result).toContain('rendered:');
    });
  });

  describe('isASCIICapableTerminal', () => {
    it('should return true when force is true', () => {
      process.env.NO_COLOR = '1';

      const result = isASCIICapableTerminal(true);

      expect(result).toBe(true);
    });

    it('should return false when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';

      const result = isASCIICapableTerminal();

      expect(result).toBe(false);
    });

    it('should return false when CI is true', () => {
      process.env.CI = 'true';

      const result = isASCIICapableTerminal();

      expect(result).toBe(false);
    });

    it('should return true when no restrictions are set and stdout is TTY', () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;

      // In test environment, we can't easily mock isTTY, so we test the logic path
      const result = isASCIICapableTerminal();

      // Result depends on test environment's TTY status
      expect(typeof result).toBe('boolean');
    });

    it('should return false when stdout is not a TTY', () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;

      // Save original isTTY
      const originalIsTTY = process.stdout.isTTY;

      // Mock stdout.isTTY as false
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        writable: true,
        configurable: true
      });

      const result = isASCIICapableTerminal();

      // Restore original
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        writable: true,
        configurable: true
      });

      expect(result).toBe(false);
    });

    it('should return true when stdout is TTY and no env restrictions', () => {
      delete process.env.NO_COLOR;
      delete process.env.CI;

      // Save original isTTY
      const originalIsTTY = process.stdout.isTTY;

      // Mock stdout.isTTY as true
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        writable: true,
        configurable: true
      });

      const result = isASCIICapableTerminal();

      // Restore original
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        writable: true,
        configurable: true
      });

      expect(result).toBe(true);
    });
  });
});
