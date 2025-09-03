import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { uploadFileToGitHub, uploadFilesToGitHub } from './githubAssets';

// Mock fs promises
const mockFs = {
  readFile: mock(),
  stat: mock()
};
mock.module('node:fs', () => ({
  promises: mockFs
}));

// Mock credential manager
const mockCredentialManager = {
  getGitHubToken: mock(() => Promise.resolve('test-token'))
};
mock.module('../utils/credentialManager', () => ({
  credentialManager: mockCredentialManager
}));

// Mock fetch
const mockFetch = mock();
(global as any).fetch = mockFetch;

describe('GitHub Assets Upload', () => {
  beforeEach(() => {
    mockFs.readFile.mockClear();
    mockFs.stat.mockClear();
    mockCredentialManager.getGitHubToken.mockClear();
    mockFetch.mockClear();
  });

  describe('uploadFileToGitHub', () => {
    it('should upload image files to repository and return markdown', async () => {
      // Mock file operations
      mockFs.readFile.mockResolvedValue(Buffer.from('fake-image-data'));
      mockFs.stat.mockResolvedValue({ size: 1024 });
      
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
      mockFs.readFile.mockResolvedValue(Buffer.from('fake-image-data'));
      mockFs.stat.mockResolvedValue({ size: 1024 });
      
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
      mockFs.readFile.mockResolvedValue(Buffer.from('log file content'));
      mockFs.stat.mockResolvedValue({ size: 2048 });
      
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
      mockFs.readFile.mockResolvedValue(Buffer.from('test'));
      mockFs.stat.mockResolvedValue({ size: 100 });
      
      // Mock failed gist creation
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      });

      await expect(uploadFileToGitHub('/path/to/file.txt')).rejects.toThrow('Failed to upload file');
    });

    it('should handle missing GitHub token', async () => {
      mockCredentialManager.getGitHubToken.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(Buffer.from('test'));
      mockFs.stat.mockResolvedValue({ size: 100 });

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
      mockFs.readFile.mockResolvedValue(Buffer.from('test content'));
      mockFs.stat.mockResolvedValue({ size: 100 });
      
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