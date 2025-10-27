import { describe, it, expect } from 'vitest';
import * as z from 'zod';
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
      expect(typeof (takeScreenshotTool.inputSchema as unknown as z.ZodTypeAny).parse).toBe('function');
    });

    it('should have a valid Zod schema as inputSchema', () => {
      expect(takeScreenshotTool.inputSchema).toBeDefined();
      expect(typeof (takeScreenshotTool.inputSchema as unknown as z.ZodTypeAny).parse).toBe('function');
      expect(typeof (takeScreenshotTool.inputSchema as unknown as z.ZodTypeAny).safeParse).toBe('function');

      expect(checkScreenshotSetupTool.inputSchema).toBeDefined();
      expect(typeof (checkScreenshotSetupTool.inputSchema as unknown as z.ZodTypeAny).parse).toBe('function');
      expect(typeof (checkScreenshotSetupTool.inputSchema as unknown as z.ZodTypeAny).safeParse).toBe('function');
    });

    it('should validate valid parameters', () => {
      const validParams = {
        url: 'https://example.com',
        width: 1920,
        height: 1080,
        filename: 'test'
      };

      // Should not throw
      expect(() => (takeScreenshotTool.inputSchema as unknown as z.ZodTypeAny).parse(validParams)).not.toThrow();
    });

    it('should require URL parameter', () => {
      const invalidParams = {
        width: 1920
      };

      // Should throw because URL is required
      expect(() => (takeScreenshotTool.inputSchema as unknown as z.ZodTypeAny).parse(invalidParams)).toThrow();
    });
  });

  describe('Integration Requirements', () => {
    it('should require shot-scraper for screenshots', async () => {
      // This is an integration test - it will fail if shot-scraper is not installed
      // but that's expected behavior
      const result = await (takeScreenshotTool.execute as any)({
        url: 'https://example.com'
      });

      // Either succeeds with shot-scraper installed, or fails with helpful error
      if (result.success) {
        expect(result.path).toBeDefined();
        expect(result.filename).toBeDefined();
      } else {
        // Should contain either 'shot-scraper' or 'uv' (depending on environment)
        expect(result.error).toMatch(/shot-scraper|uv/);
      }
    });

    it('should check shot-scraper availability', async () => {
      const result = await (checkScreenshotSetupTool.execute as any)({});

      // Either succeeds or provides installation instructions
      if (result.success) {
        expect(result.version).toBeDefined();
        expect(result.message).toContain('ready to use');
      } else {
        // In CI without uv, may not have installInstructions but should have userMessage
        expect(result.installInstructions || result.userMessage).toBeDefined();
        if (result.installCommand) {
          // CI environments may return different installation commands (uv vs pip)
          expect(
            result.installCommand.includes('pip install shot-scraper') ||
              result.installCommand.includes('uv/install.sh')
          ).toBe(true);
        }
      }
    });
  });
});
