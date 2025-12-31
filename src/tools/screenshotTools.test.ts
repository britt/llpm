import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { takeScreenshotTool, checkScreenshotSetupTool } from './screenshotTools';

describe('Screenshot Tools', () => {
  describe('Tool Structure', () => {
    it('should have proper takeScreenshotTool structure', () => {
      expect(takeScreenshotTool.description).toContain('screenshot');
      expect(takeScreenshotTool.inputSchema).toBeDefined();
      expect(takeScreenshotTool.execute).toBeDefined();
    });

    it('should have proper checkScreenshotSetupTool structure', () => {
      expect(checkScreenshotSetupTool.description).toContain('shot-scraper');
      expect(checkScreenshotSetupTool.inputSchema).toBeDefined();
      expect(checkScreenshotSetupTool.execute).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should have inputSchema defined', () => {
      expect(takeScreenshotTool.inputSchema).toBeDefined();
      expect(typeof takeScreenshotTool.inputSchema.parse).toBe('function');
    });

    it('should have a valid Zod schema as inputSchema', () => {
      expect(takeScreenshotTool.inputSchema).toBeDefined();
      expect(typeof takeScreenshotTool.inputSchema.parse).toBe('function');
      expect(typeof takeScreenshotTool.inputSchema.safeParse).toBe('function');

      expect(checkScreenshotSetupTool.inputSchema).toBeDefined();
      expect(typeof checkScreenshotSetupTool.inputSchema.parse).toBe('function');
      expect(typeof checkScreenshotSetupTool.inputSchema.safeParse).toBe('function');
    });

    it('should validate valid parameters', () => {
      const validParams = {
        url: 'https://example.com',
        width: 1920,
        height: 1080,
        filename: 'test'
      };

      // Should not throw
      expect(() => takeScreenshotTool.inputSchema.parse(validParams)).not.toThrow();
    });

    it('should require URL parameter', () => {
      const invalidParams = {
        width: 1920
      };

      // Should throw because URL is required
      expect(() => takeScreenshotTool.inputSchema.parse(invalidParams)).toThrow();
    });

    it('should accept optional selector parameter', () => {
      const params = {
        url: 'https://example.com',
        selector: '.main-content'
      };

      expect(() => takeScreenshotTool.inputSchema.parse(params)).not.toThrow();
    });

    it('should accept optional wait parameter', () => {
      const params = {
        url: 'https://example.com',
        wait: 2000
      };

      expect(() => takeScreenshotTool.inputSchema.parse(params)).not.toThrow();
    });

    it('should accept all parameters together', () => {
      const params = {
        url: 'https://example.com',
        width: 1920,
        height: 1080,
        selector: '.content',
        wait: 3000,
        filename: 'my-screenshot'
      };

      expect(() => takeScreenshotTool.inputSchema.parse(params)).not.toThrow();
    });

    it('should reject invalid width type', () => {
      const params = {
        url: 'https://example.com',
        width: 'not-a-number'
      };

      expect(() => takeScreenshotTool.inputSchema.parse(params)).toThrow();
    });

    it('should reject invalid wait type', () => {
      const params = {
        url: 'https://example.com',
        wait: 'invalid'
      };

      expect(() => takeScreenshotTool.inputSchema.parse(params)).toThrow();
    });
  });

  describe('checkScreenshotSetupTool', () => {
    it('should have empty inputSchema', () => {
      const schema = checkScreenshotSetupTool.inputSchema;
      // Empty object schema should parse empty object
      expect(() => schema.parse({})).not.toThrow();
    });
  });

  describe('Integration - Environment Dependent', () => {
    // These tests depend on the environment
    // They will pass or fail based on whether shot-scraper is installed

    it('should return result with success or helpful error for screenshot', async () => {
      const result = await takeScreenshotTool.execute({
        url: 'https://example.com'
      });

      // Either succeeds or provides helpful error
      expect(result).toHaveProperty('success');
      if (!result.success) {
        expect(result).toHaveProperty('error');
        // Should have either userMessage or error
        expect(result.userMessage || result.error).toBeDefined();
      }
    });

    it('should return result with success or helpful error for setup check', async () => {
      const result = await checkScreenshotSetupTool.execute({});

      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result.version).toBeDefined();
      } else {
        // Should provide installation instructions
        expect(result.userMessage || result.installCommand).toBeDefined();
      }
    });
  });
});
