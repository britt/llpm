import '../../test/setup';
import { describe, it, expect } from 'vitest';
import { highlightMarkdown, formatAsMarkdownCodeBlock } from './markdownHighlight';

describe('markdownHighlight', () => {
  describe('highlightMarkdown', () => {
    it('should highlight headers', () => {
      const input = '# Header 1\n## Header 2\n### Header 3';
      const result = highlightMarkdown(input);
      
      // Should contain ANSI codes for headers
      expect(result).toContain('\x1b[1m\x1b[36m#\x1b[0m \x1b[1mHeader 1\x1b[0m');
      expect(result).toContain('\x1b[1m\x1b[36m##\x1b[0m \x1b[1mHeader 2\x1b[0m');
      expect(result).toContain('\x1b[1m\x1b[36m###\x1b[0m \x1b[1mHeader 3\x1b[0m');
    });

    it('should highlight bold text', () => {
      const input = '**bold text** and __also bold__';
      const result = highlightMarkdown(input);
      
      expect(result).toContain('\x1b[1mbold text\x1b[0m');
      expect(result).toContain('\x1b[1malso bold\x1b[0m');
    });

    it('should highlight italic text', () => {
      const input = '*italic text* and _also italic_';
      const result = highlightMarkdown(input);
      
      expect(result).toContain('\x1b[3mitalic text\x1b[0m');
      expect(result).toContain('\x1b[3malso italic\x1b[0m');
    });

    it('should highlight code blocks', () => {
      const input = '```javascript\nconsole.log("hello");\n```';
      const result = highlightMarkdown(input);
      
      // The code block should be highlighted with the language and code content
      expect(result).toContain('\x1b[2m\x1b[37m```javascript\x1b[0m');
      expect(result).toContain('\x1b[90mconsole.log("hello");\x1b[0m');
      expect(result).toContain('\x1b[2m\x1b[37m```\x1b[0m');
    });

    it('should highlight inline code', () => {
      const input = 'Use `console.log()` to print';
      const result = highlightMarkdown(input);
      
      expect(result).toContain('\x1b[90m\x1b[47mconsole.log()\x1b[0m');
    });

    it('should highlight lists', () => {
      const input = '- Item 1\n* Item 2\n  - Nested item';
      const result = highlightMarkdown(input);
      
      expect(result).toContain('\x1b[33m-\x1b[0m Item 1');
      expect(result).toContain('\x1b[33m*\x1b[0m Item 2');
      expect(result).toContain('  \x1b[33m-\x1b[0m Nested item');
    });

    it('should highlight numbered lists', () => {
      const input = '1. First item\n2. Second item\n   3. Nested item';
      const result = highlightMarkdown(input);
      
      expect(result).toContain('\x1b[33m1.\x1b[0m First item');
      expect(result).toContain('\x1b[33m2.\x1b[0m Second item');
      expect(result).toContain('   \x1b[33m3.\x1b[0m Nested item');
    });

    it('should highlight links', () => {
      const input = '[Link text](https://example.com)';
      const result = highlightMarkdown(input);
      
      expect(result).toContain('\x1b[34m\x1b[4mLink text\x1b[0m');
    });

    it('should highlight quotes', () => {
      const input = '> This is a quote\n> Another line';
      const result = highlightMarkdown(input);
      
      expect(result).toContain('\x1b[2m\x1b[37m>\x1b[0m \x1b[3mThis is a quote\x1b[0m');
      expect(result).toContain('\x1b[2m\x1b[37m>\x1b[0m \x1b[3mAnother line\x1b[0m');
    });

    it('should handle mixed markdown formatting', () => {
      const input = '# Header\n\n**Bold** and *italic* text with `code`\n\n- List item\n- Another item';
      const result = highlightMarkdown(input);
      
      // Should contain highlighting for all elements
      expect(result).toContain('\x1b[1m\x1b[36m#\x1b[0m \x1b[1mHeader\x1b[0m');
      expect(result).toContain('\x1b[1mBold\x1b[0m');
      expect(result).toContain('\x1b[3mitalic\x1b[0m');
      expect(result).toContain('\x1b[90m\x1b[47mcode\x1b[0m');
      expect(result).toContain('\x1b[33m-\x1b[0m List item');
    });

    it('should handle text without markdown formatting', () => {
      const input = 'Plain text without any markdown';
      const result = highlightMarkdown(input);
      
      expect(result).toBe(input);
    });

    it('should handle empty string', () => {
      const result = highlightMarkdown('');
      
      expect(result).toBe('');
    });
  });

  describe('formatAsMarkdownCodeBlock', () => {
    it('should wrap content in markdown code block', () => {
      const content = 'console.log("hello");';
      const result = formatAsMarkdownCodeBlock(content, 'javascript');
      
      expect(result).toBe('```javascript\nconsole.log("hello");\n```');
    });

    it('should use markdown as default language', () => {
      const content = '# Header';
      const result = formatAsMarkdownCodeBlock(content);
      
      expect(result).toBe('```markdown\n# Header\n```');
    });

    it('should handle empty content', () => {
      const result = formatAsMarkdownCodeBlock('');
      
      expect(result).toBe('```markdown\n\n```');
    });
  });
});