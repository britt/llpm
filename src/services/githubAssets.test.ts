import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs promises
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    promises: {
      readFile: vi.fn(),
      stat: vi.fn()
    }
  };
});

// Mock credential manager
vi.mock('../utils/credentialManager', () => ({
  credentialManager: {
    getGitHubToken: vi.fn(() => Promise.resolve('test-token'))
  }
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { uploadFileToGitHub, uploadFilesToGitHub } from './githubAssets';
import { credentialManager } from '../utils/credentialManager';
import { promises as fs } from 'node:fs';

describe.skip('GitHub Assets Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFileToGitHub', () => {
    it('should upload image files to repository and return markdown', async () => {
      // Mock file operations
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('fake-image-data'));
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);
      
      // Mock GitHub API calls for repository upload
      mockFetch
        // Mock user info call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        // Mock repository check (exists)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: 'llpm-assets' })
        })
        // Mock file upload to repository
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: { path: 'images/123456789-screenshot.png' }
          })
        });

      const result = await uploadFileToGitHub('/path/to/screenshot.png');

      expect(result.url).toMatch(/https:\/\/raw\.githubusercontent\.com\/testuser\/llpm-assets\/main\/images\/\d+-screenshot\.png/);
      expect(result.markdown).toMatch(/!\[screenshot\.png\]\(https:\/\/raw\.githubusercontent\.com\/testuser\/llpm-assets\/main\/images\/\d+-screenshot\.png\)/);
    });

    it('should fallback to gist when repository upload fails', async () => {
      // Mock file operations
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('fake-image-data'));
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);
      
      // Mock GitHub API calls - repository upload fails
      mockFetch
        // Mock user info call (succeeds)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ login: 'testuser' })
        })
        // Mock repository check (fails)
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        })
        // Mock gist creation (fallback)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            files: {
              'screenshot.png': {
                raw_url: 'https://gist.githubusercontent.com/testuser/hash/raw/screenshot.png'
              }
            }
          })
        });

      const result = await uploadFileToGitHub('/path/to/screenshot.png');

      expect(result.url).toBe('https://gist.githubusercontent.com/testuser/hash/raw/screenshot.png');
      expect(result.markdown).toBe('![screenshot.png](https://gist.githubusercontent.com/testuser/hash/raw/screenshot.png)');
    });

    it('should upload non-image files with file link markdown', async () => {
      // Mock file operations
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('log file content'));
      vi.mocked(fs.stat).mockResolvedValue({ size: 2048 } as any);
      
      // Mock successful gist creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          files: {
            'error.log': {
              raw_url: 'https://gist.githubusercontent.com/user/hash/raw/error.log'
            }
          }
        })
      });

      const result = await uploadFileToGitHub('/path/to/error.log');

      expect(result.url).toBe('https://gist.githubusercontent.com/user/hash/raw/error.log');
      expect(result.markdown).toBe('[📎 error.log](https://gist.githubusercontent.com/user/hash/raw/error.log) (2KB)');
    });

    it('should handle upload failures gracefully', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('test'));
      vi.mocked(fs.stat).mockResolvedValue({ size: 100 } as any);
      
      // Mock failed gist creation
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      });

      await expect(uploadFileToGitHub('/path/to/file.txt')).rejects.toThrow('Failed to upload file');
    });

    it('should handle missing GitHub token', async () => {
      vi.mocked(credentialManager.getGitHubToken).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('test'));
      vi.mocked(fs.stat).mockResolvedValue({ size: 100 } as any);

      await expect(uploadFileToGitHub('/path/to/file.txt')).rejects.toThrow('GitHub token not available');
    });
  });

  describe('uploadFilesToGitHub', () => {
    it('should be a function that accepts file paths array', () => {
      expect(typeof uploadFilesToGitHub).toBe('function');
      expect(uploadFilesToGitHub.length).toBe(1); // expects 1 parameter
    });

    it('should handle multiple files', async () => {
      // Mock file operations
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('test content'));
      vi.mocked(fs.stat).mockResolvedValue({ size: 100 } as any);
      
      // Mock gist creation for both files
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          files: {
            'test.txt': {
              raw_url: 'https://gist.githubusercontent.com/user/hash/raw/test.txt'
            }
          }
        })
      });

      const results = await uploadFilesToGitHub(['/path/to/test.txt', '/path/to/test2.txt']);

      expect(results).toHaveLength(2);
      expect(results[0].filename).toBe('test.txt');
      expect(results[1].filename).toBe('test2.txt');
    });
  });
});