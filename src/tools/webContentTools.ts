import { tool } from './instrumentedTool';
import { z } from 'zod';
import { debug } from '../utils/logger';

/**
 * Web content reading tools for extracting and processing content from URLs
 */

interface ParsedContent {
  title?: string;
  content: string;
  description?: string;
  url: string;
  contentType: string;
  wordCount: number;
  readingTime: number; // in minutes
}

/**
 * Extract text content from HTML by removing tags and scripts
 */
function extractTextFromHTML(html: string): { title?: string; content: string; description?: string } {
  // Remove script and style elements
  let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Extract title
  const titleMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : undefined;
  
  // Extract meta description
  const descMatch = cleanHtml.match(/<meta[^>]*name=['"]description['"][^>]*content=['"]([^'"]*)['"]/i);
  const description = descMatch ? descMatch[1].trim() : undefined;
  
  // Remove HTML tags and decode entities
  let textContent = cleanHtml.replace(/<[^>]*>/g, ' ');
  
  // Decode common HTML entities
  textContent = textContent
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // Clean up whitespace
  textContent = textContent
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
  
  return {
    title: title && title.length > 0 ? title : undefined,
    content: textContent,
    description: description && description.length > 0 ? description : undefined
  };
}

/**
 * Calculate estimated reading time based on word count
 */
function calculateReadingTime(wordCount: number): number {
  const averageWPM = 200; // Average words per minute for reading
  return Math.ceil(wordCount / averageWPM);
}

/**
 * Validate and normalize URL
 */
function normalizeUrl(url: string): string {
  try {
    // Basic validation for obvious invalid URLs
    if (!url || url.trim().length === 0) {
      throw new Error('URL cannot be empty');
    }
    
    // Remove extra whitespace
    url = url.trim();
    
    // Check for obviously invalid characters
    if (/\s/.test(url) && !url.startsWith('http')) {
      throw new Error('Invalid characters in URL');
    }
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Validate URL format
    new URL(url);
    return url;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid')) {
      throw error;
    }
    throw new Error(`Invalid URL format: ${url}`);
  }
}

/**
 * Fetch content from a URL with proper error handling and timeouts
 */
async function fetchWebContent(url: string, timeout: number = 10000): Promise<{ content: string; contentType: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    debug('Fetching content from URL:', url);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LLPM Web Content Reader/1.0 (https://github.com/britt/llpm)',
        'Accept': 'text/html,application/xhtml+xml,application/xml,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || 'text/html';
    const content = await response.text();
    
    debug('Successfully fetched content:', {
      url,
      contentType,
      size: content.length
    });
    
    return { content, contentType };
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
    
    throw new Error('Unknown error occurred while fetching content');
  }
}

export const readWebPageTool = tool({
  description: 'Read and extract text content from a web page URL. Supports HTML pages, plain text, and basic content extraction.',
  inputSchema: z.object({
    url: z.string().describe('The URL of the web page to read and extract content from'),
    maxLength: z.number().optional().default(10000).describe('Maximum length of content to return (default: 10000 characters)'),
    timeout: z.number().optional().default(10000).describe('Request timeout in milliseconds (default: 10000)')
  }),
  execute: async ({ url, maxLength = 10000, timeout = 10000 }) => {
    debug('Reading web page:', { url, maxLength, timeout });
    
    try {
      // Normalize and validate URL
      const normalizedUrl = normalizeUrl(url);
      
      // Fetch content from URL
      const { content: rawContent, contentType } = await fetchWebContent(normalizedUrl, timeout);
      
      let parsedContent: ParsedContent;
      
      // Process content based on type
      if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
        const { title, content, description } = extractTextFromHTML(rawContent);
        const wordCount = content.split(/\s+/).length;
        
        parsedContent = {
          title,
          content,
          description,
          url: normalizedUrl,
          contentType: 'text/html',
          wordCount,
          readingTime: calculateReadingTime(wordCount)
        };
      } else if (contentType.includes('text/plain')) {
        const wordCount = rawContent.split(/\s+/).length;
        
        parsedContent = {
          content: rawContent.trim(),
          url: normalizedUrl,
          contentType: 'text/plain',
          wordCount,
          readingTime: calculateReadingTime(wordCount)
        };
      } else {
        // Try to extract text anyway for other content types
        const { title, content, description } = extractTextFromHTML(rawContent);
        const wordCount = content.split(/\s+/).length;
        
        parsedContent = {
          title,
          content,
          description,
          url: normalizedUrl,
          contentType,
          wordCount,
          readingTime: calculateReadingTime(wordCount)
        };
      }
      
      // Truncate content if too long
      let finalContent = parsedContent.content;
      if (finalContent.length > maxLength) {
        finalContent = finalContent.substring(0, maxLength) + '... [Content truncated]';
      }
      
      return {
        success: true,
        url: parsedContent.url,
        title: parsedContent.title,
        description: parsedContent.description,
        content: finalContent,
        contentType: parsedContent.contentType,
        wordCount: parsedContent.wordCount,
        readingTime: parsedContent.readingTime,
        contentLength: finalContent.length,
        originalLength: parsedContent.content.length,
        truncated: parsedContent.content.length > maxLength,
        extractedAt: new Date().toISOString()
      };
      
    } catch (error) {
      debug('Web content reading error:', error);
      
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error occurred while reading web page'
      };
    }
  }
});

export const summarizeWebPageTool = tool({
  description: 'Read a web page and provide a structured summary with key information extracted.',
  inputSchema: z.object({
    url: z.string().describe('The URL of the web page to read and summarize'),
    focusAreas: z.array(z.string()).optional().describe('Specific areas to focus on when summarizing (e.g., "pricing", "features", "contact info")'),
    maxContentLength: z.number().optional().default(5000).describe('Maximum length of content to analyze (default: 5000)')
  }),
  execute: async ({ url, focusAreas, maxContentLength = 5000 }) => {
    debug('Summarizing web page:', { url, focusAreas, maxContentLength });
    
    try {
      // First, read the web page content
      const contentResult = await readWebPageTool.execute({ 
        url, 
        maxLength: maxContentLength,
        timeout: 15000 
      });
      
      if (!contentResult.success) {
        return {
          success: false,
          url,
          error: `Failed to read web page: ${contentResult.error}`
        };
      }
      
      // Extract key information
      const summary = {
        url: contentResult.url,
        title: contentResult.title || 'Untitled Page',
        description: contentResult.description,
        wordCount: contentResult.wordCount,
        readingTime: contentResult.readingTime,
        contentType: contentResult.contentType,
        keyPoints: [] as string[],
        focusAreaFindings: {} as Record<string, string>,
        extractedAt: new Date().toISOString()
      };
      
      // Basic key point extraction (simple approach)
      const content = contentResult.content;
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 50);
      
      // Take first few sentences as key points
      summary.keyPoints = sentences.slice(0, 5).map(s => s.trim());
      
      // Look for focus areas if specified
      if (focusAreas && focusAreas.length > 0) {
        for (const area of focusAreas) {
          const areaRegex = new RegExp(`([^.!?]*${area}[^.!?]*[.!?])`, 'gi');
          const matches = content.match(areaRegex);
          if (matches && matches.length > 0) {
            summary.focusAreaFindings[area] = matches[0].trim();
          }
        }
      }
      
      return {
        success: true,
        ...summary,
        fullContent: contentResult.content,
        contentTruncated: contentResult.truncated
      };
      
    } catch (error) {
      debug('Web page summarization error:', error);
      
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error occurred while summarizing web page'
      };
    }
  }
});