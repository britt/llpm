import '../../test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import * as systemPrompt from './systemPrompt';
import { 
  getSystemPrompt, 
  saveSystemPrompt, 
  getDefaultSystemPrompt, 
  ensureDefaultSystemPromptFile,
} from './systemPrompt';
import * as config from './config';

describe('systemPrompt', () => {
  let mockConfigDir: string;
  let promptPath: string;
  let getConfigDirSpy: any;
  let ensureConfigDirSpy: any;
  let getSystemPromptPathSpy: any;

  beforeEach(() => {
    // Setup DOM environment
    if (typeof (global as any).document === 'undefined') {
      const { Window } = require('happy-dom');
      const window = new Window({ url: 'http://localhost' });
      (global as any).window = window;
      (global as any).document = window.document;
      (global as any).navigator = window.navigator;
      (global as any).HTMLElement = window.HTMLElement;
    }

    // Mock config directory to use temp location
    mockConfigDir = join(tmpdir(), 'llpm-test-config-' + Date.now());
    promptPath = join(mockConfigDir, 'system_prompt.txt');
    
    getConfigDirSpy = vi.spyOn(config, 'getConfigDir').mockReturnValue(mockConfigDir);
    getSystemPromptPathSpy = vi.spyOn(systemPrompt, 'getSystemPromptPath').mockReturnValue(promptPath);
    ensureConfigDirSpy = vi.spyOn(config, 'ensureConfigDir').mockImplementation(async () => {
      if (!existsSync(mockConfigDir)) {
        mkdirSync(mockConfigDir, { recursive: true });
      }
    });

    // Clean up any existing test files
    if (existsSync(promptPath)) {
      unlinkSync(promptPath);
    }
  });

  afterEach(() => {
    getConfigDirSpy.mockRestore();
    ensureConfigDirSpy.mockRestore();
    getSystemPromptPathSpy.mockRestore();
    
    // Clean up test files
    if (existsSync(promptPath)) {
      unlinkSync(promptPath);
    }
  });

  describe('getDefaultSystemPrompt', () => {
    it('should return the default system prompt', () => {
      const defaultPrompt = getDefaultSystemPrompt();
      
      expect(defaultPrompt).toBeTruthy();
      expect(typeof defaultPrompt).toBe('string');
      expect(defaultPrompt).toContain('LLPM');
      expect(defaultPrompt).toContain('Large Language Model Product Manager');
    });
  });

  describe('getSystemPrompt', () => {
    it('should return default prompt when config file does not exist', async () => {
      const prompt = await getSystemPrompt();
      
      expect(prompt).toBe(getDefaultSystemPrompt());
      expect(ensureConfigDirSpy).toHaveBeenCalled();
    });

    it('should return custom prompt when config file exists', async () => {
      const customPrompt = 'This is a custom system prompt for testing';
      
      // Ensure directory exists
      if (!existsSync(mockConfigDir)) {
        mkdirSync(mockConfigDir, { recursive: true });
      }
      
      // Create custom prompt file
      await writeFile(promptPath, customPrompt, 'utf-8');
      
      const prompt = await getSystemPrompt();
      
      expect(prompt).toBe(customPrompt);
      expect(ensureConfigDirSpy).toHaveBeenCalled();
    });

    it('should trim whitespace from custom prompt', async () => {
      const customPrompt = '  \n  Custom prompt with whitespace  \n  ';
      
      // Ensure directory exists
      if (!existsSync(mockConfigDir)) {
        mkdirSync(mockConfigDir, { recursive: true });
      }
      
      await writeFile(promptPath, customPrompt, 'utf-8');
      
      const prompt = await getSystemPrompt();
      
      expect(prompt).toBe('Custom prompt with whitespace');
    });

    it('should fall back to default prompt on read error', async () => {
      // Mock readFile to throw an error by creating an invalid path
      getConfigDirSpy.mockReturnValue('/invalid/path/that/does/not/exist');
      
      const prompt = await getSystemPrompt();
      
      expect(prompt).toBe(getDefaultSystemPrompt());
    });
  });

  describe('saveSystemPrompt', () => {
    it('should save custom prompt to config file', async () => {
      const customPrompt = 'My custom system prompt';
      
      await saveSystemPrompt(customPrompt);
      
      expect(existsSync(promptPath)).toBe(true);
      
      const savedContent = await readFile(promptPath, 'utf-8');
      expect(savedContent).toBe(customPrompt);
      expect(ensureConfigDirSpy).toHaveBeenCalled();
    });

    it('should trim whitespace when saving', async () => {
      const customPrompt = '  \n  Custom prompt with whitespace  \n  ';
      
      await saveSystemPrompt(customPrompt);
      
      const savedContent = await readFile(promptPath, 'utf-8');
      expect(savedContent).toBe('Custom prompt with whitespace');
    });

    it('should overwrite existing custom prompt', async () => {
      const firstPrompt = 'First prompt';
      const secondPrompt = 'Second prompt';
      
      await saveSystemPrompt(firstPrompt);
      await saveSystemPrompt(secondPrompt);
      
      const savedContent = await readFile(promptPath, 'utf-8');
      expect(savedContent).toBe(secondPrompt);
    });

    it('should throw error when write fails', async () => {
      // Mock ensureConfigDir to succeed but simulate write failure
      getSystemPromptPathSpy.mockReturnValue('/read-only/path.txt');
      
      await expect(saveSystemPrompt('test')).rejects.toThrow();
    });
  });

  describe('ensureDefaultSystemPromptFile', () => {
    it('should create system prompt file when it does not exist', async () => {
      expect(existsSync(promptPath)).toBe(false);
      
      await ensureDefaultSystemPromptFile();
      
      expect(existsSync(promptPath)).toBe(true);
      expect(ensureConfigDirSpy).toHaveBeenCalled();
      
      const fileContent = await readFile(promptPath, 'utf-8');
      expect(fileContent).toBe(getDefaultSystemPrompt());
    });

    it('should not overwrite existing system prompt file', async () => {
      const existingPrompt = 'Existing custom prompt';
      
      // Ensure directory exists
      if (!existsSync(mockConfigDir)) {
        mkdirSync(mockConfigDir, { recursive: true });
      }
      
      // Create existing file
      await writeFile(promptPath, existingPrompt, 'utf-8');
      expect(existsSync(promptPath)).toBe(true);
      
      await ensureDefaultSystemPromptFile();
      
      // File should still exist with original content
      expect(existsSync(promptPath)).toBe(true);
      
      const fileContent = await readFile(promptPath, 'utf-8');
      expect(fileContent).toBe(existingPrompt);
      expect(fileContent).not.toBe(getDefaultSystemPrompt());
    });

    it('should be idempotent - multiple calls should not cause issues', async () => {
      expect(existsSync(promptPath)).toBe(false);
      
      // Call multiple times
      await ensureDefaultSystemPromptFile();
      await ensureDefaultSystemPromptFile();
      await ensureDefaultSystemPromptFile();
      
      expect(existsSync(promptPath)).toBe(true);
      
      const fileContent = await readFile(promptPath, 'utf-8');
      expect(fileContent).toBe(getDefaultSystemPrompt());
    });

    it('should throw error when config directory creation fails', async () => {
      ensureConfigDirSpy.mockRejectedValueOnce(new Error('Cannot create config directory'));
      
      await expect(ensureDefaultSystemPromptFile()).rejects.toThrow('Cannot create config directory');
    });

    it('should throw error when file write fails', async () => {
      // Mock config dir to invalid location after ensureConfigDir succeeds
      ensureConfigDirSpy.mockResolvedValueOnce(undefined);
      getSystemPromptPathSpy.mockReturnValue('/read-only/invalid/path');
      
      await expect(ensureDefaultSystemPromptFile()).rejects.toThrow();
    });
  });

  describe('integration', () => {
    it('should create file and then load it correctly', async () => {
      // Ensure file doesn't exist
      expect(existsSync(promptPath)).toBe(false);
      
      // Create default file
      await ensureDefaultSystemPromptFile();
      
      // Load prompt (should return default content)
      const loadedPrompt = await getSystemPrompt();
      expect(loadedPrompt).toBe(getDefaultSystemPrompt());
      
      // Save custom prompt
      const customPrompt = 'Integration test custom prompt';
      await saveSystemPrompt(customPrompt);
      
      // Load again (should return custom content)
      const customLoadedPrompt = await getSystemPrompt();
      expect(customLoadedPrompt).toBe(customPrompt);
    });
  });
});