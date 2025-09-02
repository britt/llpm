import { tool } from 'ai';
import { z } from 'zod';
import { debug } from '../utils/logger';
import { credentialManager } from '../utils/credentialManager';

/**
 * Screenshot capture tools using Jina.ai API
 */

interface ScreenshotResponse {
  code: number;
  status: string;
  data: {
    url: string;
    screenshot_url: string;
    title?: string;
    description?: string;
    screenshot_base64?: string;
  };
}

/**
 * Validate and normalize URL for screenshot capture
 */
function normalizeUrl(url: string): string {
  try {
    if (!url || url.trim().length === 0) {
      throw new Error('URL cannot be empty');
    }
    
    url = url.trim();
    
    // Check for invalid characters
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
 * Capture screenshot using Jina.ai API
 */
async function captureScreenshot(
  url: string, 
  options: {
    waitForSelector?: string;
    fullPage?: boolean;
    format?: 'png' | 'jpeg';
    quality?: number;
    width?: number;
    height?: number;
    timeout?: number;
  } = {}
): Promise<ScreenshotResponse> {
  const jinaApiKey = await credentialManager.getJinaAPIKey();
  
  if (!jinaApiKey) {
    throw new Error('Jina API key not configured. Set JINA_API_KEY environment variable or configure via /credentials command.');
  }

  const {
    waitForSelector,
    fullPage = true,
    format = 'png',
    quality = 90,
    width = 1920,
    height = 1080,
    timeout = 30000
  } = options;

  const screenshotUrl = 'https://r.jina.ai';
  const params = new URLSearchParams({
    url: url,
    full_page: fullPage.toString(),
    format: format,
    quality: quality.toString(),
    width: width.toString(),
    height: height.toString(),
    timeout: timeout.toString()
  });

  if (waitForSelector) {
    params.append('wait_for_selector', waitForSelector);
  }

  debug('Capturing screenshot with Jina.ai:', { url, options });

  try {
    const response = await fetch(`${screenshotUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jinaApiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'LLPM Screenshot Tool/1.0 (https://github.com/britt/llpm)',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jina.ai API error ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const result: ScreenshotResponse = await response.json();
    
    debug('Screenshot captured successfully:', {
      url: result.data.url,
      screenshot_url: result.data.screenshot_url,
      title: result.data.title
    });

    return result;

  } catch (error) {
    debug('Screenshot capture error:', error);
    throw error instanceof Error ? error : new Error('Unknown error occurred during screenshot capture');
  }
}

export const captureScreenshotTool = tool({
  description: 'Capture a screenshot of a web page using Jina.ai API. Returns the screenshot URL and optional page metadata.',
  inputSchema: z.object({
    url: z.string().describe('The URL of the web page to capture a screenshot of'),
    waitForSelector: z.string().optional().describe('CSS selector to wait for before capturing (optional)'),
    fullPage: z.boolean().optional().default(true).describe('Whether to capture the full page or just the viewport (default: true)'),
    format: z.enum(['png', 'jpeg']).optional().default('png').describe('Image format for the screenshot (default: png)'),
    quality: z.number().min(1).max(100).optional().default(90).describe('Image quality for JPEG format (1-100, default: 90)'),
    width: z.number().optional().default(1920).describe('Viewport width in pixels (default: 1920)'),
    height: z.number().optional().default(1080).describe('Viewport height in pixels (default: 1080)'),
    timeout: z.number().optional().default(30000).describe('Maximum time to wait for page load in milliseconds (default: 30000)')
  }),
  execute: async ({ 
    url, 
    waitForSelector, 
    fullPage = true, 
    format = 'png', 
    quality = 90, 
    width = 1920, 
    height = 1080,
    timeout = 30000
  }) => {
    debug('Screenshot tool called:', { url, fullPage, format, quality, width, height });
    
    try {
      // Normalize and validate URL
      const normalizedUrl = normalizeUrl(url);
      
      // Capture screenshot
      const result = await captureScreenshot(normalizedUrl, {
        waitForSelector,
        fullPage,
        format,
        quality,
        width,
        height,
        timeout
      });
      
      return {
        success: true,
        url: result.data.url,
        screenshotUrl: result.data.screenshot_url,
        title: result.data.title,
        description: result.data.description,
        format,
        quality: format === 'jpeg' ? quality : undefined,
        dimensions: {
          width,
          height
        },
        fullPage,
        waitForSelector,
        capturedAt: new Date().toISOString()
      };
      
    } catch (error) {
      debug('Screenshot capture failed:', error);
      
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error occurred while capturing screenshot'
      };
    }
  }
});