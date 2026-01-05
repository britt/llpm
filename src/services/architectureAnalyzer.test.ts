import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateText } from 'ai';

// Mock the ai module
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// Mock the model registry
vi.mock('./modelRegistry', () => ({
  modelRegistry: {
    createLanguageModel: vi.fn().mockResolvedValue({}),
    getCurrentModel: vi.fn().mockReturnValue({
      provider: 'openai',
      modelId: 'gpt-4',
      displayName: 'GPT-4',
    }),
  },
}));

import {
  buildArchitectureContext,
  parseArchitectureResponse,
  generateMermaidDiagram,
  analyzeArchitecture,
  type ArchitectureContext,
  type ArchitectureComponent,
} from './architectureAnalyzer';
import type { FileInfo } from './projectAnalyzer';
import type { KeyFile, DirectoryEntry } from '../types/projectScan';

describe('architectureAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildArchitectureContext', () => {
    it('should build context from files and directories', () => {
      const files: Partial<FileInfo>[] = [
        { path: 'src/index.ts', name: 'index.ts', extension: '.ts', lines: 100 },
        { path: 'src/services/api.ts', name: 'api.ts', extension: '.ts', lines: 200 },
        { path: 'src/components/Button.tsx', name: 'Button.tsx', extension: '.tsx', lines: 50 },
      ];

      const directories: DirectoryEntry[] = [
        { path: 'src', purpose: 'Source code', fileCount: 10, primaryLanguage: 'TypeScript' },
        { path: 'src/services', purpose: 'Services', fileCount: 5, primaryLanguage: 'TypeScript' },
        { path: 'src/components', purpose: 'Components', fileCount: 10, primaryLanguage: 'TypeScript' },
      ];

      const keyFiles: KeyFile[] = [
        { path: 'src/index.ts', reason: 'Entry point', category: 'entry-point' },
      ];

      const context = buildArchitectureContext(
        files as FileInfo[],
        directories,
        keyFiles,
        ['TypeScript'],
        ['React', 'Express']
      );

      expect(context.languages).toContain('TypeScript');
      expect(context.frameworks).toContain('React');
      expect(context.frameworks).toContain('Express');
      expect(context.directories).toHaveLength(3);
      expect(context.keyFiles).toHaveLength(1);
    });

    it('should limit file context to prevent token overflow', () => {
      const files: Partial<FileInfo>[] = Array.from({ length: 100 }, (_, i) => ({
        path: `src/file${i}.ts`,
        name: `file${i}.ts`,
        extension: '.ts',
        lines: 100,
      }));

      const directories: DirectoryEntry[] = [
        { path: 'src', purpose: 'Source code', fileCount: 100, primaryLanguage: 'TypeScript' },
      ];

      const context = buildArchitectureContext(
        files as FileInfo[],
        directories,
        [],
        ['TypeScript'],
        []
      );

      // Context should be limited
      expect(context.fileList.length).toBeLessThanOrEqual(50);
    });

    it('should include framework information', () => {
      const context = buildArchitectureContext(
        [],
        [],
        [],
        ['TypeScript', 'Python'],
        ['React', 'FastAPI', 'PostgreSQL']
      );

      expect(context.languages).toEqual(['TypeScript', 'Python']);
      expect(context.frameworks).toEqual(['React', 'FastAPI', 'PostgreSQL']);
    });
  });

  describe('parseArchitectureResponse', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        description: 'A modern web application with React frontend and Express backend.',
        components: [
          {
            name: 'Frontend',
            type: 'layer',
            description: 'React-based user interface',
            dependencies: ['API Layer'],
            keyFiles: ['src/components/'],
          },
          {
            name: 'API Layer',
            type: 'service',
            description: 'Express REST API',
            dependencies: ['Database'],
            keyFiles: ['src/services/api.ts'],
          },
        ],
        mermaidDiagram: 'flowchart TD\n  Frontend --> API',
      });

      const result = parseArchitectureResponse(response);

      expect(result.description).toBe('A modern web application with React frontend and Express backend.');
      expect(result.components).toHaveLength(2);
      expect(result.components[0].name).toBe('Frontend');
      expect(result.mermaidDiagram).toContain('flowchart TD');
    });

    it('should extract JSON from markdown code blocks', () => {
      const response = `Here's the architecture analysis:

\`\`\`json
{
  "description": "A CLI application",
  "components": [],
  "mermaidDiagram": "flowchart TD\\n  A --> B"
}
\`\`\`

This is additional text.`;

      const result = parseArchitectureResponse(response);

      expect(result.description).toBe('A CLI application');
    });

    it('should handle malformed JSON gracefully', () => {
      const response = 'This is not valid JSON at all.';

      const result = parseArchitectureResponse(response);

      expect(result.description).toBe('');
      expect(result.components).toEqual([]);
      expect(result.mermaidDiagram).toBeUndefined();
    });

    it('should validate component structure', () => {
      const response = JSON.stringify({
        description: 'Test',
        components: [
          { name: 'Valid', type: 'layer', description: 'desc', dependencies: [], keyFiles: [] },
          { invalid: 'object' },
          'not an object',
        ],
      });

      const result = parseArchitectureResponse(response);

      // Should only include valid component
      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe('Valid');
    });
  });

  describe('generateMermaidDiagram', () => {
    it('should generate flowchart from components', () => {
      const components: ArchitectureComponent[] = [
        {
          name: 'Frontend',
          type: 'layer',
          description: 'UI Layer',
          dependencies: ['API'],
          keyFiles: [],
        },
        {
          name: 'API',
          type: 'service',
          description: 'REST API',
          dependencies: ['Database'],
          keyFiles: [],
        },
        {
          name: 'Database',
          type: 'data-store',
          description: 'PostgreSQL',
          dependencies: [],
          keyFiles: [],
        },
      ];

      const diagram = generateMermaidDiagram(components);

      expect(diagram).toContain('flowchart TD');
      expect(diagram).toContain('Frontend');
      expect(diagram).toContain('API');
      expect(diagram).toContain('Database');
      expect(diagram).toContain('-->');
    });

    it('should handle components with no dependencies', () => {
      const components: ArchitectureComponent[] = [
        {
          name: 'Standalone',
          type: 'utility',
          description: 'Utility functions',
          dependencies: [],
          keyFiles: [],
        },
      ];

      const diagram = generateMermaidDiagram(components);

      expect(diagram).toContain('flowchart TD');
      expect(diagram).toContain('Standalone');
    });

    it('should return empty string for empty components', () => {
      const diagram = generateMermaidDiagram([]);
      expect(diagram).toBe('');
    });

    it('should sanitize component names for Mermaid', () => {
      const components: ArchitectureComponent[] = [
        {
          name: 'My Component (v2)',
          type: 'layer',
          description: 'Test',
          dependencies: [],
          keyFiles: [],
        },
      ];

      const diagram = generateMermaidDiagram(components);

      // Should escape special characters
      expect(diagram).toContain('flowchart TD');
    });
  });

  describe('analyzeArchitecture', () => {
    it('should call LLM and return architecture analysis', async () => {
      const mockResponse = {
        text: JSON.stringify({
          description: 'A web application with microservices architecture.',
          components: [
            {
              name: 'Gateway',
              type: 'service',
              description: 'API Gateway',
              dependencies: ['Auth Service', 'User Service'],
              keyFiles: ['src/gateway/'],
            },
          ],
          mermaidDiagram: 'flowchart TD\n  Gateway --> AuthService\n  Gateway --> UserService',
        }),
      };

      vi.mocked(generateText).mockResolvedValue(mockResponse as any);

      const files: Partial<FileInfo>[] = [
        { path: 'src/index.ts', name: 'index.ts', extension: '.ts', lines: 100 },
      ];

      const directories: DirectoryEntry[] = [
        { path: 'src', purpose: 'Source code', fileCount: 10, primaryLanguage: 'TypeScript' },
      ];

      const result = await analyzeArchitecture(
        files as FileInfo[],
        directories,
        [],
        ['TypeScript'],
        ['Express']
      );

      expect(result.description).toBe('A web application with microservices architecture.');
      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe('Gateway');
      expect(generateText).toHaveBeenCalledTimes(1);
    });

    it('should handle LLM errors gracefully', async () => {
      vi.mocked(generateText).mockRejectedValue(new Error('API error'));

      const result = await analyzeArchitecture(
        [],
        [],
        [],
        ['TypeScript'],
        []
      );

      expect(result.description).toBe('');
      expect(result.components).toEqual([]);
    });

    it('should include context in LLM prompt', async () => {
      const mockResponse = {
        text: JSON.stringify({
          description: 'Test',
          components: [],
        }),
      };

      vi.mocked(generateText).mockResolvedValue(mockResponse as any);

      const directories: DirectoryEntry[] = [
        { path: 'src/components', purpose: 'UI Components', fileCount: 20, primaryLanguage: 'TypeScript' },
        { path: 'src/services', purpose: 'Business Logic', fileCount: 10, primaryLanguage: 'TypeScript' },
      ];

      await analyzeArchitecture(
        [],
        directories,
        [],
        ['TypeScript'],
        ['React', 'Redux']
      );

      // Verify the LLM was called with appropriate context
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('React'),
            }),
          ]),
        })
      );
    });

    it('should skip LLM call when skipLLM option is true', async () => {
      const result = await analyzeArchitecture(
        [],
        [],
        [],
        ['TypeScript'],
        [],
        { skipLLM: true }
      );

      expect(result.description).toBe('');
      expect(result.components).toEqual([]);
      expect(generateText).not.toHaveBeenCalled();
    });
  });
});
