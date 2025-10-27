import * as z from 'zod';
import { describe, it, expect } from 'vitest';
import { readWebPageTool, summarizeWebPageTool } from './webContentTools';

// Mock URLs for testing
const MOCK_HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
    <meta name="description" content="This is a test page for web content extraction">
</head>
<body>
    <h1>Main Heading</h1>
    <p>This is the first paragraph with some important content.</p>
    <p>This is the second paragraph with more details about the topic.</p>
    <script>console.log('this should be removed');</script>
    <style>body { color: red; }</style>
</body>
</html>
`;

const MOCK_TEXT_CONTENT = `This is plain text content.
It has multiple lines.
And should be handled properly.`;

// Mock fetch for testing
global.fetch = (async (url: string | URL): Promise<Response> => {
  const urlString = url.toString();

  if (urlString.includes('html-test')) {
    return new Response(MOCK_HTML_CONTENT, {
      status: 200,
      headers: { 'content-type': 'text/html' }
    });
  }

  if (urlString.includes('text-test')) {
    return new Response(MOCK_TEXT_CONTENT, {
      status: 200,
      headers: { 'content-type': 'text/plain' }
    });
  }

  if (urlString.includes('error-test')) {
    return new Response('Not Found', { status: 404 });
  }

  if (urlString.includes('timeout-test')) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 200));
  }

  return new Response('Default content', {
    status: 200,
    headers: { 'content-type': 'text/html' }
  });
}) as typeof fetch;

describe('WebContentTools', () => {
  describe('readWebPageTool', () => {
    it('should successfully read HTML content', async () => {
      const result = await (readWebPageTool.execute as any)({
        url: 'https://example.com/html-test',
        maxLength: 1000
      });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Test Page');
      expect(result.description).toBe('This is a test page for web content extraction');
      expect(result.content).toContain('Main Heading');
      expect(result.content).toContain('first paragraph');
      expect(result.content).not.toContain('console.log'); // Scripts should be removed
      expect(result.content).not.toContain('color: red'); // Styles should be removed
      expect(result.contentType).toBe('text/html');
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.readingTime).toBeGreaterThan(0);
    });

    it('should successfully read plain text content', async () => {
      const result = await (readWebPageTool.execute as any)({
        url: 'https://example.com/text-test'
      });

      expect(result.success).toBe(true);
      expect(result.content).toContain('plain text content');
      expect(result.content).toContain('multiple lines');
      expect(result.contentType).toBe('text/plain');
      expect(result.title).toBeUndefined();
      expect(result.description).toBeUndefined();
    });

    it('should handle content truncation', async () => {
      const result = await (readWebPageTool.execute as any)({
        url: 'https://example.com/html-test',
        maxLength: 50
      });

      expect(result.success).toBe(true);
      expect(result.content.length).toBeLessThanOrEqual(50 + 25); // Account for truncation message
      expect(result.content).toContain('[Content truncated]');
      expect(result.truncated).toBe(true);
    });

    it('should handle HTTP errors', async () => {
      const result = await (readWebPageTool.execute as any)({
        url: 'https://example.com/error-test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should handle invalid URLs', async () => {
      const result = await (readWebPageTool.execute as any)({
        url: 'not-a-valid-url-with-spaces and special chars!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should normalize URLs by adding protocol', async () => {
      const result = await (readWebPageTool.execute as any)({
        url: 'example.com/html-test'
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://example.com/html-test');
    });

    it('should handle timeout', async () => {
      const result = await (readWebPageTool.execute as any)({
        url: 'https://example.com/timeout-test',
        timeout: 50
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    }, 1000);
  });

  describe('summarizeWebPageTool', () => {
    it('should summarize web page content', async () => {
      const result = await (summarizeWebPageTool.execute as any)({
        url: 'https://example.com/html-test'
      });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Test Page');
      expect(result.keyPoints).toBeDefined();
      expect(result.keyPoints.length).toBeGreaterThan(0);
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.readingTime).toBeGreaterThan(0);
      expect(result.fullContent).toBeDefined();
    });

    it('should find focus areas when specified', async () => {
      const result = await (summarizeWebPageTool.execute as any)({
        url: 'https://example.com/html-test',
        focusAreas: ['paragraph', 'content', 'nonexistent']
      });

      expect(result.success).toBe(true);
      expect(result.focusAreaFindings).toBeDefined();
      expect(result.focusAreaFindings.paragraph).toBeDefined();
      expect(result.focusAreaFindings.content).toBeDefined();
      expect(result.focusAreaFindings.nonexistent).toBeUndefined();
    });

    it('should handle errors from readWebPageTool', async () => {
      const result = await (summarizeWebPageTool.execute as any)({
        url: 'https://example.com/error-test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read web page');
    });
  });

  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all web content tools', () => {
      const tools = [readWebPageTool, summarizeWebPageTool];

      tools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof (tool.inputSchema as unknown as z.ZodTypeAny).parse).toBe('function');
        expect(typeof (tool.inputSchema as unknown as z.ZodTypeAny).safeParse).toBe('function');
      });
    });
  });
});
