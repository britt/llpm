import { describe, it, expect, beforeAll, beforeEach, mock } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureScreenshotTool } from './screenshotTools';

// Create mock for credential manager
const mockCredentialManager = {
  getJinaAPIKey: mock(() => Promise.resolve('test-jina-key'))
};

// Mock the credential manager module
mock.module('../utils/credentialManager', () => ({
  credentialManager: mockCredentialManager
}));

// Mock fs writeFile specifically for screenshot tool
const mockWriteFile = mock(() => Promise.resolve());

// Mock successful Jina.ai response
const MOCK_SUCCESS_RESPONSE = {
  code: 200,
  status: 'success',
  data: {
    url: 'https://example.com',
    screenshot_url: 'https://r.jina.ai/screenshots/abc123.png',
    title: 'Example Site',
    description: 'This is an example website'
  }
};

// Mock error response
const MOCK_ERROR_RESPONSE = {
  code: 400,
  status: 'error',
  message: 'Invalid URL provided'
};

describe('screenshotTools', () => {
  const mockFetch = mock();
  
  beforeAll(() => {
    // Mock fetch globally
    global.fetch = mockFetch;
  });

  describe('captureScreenshotTool', () => {
    beforeEach(() => {
      // Reset mocks before each test
      mockFetch.mockReset();
      mockCredentialManager.getJinaAPIKey.mockReset();
      
      // Setup default mock behavior for sequential calls
      // First call: Jina.ai API response
      // Second call: Image download
      mockFetch
        .mockResolvedValueOnce(new Response(
          JSON.stringify(MOCK_SUCCESS_RESPONSE),
          { 
            status: 200, 
            headers: { 'content-type': 'application/json' } 
          }
        ))
        .mockResolvedValueOnce(new Response(
          new ArrayBuffer(1024), // Mock image data
          { 
            status: 200,
            headers: { 'content-type': 'image/png' }
          }
        ));
    });

    it('should successfully capture screenshot with default options', async () => {
      // Mock API key availability
      mockCredentialManager.getJinaAPIKey.mockResolvedValue('test-jina-key');

      const result = await captureScreenshotTool.execute({
        url: 'https://example.com'
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://example.com');
      expect(result.screenshotUrl).toBe('https://r.jina.ai/screenshots/abc123.png');
      expect(result.localImagePath).toBeDefined();
      expect(result.localImagePath).toContain(tmpdir());
      expect(result.localImagePath).toMatch(/screenshot-\d+-\w+\.png$/);
      expect(result.title).toBe('Example Site');
      expect(result.description).toBe('This is an example website');
      expect(result.format).toBe('png');
      expect(result.fullPage).toBe(true);
      expect(result.dimensions).toEqual({ width: 1920, height: 1080 });
      expect(result.capturedAt).toBeDefined();
      
      // Verify that a local file path is returned
      expect(result.localImagePath).toContain('screenshot-');
    });

    it('should handle custom screenshot options', async () => {
      // Reset and setup specific mocks for this test
      mockFetch.mockReset();
      mockCredentialManager.getJinaAPIKey.mockResolvedValue('test-jina-key');
      mockFetch
        .mockResolvedValueOnce(new Response(
          JSON.stringify(MOCK_SUCCESS_RESPONSE),
          { status: 200, headers: { 'content-type': 'application/json' } }
        ))
        .mockResolvedValueOnce(new Response(
          new ArrayBuffer(2048), // Mock JPEG image data
          { status: 200, headers: { 'content-type': 'image/jpeg' } }
        ));

      const result = await captureScreenshotTool.execute({
        url: 'https://example.com',
        fullPage: false,
        format: 'jpeg',
        quality: 80,
        width: 1280,
        height: 720,
        waitForSelector: '#content',
        timeout: 20000
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe('jpeg');
      expect(result.quality).toBe(80);
      expect(result.fullPage).toBe(false);
      expect(result.dimensions).toEqual({ width: 1280, height: 720 });
      expect(result.waitForSelector).toBe('#content');
      expect(result.localImagePath).toBeDefined();
      expect(result.localImagePath).toMatch(/screenshot-\d+-\w+\.jpeg$/);

      // Verify the API was called with correct parameters
      const fetchCall = mockFetch.mock.calls[0];
      const urlWithParams = fetchCall[0] as string;
      expect(urlWithParams).toContain('full_page=false');
      expect(urlWithParams).toContain('format=jpeg');
      expect(urlWithParams).toContain('quality=80');
      expect(urlWithParams).toContain('width=1280');
      expect(urlWithParams).toContain('height=720');
      expect(urlWithParams).toContain('wait_for_selector=%23content');
      expect(urlWithParams).toContain('timeout=20000');
    });

    it('should normalize URLs by adding protocol', async () => {
      // Reset mocks for this test
      mockFetch.mockReset();
      mockCredentialManager.getJinaAPIKey.mockResolvedValue('test-jina-key');
      mockFetch
        .mockResolvedValueOnce(new Response(
          JSON.stringify(MOCK_SUCCESS_RESPONSE),
          { status: 200, headers: { 'content-type': 'application/json' } }
        ))
        .mockResolvedValueOnce(new Response(
          new ArrayBuffer(1024),
          { status: 200, headers: { 'content-type': 'image/png' } }
        ));

      const result = await captureScreenshotTool.execute({
        url: 'example.com'
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://example.com');
    });

    it('should handle missing API key', async () => {
      mockCredentialManager.getJinaAPIKey.mockResolvedValue(undefined);

      const result = await captureScreenshotTool.execute({
        url: 'https://example.com'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Jina API key not configured');
    });

    it('should handle invalid URLs', async () => {
      mockCredentialManager.getJinaAPIKey.mockResolvedValue('test-jina-key');

      const result = await captureScreenshotTool.execute({
        url: 'not-a-valid-url with spaces and special chars!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should handle API errors', async () => {
      // Reset mocks for error test
      mockFetch.mockReset();
      mockCredentialManager.getJinaAPIKey.mockResolvedValue('test-jina-key');
      mockFetch.mockResolvedValue(new Response(
        JSON.stringify(MOCK_ERROR_RESPONSE),
        { 
          status: 400, 
          headers: { 'content-type': 'application/json' } 
        }
      ));

      const result = await captureScreenshotTool.execute({
        url: 'https://example.com'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Jina.ai API error 400');
    });

    it('should handle network errors', async () => {
      // Reset mocks for error test
      mockFetch.mockReset();
      mockCredentialManager.getJinaAPIKey.mockResolvedValue('test-jina-key');
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await captureScreenshotTool.execute({
        url: 'https://example.com'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle empty URL', async () => {
      mockCredentialManager.getJinaAPIKey.mockResolvedValue('test-jina-key');

      const result = await captureScreenshotTool.execute({
        url: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });

    it('should use correct authorization header', async () => {
      // Reset mocks for this test
      mockFetch.mockReset();
      mockCredentialManager.getJinaAPIKey.mockResolvedValue('test-api-key-123');
      mockFetch
        .mockResolvedValueOnce(new Response(
          JSON.stringify(MOCK_SUCCESS_RESPONSE),
          { status: 200, headers: { 'content-type': 'application/json' } }
        ))
        .mockResolvedValueOnce(new Response(
          new ArrayBuffer(1024),
          { status: 200, headers: { 'content-type': 'image/png' } }
        ));

      await captureScreenshotTool.execute({
        url: 'https://example.com'
      });

      const fetchCall = mockFetch.mock.calls[0];
      const options = fetchCall[1] as RequestInit;
      const headers = options.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-api-key-123');
      expect(headers['Accept']).toBe('application/json');
      expect(headers['User-Agent']).toContain('LLPM Screenshot Tool');
    });
  });
});