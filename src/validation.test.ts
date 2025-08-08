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

  it('should exit with error when OPENAI_API_KEY is not set', () => {
    delete process.env.OPENAI_API_KEY;
    
    validateEnvironment();
    
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error: OPENAI_API_KEY environment variable is required');
  });

  it('should exit with error when OPENAI_API_KEY is empty string', () => {
    process.env.OPENAI_API_KEY = '';
    
    validateEnvironment();
    
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error: OPENAI_API_KEY environment variable is required');
  });

  it('should print helpful setup instructions when API key is missing', () => {
    delete process.env.OPENAI_API_KEY;
    
    validateEnvironment();
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('Please set your OpenAI API key:');
    expect(consoleErrorSpy).toHaveBeenCalledWith('1. Copy .env.example to .env: cp .env.example .env');
    expect(consoleErrorSpy).toHaveBeenCalledWith('2. Edit .env and add your API key: OPENAI_API_KEY=your-key-here');
    expect(consoleErrorSpy).toHaveBeenCalledWith('3. Get your API key from: https://platform.openai.com/api-keys');
  });

  it('should not exit when OPENAI_API_KEY is properly set', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key-123';
    
    validateEnvironment();
    
    expect(exitSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});