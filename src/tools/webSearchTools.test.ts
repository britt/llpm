import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing tools
vi.mock('@arcadeai/arcadejs', () => ({
  default: vi.fn().mockImplementation(() => ({
    tools: {
      execute: vi.fn()
    }
  }))
}));

vi.mock('../utils/credentialManager', () => ({
  credentialManager: {
    getArcadeAPIKey: vi.fn()
  }
}));

vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import { webSearchTool } from './webSearchTools';
import { credentialManager } from '../utils/credentialManager';
import Arcade from '@arcadeai/arcadejs';

describe('Web Search Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should have a valid Zod schema as inputSchema', () => {
      expect(webSearchTool.inputSchema).toBeDefined();
      expect(typeof webSearchTool.inputSchema.parse).toBe('function');
      expect(typeof webSearchTool.inputSchema.safeParse).toBe('function');
    });

    it('should accept valid query parameter', () => {
      const parseResult = webSearchTool.inputSchema.safeParse({
        query: 'test search query'
      });
      expect(parseResult.success).toBe(true);
    });

    it('should accept optional n_results parameter', () => {
      const parseResult = webSearchTool.inputSchema.safeParse({
        query: 'test search query',
        n_results: 5
      });
      expect(parseResult.success).toBe(true);
    });

    it('should require query parameter', () => {
      const parseResult = webSearchTool.inputSchema.safeParse({});
      expect(parseResult.success).toBe(false);
    });
  });

  describe('webSearchTool execution', () => {
    it('should fail when no API key is configured', async () => {
      vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue(null);

      const result = await webSearchTool.execute({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ARCADE_API_KEY');
    });

    it('should execute search successfully', async () => {
      vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue('test-api-key');

      const mockArcadeInstance = {
        tools: {
          execute: vi.fn().mockResolvedValue({
            success: true,
            output: {
              value: JSON.stringify([
                {
                  title: 'Test Result 1',
                  url: 'https://example.com/1',
                  snippet: 'This is test result 1',
                  source: 'Web'
                },
                {
                  title: 'Test Result 2',
                  link: 'https://example.com/2',
                  description: 'This is test result 2'
                }
              ])
            }
          })
        }
      };
      vi.mocked(Arcade).mockImplementation(() => mockArcadeInstance as any);

      const result = await webSearchTool.execute({ query: 'test query' });

      expect(result.success).toBe(true);
      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].title).toBe('Test Result 1');
      expect(result.results[0].url).toBe('https://example.com/1');
      expect(result.results[0].snippet).toBe('This is test result 1');
    });

    it('should cap n_results at 10', async () => {
      vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue('test-api-key');

      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
        output: {
          value: JSON.stringify([])
        }
      });
      const mockArcadeInstance = {
        tools: { execute: mockExecute }
      };
      vi.mocked(Arcade).mockImplementation(() => mockArcadeInstance as any);

      await webSearchTool.execute({ query: 'test query', n_results: 20 });

      expect(mockExecute).toHaveBeenCalledWith({
        tool_name: 'GoogleSearch.Search',
        input: {
          query: 'test query',
          n_results: 10
        }
      });
    });

    it('should handle API failure response', async () => {
      vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue('test-api-key');

      const mockArcadeInstance = {
        tools: {
          execute: vi.fn().mockResolvedValue({
            success: false,
            output: {
              error: {
                message: 'API rate limit exceeded'
              }
            }
          })
        }
      };
      vi.mocked(Arcade).mockImplementation(() => mockArcadeInstance as any);

      const result = await webSearchTool.execute({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API rate limit exceeded');
    });

    it('should handle invalid response format', async () => {
      vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue('test-api-key');

      const mockArcadeInstance = {
        tools: {
          execute: vi.fn().mockResolvedValue({
            success: true,
            output: {
              value: 'not-valid-json'
            }
          })
        }
      };
      vi.mocked(Arcade).mockImplementation(() => mockArcadeInstance as any);

      const result = await webSearchTool.execute({ query: 'test query' });

      expect(result.success).toBe(false);
    });

    it('should handle when response is not an array', async () => {
      vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue('test-api-key');

      const mockArcadeInstance = {
        tools: {
          execute: vi.fn().mockResolvedValue({
            success: true,
            output: {
              value: JSON.stringify({ results: 'object instead of array' })
            }
          })
        }
      };
      vi.mocked(Arcade).mockImplementation(() => mockArcadeInstance as any);

      const result = await webSearchTool.execute({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid response format from search service');
    });

    it('should handle null search results', async () => {
      vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue('test-api-key');

      const mockArcadeInstance = {
        tools: {
          execute: vi.fn().mockResolvedValue({
            success: true,
            output: {
              value: JSON.stringify(null)
            }
          })
        }
      };
      vi.mocked(Arcade).mockImplementation(() => mockArcadeInstance as any);

      const result = await webSearchTool.execute({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid response format from search service');
    });

    it('should handle empty search results', async () => {
      vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue('test-api-key');

      const mockArcadeInstance = {
        tools: {
          execute: vi.fn().mockResolvedValue({
            success: true,
            output: {
              value: JSON.stringify([])
            }
          })
        }
      };
      vi.mocked(Arcade).mockImplementation(() => mockArcadeInstance as any);

      const result = await webSearchTool.execute({ query: 'test query' });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should format results correctly with fallback values', async () => {
      vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue('test-api-key');

      const mockArcadeInstance = {
        tools: {
          execute: vi.fn().mockResolvedValue({
            success: true,
            output: {
              value: JSON.stringify([
                {}, // Empty result - should use fallbacks
                {
                  link: 'https://example.com/link', // uses link instead of url
                  description: 'Test description' // uses description instead of snippet
                }
              ])
            }
          })
        }
      };
      vi.mocked(Arcade).mockImplementation(() => mockArcadeInstance as any);

      const result = await webSearchTool.execute({ query: 'test query' });

      expect(result.success).toBe(true);
      expect(result.results[0].title).toBe('Untitled');
      expect(result.results[0].url).toBe('');
      expect(result.results[0].snippet).toBe('');
      expect(result.results[0].source).toBe('Web');
      expect(result.results[1].url).toBe('https://example.com/link');
      expect(result.results[1].snippet).toBe('Test description');
    });

    it('should handle general errors gracefully', async () => {
      vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue('test-api-key');
      vi.mocked(Arcade).mockImplementation(() => {
        throw new Error('Network connection failed');
      });

      const result = await webSearchTool.execute({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network connection failed');
    });

    it('should include timestamp in results', async () => {
      vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue('test-api-key');

      const mockArcadeInstance = {
        tools: {
          execute: vi.fn().mockResolvedValue({
            success: true,
            output: {
              value: JSON.stringify([{ title: 'Test' }])
            }
          })
        }
      };
      vi.mocked(Arcade).mockImplementation(() => mockArcadeInstance as any);

      const result = await webSearchTool.execute({ query: 'test query' });

      expect(result.success).toBe(true);
      expect(result.searched_at).toBeDefined();
      expect(new Date(result.searched_at).getTime()).not.toBeNaN();
    });
  });

  describe('Tool Description', () => {
    it('should have a clear description', () => {
      expect(webSearchTool.description).toBeDefined();
      expect(webSearchTool.description.length).toBeGreaterThan(20);
      expect(webSearchTool.description.toLowerCase()).toContain('search');
    });
  });
});
