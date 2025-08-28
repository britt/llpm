import '../../test/setup';
import { describe, it, expect } from 'vitest';
import { 
  getDefaultSystemPrompt
} from './systemPrompt';

describe('systemPrompt', () => {
  describe('getDefaultSystemPrompt', () => {
    it('should return the default system prompt', () => {
      const defaultPrompt = getDefaultSystemPrompt();
      
      expect(defaultPrompt).toBeTruthy();
      expect(typeof defaultPrompt).toBe('string');
      expect(defaultPrompt).toContain('LLPM');
      expect(defaultPrompt).toContain('Large Language Model Product Manager');
    });

    it('should return a consistent default prompt', () => {
      const prompt1 = getDefaultSystemPrompt();
      const prompt2 = getDefaultSystemPrompt();
      
      expect(prompt1).toBe(prompt2);
    });

    it('should include key functionality descriptions', () => {
      const defaultPrompt = getDefaultSystemPrompt();
      
      expect(defaultPrompt).toContain('project');
      expect(defaultPrompt).toContain('GitHub');
      expect(defaultPrompt).toContain('tools');
    });
  });

  // Note: File-based operations (getSystemPrompt, saveSystemPrompt, etc.) 
  // are tested through integration tests and manual testing since they
  // require filesystem access that's difficult to mock reliably across
  // different test environments.
});