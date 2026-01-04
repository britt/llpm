import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';

// Auto-mock fs modules
vi.mock('fs/promises');
vi.mock('fs');

import {
  findReadmeFile,
  findDocumentationFiles,
  parseReadmeContent,
  analyzeDocumentation,
  extractCodeComments,
  assessDocumentationCoverage,
  type DocumentationAnalysisResult,
} from './documentationAnalyzer';
import type { FileInfo } from './projectAnalyzer';

describe('documentationAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  describe('findReadmeFile', () => {
    it('should find README.md (case-insensitive)', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'src/index.ts', name: 'index.ts' },
        { path: 'README.md', name: 'README.md' },
        { path: 'package.json', name: 'package.json' },
      ];

      const readme = findReadmeFile(files as FileInfo[]);
      expect(readme).toBe('README.md');
    });

    it('should find readme.md lowercase', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'readme.md', name: 'readme.md' },
      ];

      const readme = findReadmeFile(files as FileInfo[]);
      expect(readme).toBe('readme.md');
    });

    it('should find Readme.md mixed case', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'Readme.md', name: 'Readme.md' },
      ];

      const readme = findReadmeFile(files as FileInfo[]);
      expect(readme).toBe('Readme.md');
    });

    it('should find README.rst', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'README.rst', name: 'README.rst' },
      ];

      const readme = findReadmeFile(files as FileInfo[]);
      expect(readme).toBe('README.rst');
    });

    it('should find README.txt', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'README.txt', name: 'README.txt' },
      ];

      const readme = findReadmeFile(files as FileInfo[]);
      expect(readme).toBe('README.txt');
    });

    it('should prefer README.md over other variants', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'README.txt', name: 'README.txt' },
        { path: 'README.md', name: 'README.md' },
        { path: 'README.rst', name: 'README.rst' },
      ];

      const readme = findReadmeFile(files as FileInfo[]);
      expect(readme).toBe('README.md');
    });

    it('should return null if no README found', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'src/index.ts', name: 'index.ts' },
        { path: 'package.json', name: 'package.json' },
      ];

      const readme = findReadmeFile(files as FileInfo[]);
      expect(readme).toBeNull();
    });
  });

  describe('findDocumentationFiles', () => {
    it('should find files in docs/ directory', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'docs/api.md', name: 'api.md', extension: '.md' },
        { path: 'docs/guide.md', name: 'guide.md', extension: '.md' },
        { path: 'src/index.ts', name: 'index.ts', extension: '.ts' },
      ];

      const docFiles = findDocumentationFiles(files as FileInfo[]);
      expect(docFiles).toContain('docs/api.md');
      expect(docFiles).toContain('docs/guide.md');
      expect(docFiles).not.toContain('src/index.ts');
    });

    it('should find files in documentation/ directory', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'documentation/setup.md', name: 'setup.md', extension: '.md' },
        { path: 'documentation/usage.md', name: 'usage.md', extension: '.md' },
      ];

      const docFiles = findDocumentationFiles(files as FileInfo[]);
      expect(docFiles).toContain('documentation/setup.md');
      expect(docFiles).toContain('documentation/usage.md');
    });

    it('should find markdown files at root level', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'CONTRIBUTING.md', name: 'CONTRIBUTING.md', extension: '.md' },
        { path: 'CHANGELOG.md', name: 'CHANGELOG.md', extension: '.md' },
        { path: 'LICENSE.md', name: 'LICENSE.md', extension: '.md' },
      ];

      const docFiles = findDocumentationFiles(files as FileInfo[]);
      expect(docFiles).toContain('CONTRIBUTING.md');
      expect(docFiles).toContain('CHANGELOG.md');
    });

    it('should include .rst files', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'docs/api.rst', name: 'api.rst', extension: '.rst' },
        { path: 'docs/index.rst', name: 'index.rst', extension: '.rst' },
      ];

      const docFiles = findDocumentationFiles(files as FileInfo[]);
      expect(docFiles).toContain('docs/api.rst');
      expect(docFiles).toContain('docs/index.rst');
    });

    it('should return empty array if no documentation found', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'src/index.ts', name: 'index.ts', extension: '.ts' },
        { path: 'package.json', name: 'package.json', extension: '.json' },
      ];

      const docFiles = findDocumentationFiles(files as FileInfo[]);
      expect(docFiles).toEqual([]);
    });

    it('should exclude README files from doc files list', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'README.md', name: 'README.md', extension: '.md' },
        { path: 'docs/api.md', name: 'api.md', extension: '.md' },
      ];

      const docFiles = findDocumentationFiles(files as FileInfo[]);
      expect(docFiles).not.toContain('README.md');
      expect(docFiles).toContain('docs/api.md');
    });
  });

  describe('parseReadmeContent', () => {
    it('should extract title from markdown', () => {
      const content = '# My Awesome Project\n\nThis is a description.';
      const parsed = parseReadmeContent(content);
      expect(parsed.title).toBe('My Awesome Project');
    });

    it('should extract description from first paragraph', () => {
      const content = '# Title\n\nThis is the project description.\n\n## Features';
      const parsed = parseReadmeContent(content);
      expect(parsed.description).toBe('This is the project description.');
    });

    it('should detect installation section', () => {
      const content = '# Title\n\n## Installation\n\n```bash\nnpm install\n```';
      const parsed = parseReadmeContent(content);
      expect(parsed.hasInstallation).toBe(true);
    });

    it('should detect usage section', () => {
      const content = '# Title\n\n## Usage\n\nRun the command.';
      const parsed = parseReadmeContent(content);
      expect(parsed.hasUsage).toBe(true);
    });

    it('should detect API section', () => {
      const content = '# Title\n\n## API Reference\n\n### Methods';
      const parsed = parseReadmeContent(content);
      expect(parsed.hasApiDocs).toBe(true);
    });

    it('should detect examples section', () => {
      const content = '# Title\n\n## Examples\n\n```js\nconsole.log("hello");\n```';
      const parsed = parseReadmeContent(content);
      expect(parsed.hasExamples).toBe(true);
    });

    it('should extract sections list', () => {
      const content = '# Title\n\n## Installation\n\n## Usage\n\n## API\n\n## License';
      const parsed = parseReadmeContent(content);
      expect(parsed.sections).toContain('Installation');
      expect(parsed.sections).toContain('Usage');
      expect(parsed.sections).toContain('API');
      expect(parsed.sections).toContain('License');
    });

    it('should handle empty content', () => {
      const parsed = parseReadmeContent('');
      expect(parsed.title).toBeNull();
      expect(parsed.description).toBeNull();
      expect(parsed.sections).toEqual([]);
    });

    it('should handle content without title', () => {
      const content = 'Just some text without a header.';
      const parsed = parseReadmeContent(content);
      expect(parsed.title).toBeNull();
      expect(parsed.description).toBe('Just some text without a header.');
    });
  });

  describe('extractCodeComments', () => {
    it('should extract JSDoc comments from TypeScript', () => {
      const content = `
/**
 * Adds two numbers together.
 * @param a First number
 * @param b Second number
 * @returns The sum
 */
function add(a: number, b: number): number {
  return a + b;
}
`;
      const comments = extractCodeComments(content, '.ts');
      expect(comments.jsdocCount).toBe(1);
      expect(comments.hasJsdoc).toBe(true);
    });

    it('should count inline comments', () => {
      const content = `
// This is a comment
function foo() {
  // Another comment
  return 42;
}
`;
      const comments = extractCodeComments(content, '.ts');
      expect(comments.inlineCount).toBe(2);
    });

    it('should count block comments', () => {
      const content = `
/*
 * This is a block comment
 */
function foo() {
  /* inline block */ return 42;
}
`;
      const comments = extractCodeComments(content, '.ts');
      expect(comments.blockCount).toBe(2);
    });

    it('should handle Python docstrings', () => {
      const content = `
def add(a, b):
    """
    Adds two numbers together.

    Args:
        a: First number
        b: Second number

    Returns:
        The sum
    """
    return a + b
`;
      const comments = extractCodeComments(content, '.py');
      expect(comments.docstringCount).toBe(1);
      expect(comments.hasDocstrings).toBe(true);
    });

    it('should handle Python hash comments', () => {
      const content = `
# This is a comment
def foo():
    # Another comment
    return 42
`;
      const comments = extractCodeComments(content, '.py');
      expect(comments.inlineCount).toBe(2);
    });

    it('should return empty stats for unsupported languages', () => {
      const content = 'Some content';
      const comments = extractCodeComments(content, '.unknown');
      expect(comments.jsdocCount).toBe(0);
      expect(comments.inlineCount).toBe(0);
      expect(comments.blockCount).toBe(0);
    });
  });

  describe('assessDocumentationCoverage', () => {
    it('should calculate overall coverage score', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'README.md', name: 'README.md', extension: '.md' },
        { path: 'docs/api.md', name: 'api.md', extension: '.md' },
        { path: 'src/index.ts', name: 'index.ts', extension: '.ts', lines: 100 },
      ];

      const coverage = assessDocumentationCoverage(
        files as FileInfo[],
        true, // hasReadme
        2,    // docFileCount
        0.3   // commentRatio
      );

      expect(coverage.score).toBeGreaterThan(0);
      expect(coverage.score).toBeLessThanOrEqual(100);
    });

    it('should give higher score for having README', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'src/index.ts', name: 'index.ts', extension: '.ts', lines: 100 },
      ];

      const withReadme = assessDocumentationCoverage(files as FileInfo[], true, 0, 0);
      const withoutReadme = assessDocumentationCoverage(files as FileInfo[], false, 0, 0);

      expect(withReadme.score).toBeGreaterThan(withoutReadme.score);
    });

    it('should give higher score for more doc files', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'src/index.ts', name: 'index.ts', extension: '.ts', lines: 100 },
      ];

      const fewDocs = assessDocumentationCoverage(files as FileInfo[], true, 1, 0);
      const manyDocs = assessDocumentationCoverage(files as FileInfo[], true, 5, 0);

      expect(manyDocs.score).toBeGreaterThan(fewDocs.score);
    });

    it('should give higher score for better comment ratio', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'src/index.ts', name: 'index.ts', extension: '.ts', lines: 100 },
      ];

      const lowComments = assessDocumentationCoverage(files as FileInfo[], true, 0, 0.1);
      const highComments = assessDocumentationCoverage(files as FileInfo[], true, 0, 0.5);

      expect(highComments.score).toBeGreaterThan(lowComments.score);
    });

    it('should categorize coverage level', () => {
      const files: Partial<FileInfo>[] = [];

      const excellent = assessDocumentationCoverage(files as FileInfo[], true, 10, 0.5);
      const good = assessDocumentationCoverage(files as FileInfo[], true, 3, 0.3);
      const poor = assessDocumentationCoverage(files as FileInfo[], false, 0, 0);

      expect(['excellent', 'good', 'fair', 'poor']).toContain(excellent.level);
      expect(['excellent', 'good', 'fair', 'poor']).toContain(good.level);
      expect(poor.level).toBe('poor');
    });
  });

  describe('analyzeDocumentation', () => {
    it('should return complete documentation analysis', async () => {
      const files: Partial<FileInfo>[] = [
        { path: 'README.md', name: 'README.md', extension: '.md' },
        { path: 'docs/api.md', name: 'api.md', extension: '.md' },
        { path: 'src/index.ts', name: 'index.ts', extension: '.ts', lines: 100 },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(
        '# My Project\n\nThis is a great project.\n\n## Installation\n\nnpm install'
      );

      const analysis = await analyzeDocumentation('/project', files as FileInfo[]);

      expect(analysis.readmePath).toBe('README.md');
      expect(analysis.readmeSummary).toContain('My Project');
      expect(analysis.hasDocumentation).toBe(true);
      expect(analysis.docFiles).toContain('docs/api.md');
    });

    it('should handle missing README', async () => {
      const files: Partial<FileInfo>[] = [
        { path: 'src/index.ts', name: 'index.ts', extension: '.ts', lines: 100 },
      ];

      const analysis = await analyzeDocumentation('/project', files as FileInfo[]);

      expect(analysis.readmePath).toBeNull();
      expect(analysis.readmeSummary).toBeNull();
      expect(analysis.hasDocumentation).toBe(false);
    });

    it('should handle README read errors gracefully', async () => {
      const files: Partial<FileInfo>[] = [
        { path: 'README.md', name: 'README.md', extension: '.md' },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('Read error'));

      const analysis = await analyzeDocumentation('/project', files as FileInfo[]);

      expect(analysis.readmePath).toBe('README.md');
      expect(analysis.readmeSummary).toBeNull();
    });

    it('should include documentation files', async () => {
      const files: Partial<FileInfo>[] = [
        { path: 'docs/setup.md', name: 'setup.md', extension: '.md' },
        { path: 'docs/api.md', name: 'api.md', extension: '.md' },
        { path: 'CONTRIBUTING.md', name: 'CONTRIBUTING.md', extension: '.md' },
      ];

      const analysis = await analyzeDocumentation('/project', files as FileInfo[]);

      expect(analysis.docFiles).toContain('docs/setup.md');
      expect(analysis.docFiles).toContain('docs/api.md');
      expect(analysis.docFiles).toContain('CONTRIBUTING.md');
    });

    it('should generate coverage assessment', async () => {
      const files: Partial<FileInfo>[] = [
        { path: 'README.md', name: 'README.md', extension: '.md' },
        { path: 'src/index.ts', name: 'index.ts', extension: '.ts', lines: 100 },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue('# Project\n\nDescription');

      const analysis = await analyzeDocumentation('/project', files as FileInfo[]);

      expect(analysis.coverage).toBeDefined();
      expect(analysis.coverage.score).toBeGreaterThanOrEqual(0);
      expect(analysis.coverage.level).toBeDefined();
    });
  });
});
