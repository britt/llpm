import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnvironment } from '../index';

describe('validateEnvironment', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let exitSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    originalEnv = process.env;
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should exit with error when no AI provider API keys are set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.GOOGLE_VERTEX_PROJECT_ID;

    validateEnvironment();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ Error: At least one AI provider API key is required'
    );
  });

  it('should exit with error when all API keys are empty strings', () => {
    process.env.OPENAI_API_KEY = '';
    process.env.ANTHROPIC_API_KEY = '';
    process.env.GROQ_API_KEY = '';
    process.env.GOOGLE_VERTEX_PROJECT_ID = '';

    validateEnvironment();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ Error: At least one AI provider API key is required'
    );
  });

  it('should print helpful setup instructions when no providers are configured', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.GOOGLE_VERTEX_PROJECT_ID;

    validateEnvironment();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Please configure at least one provider:');
    expect(consoleErrorSpy).toHaveBeenCalledWith('OpenAI:');
    expect(consoleErrorSpy).toHaveBeenCalledWith('  OPENAI_API_KEY=your-key-here');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '  Get key from: https://platform.openai.com/api-keys'
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith('Anthropic:');
    expect(consoleErrorSpy).toHaveBeenCalledWith('  ANTHROPIC_API_KEY=your-key-here');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '1. Copy .env.example to .env: cp .env.example .env'
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith('2. Edit .env and add your API key(s)');
  });

  it('should not exit when OPENAI_API_KEY is properly set', () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.GOOGLE_VERTEX_PROJECT_ID;
    process.env.OPENAI_API_KEY = 'sk-test-key-123';

    validateEnvironment();

    expect(exitSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should not exit when ANTHROPIC_API_KEY is properly set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.GOOGLE_VERTEX_PROJECT_ID;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-123';

    validateEnvironment();

    expect(exitSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should not exit when GROQ_API_KEY is properly set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_VERTEX_PROJECT_ID;
    process.env.GROQ_API_KEY = 'groq-test-key-123';

    validateEnvironment();

    expect(exitSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should not exit when GOOGLE_VERTEX_PROJECT_ID is properly set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GROQ_API_KEY;
    process.env.GOOGLE_VERTEX_PROJECT_ID = 'test-project-123';

    validateEnvironment();

    expect(exitSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should not exit when multiple providers are configured', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key-123';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-123';

    validateEnvironment();

    expect(exitSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
