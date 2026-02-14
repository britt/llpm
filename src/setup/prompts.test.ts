import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as readline from 'node:readline';

// Mock readline before importing module
vi.mock('node:readline', () => {
  const mockRl = {
    question: vi.fn(),
    close: vi.fn(),
    on: vi.fn().mockReturnThis(),
  };
  return {
    createInterface: vi.fn(() => mockRl),
    default: { createInterface: vi.fn(() => mockRl) },
  };
});

// Import after mocking
import { askQuestion, askYesNo, askChoice, askSecret, createReadlineInterface, closeReadlineInterface } from './prompts';

function getMockRl() {
  return (readline.createInterface as any)() as {
    question: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  };
}

describe('prompts', () => {
  let mockRl: ReturnType<typeof getMockRl>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRl = getMockRl();
  });

  describe('askQuestion', () => {
    it('should prompt user and return trimmed answer', async () => {
      mockRl.question.mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
        cb('  hello world  ');
      });

      const rl = createReadlineInterface();
      const result = await askQuestion(rl, 'Enter something: ');

      expect(result).toBe('hello world');
    });

    it('should return empty string for empty input', async () => {
      mockRl.question.mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
        cb('');
      });

      const rl = createReadlineInterface();
      const result = await askQuestion(rl, 'Enter: ');

      expect(result).toBe('');
    });
  });

  describe('askYesNo', () => {
    it('should return true for "y" input', async () => {
      mockRl.question.mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
        cb('y');
      });

      const rl = createReadlineInterface();
      const result = await askYesNo(rl, 'Continue?');

      expect(result).toBe(true);
    });

    it('should return true for "yes" input (case insensitive)', async () => {
      mockRl.question.mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
        cb('YES');
      });

      const rl = createReadlineInterface();
      const result = await askYesNo(rl, 'Continue?');

      expect(result).toBe(true);
    });

    it('should return false for "n" input', async () => {
      mockRl.question.mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
        cb('n');
      });

      const rl = createReadlineInterface();
      const result = await askYesNo(rl, 'Continue?');

      expect(result).toBe(false);
    });

    it('should return defaultYes=true when input is empty', async () => {
      mockRl.question.mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
        cb('');
      });

      const rl = createReadlineInterface();
      const result = await askYesNo(rl, 'Continue?', true);

      expect(result).toBe(true);
    });

    it('should return defaultYes=false when input is empty and default is false', async () => {
      mockRl.question.mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
        cb('');
      });

      const rl = createReadlineInterface();
      const result = await askYesNo(rl, 'Continue?', false);

      expect(result).toBe(false);
    });
  });

  describe('askChoice', () => {
    it('should return selected choice by number', async () => {
      mockRl.question.mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
        cb('2');
      });

      const rl = createReadlineInterface();
      const result = await askChoice(rl, 'Pick one:', ['OpenAI', 'Anthropic', 'Groq']);

      expect(result).toBe('Anthropic');
    });

    it('should reject invalid number and re-prompt', async () => {
      mockRl.question
        .mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
          cb('99');
        })
        .mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
          cb('1');
        });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const rl = createReadlineInterface();
      const result = await askChoice(rl, 'Pick one:', ['OpenAI', 'Anthropic']);

      expect(result).toBe('OpenAI');
      consoleSpy.mockRestore();
    });

    it('should reject non-numeric input and re-prompt', async () => {
      mockRl.question
        .mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
          cb('abc');
        })
        .mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
          cb('1');
        });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const rl = createReadlineInterface();
      const result = await askChoice(rl, 'Pick one:', ['OpenAI']);

      expect(result).toBe('OpenAI');
      consoleSpy.mockRestore();
    });
  });

  describe('askSecret', () => {
    it('should return trimmed secret value', async () => {
      mockRl.question.mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
        cb('sk-abc123  ');
      });

      const rl = createReadlineInterface();
      const result = await askSecret(rl, 'API Key: ');

      expect(result).toBe('sk-abc123');
    });

    it('should return empty string for empty input', async () => {
      mockRl.question.mockImplementationOnce((_prompt: string, cb: (answer: string) => void) => {
        cb('');
      });

      const rl = createReadlineInterface();
      const result = await askSecret(rl, 'API Key: ');

      expect(result).toBe('');
    });
  });

  describe('closeReadlineInterface', () => {
    it('should call close on the readline interface', () => {
      const rl = createReadlineInterface();
      closeReadlineInterface(rl);

      expect(mockRl.close).toHaveBeenCalled();
    });
  });
});
