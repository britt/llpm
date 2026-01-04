/**
 * Web Search Tools
 *
 * These tools are exposed to the LLM for searching the web.
 * Each tool's `description` field is a @prompt that instructs the LLM
 * on when and how to use the tool. The `inputSchema` descriptions are
 * also @prompt content that guide the LLM on parameter usage.
 */
import { tool } from './instrumentedTool';
import * as z from "zod";
import { debug } from '../utils/logger';
import Arcade from '@arcadeai/arcadejs';
import { credentialManager } from '../utils/credentialManager';

// Initialize Arcade client
async function getArcadeClient() {
  const apiKey = await credentialManager.getArcadeAPIKey();
  if (!apiKey) {
    throw new Error('ARCADE_API_KEY is required for web search functionality. Please configure it in environment variables or credentials.');
  }
  return new Arcade({ apiKey });
}

/**
 * @prompt Tool: web_search
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const webSearchTool = tool({
  description: 'Search the web using Google Search to find current information, news, and web content',
  inputSchema: z.object({
    query: z.string().describe('The search query to look up on the web'),
    n_results: z.number().optional().describe('Number of search results to return (default: 5, max: 10)')
  }),
  execute: async ({ query, n_results = 5 }) => {
    debug('Executing web_search tool with params:', { query, n_results });

    try {
      const arcade = await getArcadeClient();
      
      // Execute the Google Search tool via Arcade
      const response = await arcade.tools.execute({
        tool_name: 'GoogleSearch.Search',
        input: {
          query,
          n_results: Math.min(n_results, 10) // Cap at 10 results
        }
      });

      debug('Arcade API response:', response);

      if (!response.success) {
        return {
          success: false,
          error: response.output?.error?.message || 'Search failed'
        };
      }

      // Extract search results from the response
      const searchResults = response.output?.value && JSON.parse(response.output?.value as string);
      
      if (!searchResults || !Array.isArray(searchResults)) {
        return {
          success: false,
          error: 'Invalid response format from search service'
        };
      }

      // Format the results for better readability
      const formattedResults = searchResults.map((result: unknown, index: number) => {
        const searchResult = result as { title?: string; url?: string; link?: string; snippet?: string; description?: string; source?: string };
        return {
          rank: index + 1,
          title: searchResult.title || 'Untitled',
          url: searchResult.url || searchResult.link || '',
          snippet: searchResult.snippet || searchResult.description || '',
          source: searchResult.source || 'Web'
        };
      });

      return {
        success: true,
        query,
        results: formattedResults,
        count: formattedResults.length,
        searched_at: new Date().toISOString()
      };

    } catch (error) {
      debug('Web search error:', error);
      
      if (error instanceof Error && error.message.includes('ARCADE_API_KEY')) {
        return {
          success: false,
          error: 'Web search requires ARCADE_API_KEY to be configured. Please set your API key in environment variables or credentials.'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during web search'
      };
    }
  }
});