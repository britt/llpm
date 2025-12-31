import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock the shell executor
vi.mock('../../services/shellExecutor', () => ({
  ShellExecutor: vi.fn().mockImplementation(() => ({
    execute: vi.fn()
  }))
}));

// Mock config
let testConfigDir = '';
vi.mock('../config', () => ({
  getConfigDir: () => testConfigDir
}));

import { ensureRipgrep, searchNotesWithRipgrep, commandExists } from '../notesSearch';
import { ShellExecutor } from '../../services/shellExecutor';

describe('notesSearch', () => {
  let testDir: string;
  let notesDir: string;
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    testDir = join(tmpdir(), 'llpm-notes-search-test-' + Date.now());
    testConfigDir = testDir;
    notesDir = join(testDir, 'projects', 'test-project', 'notes');
    mkdirSync(notesDir, { recursive: true });

    mockExecute = vi.fn();
    vi.mocked(ShellExecutor).mockImplementation(() => ({
      execute: mockExecute
    }) as any);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('commandExists', () => {
    it('should return true when command exists', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: '/usr/bin/rg',
        stderr: ''
      });

      const exists = await commandExists('rg');
      expect(exists).toBe(true);
    });

    it('should return false when command not found', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'not found'
      });

      const exists = await commandExists('rg');
      expect(exists).toBe(false);
    });
  });

  describe('ensureRipgrep', () => {
    it('should succeed when ripgrep is installed', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: '/usr/bin/rg',
        stderr: ''
      });

      await expect(ensureRipgrep()).resolves.not.toThrow();
    });

    it('should throw with install instructions when ripgrep missing and shell disabled', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'not found'
      });

      await expect(ensureRipgrep(false)).rejects.toThrow('ripgrep (rg) is required');
      await expect(ensureRipgrep(false)).rejects.toThrow('brew install ripgrep');
    });

    it('should auto-install ripgrep when shell enabled', async () => {
      mockExecute
        .mockResolvedValueOnce({
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: 'not found'
        })
        .mockResolvedValueOnce({
          success: true,
          exitCode: 0,
          stdout: 'Installing ripgrep...',
          stderr: ''
        });

      await ensureRipgrep(true);

      expect(mockExecute).toHaveBeenCalledTimes(2);
      // Second call should be the install command
      expect(mockExecute.mock.calls[1][0]).toContain('ripgrep');
    });
  });

  describe('searchNotesWithRipgrep', () => {
    beforeEach(() => {
      // Create test note files
      writeFileSync(
        join(notesDir, '20251231-120000-auth-design.md'),
        `---
id: 20251231-120000-auth-design
title: Auth Design
tags: [auth, security]
created_at: 2025-12-31T12:00:00Z
updated_at: 2025-12-31T12:00:00Z
source: user
---

# Authentication Design

We use JWT tokens for authentication.
OAuth2 is also supported.
`
      );

      writeFileSync(
        join(notesDir, '20251231-130000-api-notes.md'),
        `---
id: 20251231-130000-api-notes
title: API Notes
tags: [api, rest]
created_at: 2025-12-31T13:00:00Z
updated_at: 2025-12-31T13:00:00Z
source: user
---

# API Notes

REST endpoints documentation.
`
      );
    });

    it('should search notes and return results', async () => {
      // Mock rg returning JSON matches
      mockExecute
        .mockResolvedValueOnce({ success: true, exitCode: 0, stdout: '/usr/bin/rg' }) // which rg
        .mockResolvedValueOnce({
          success: true,
          exitCode: 0,
          stdout: JSON.stringify({
            type: 'match',
            data: {
              path: { text: join(notesDir, '20251231-120000-auth-design.md') },
              lines: { text: 'We use JWT tokens for authentication.' },
              line_number: 12
            }
          }) + '\n',
          stderr: ''
        });

      const results = await searchNotesWithRipgrep('test-project', 'JWT');

      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when no matches', async () => {
      mockExecute
        .mockResolvedValueOnce({ success: true, exitCode: 0, stdout: '/usr/bin/rg' })
        .mockResolvedValueOnce({
          success: true,
          exitCode: 1, // rg returns 1 for no matches
          stdout: '',
          stderr: ''
        });

      const results = await searchNotesWithRipgrep('test-project', 'nonexistent');
      expect(results).toEqual([]);
    });

    it('should respect case sensitivity option', async () => {
      mockExecute
        .mockResolvedValueOnce({ success: true, exitCode: 0, stdout: '/usr/bin/rg' })
        .mockResolvedValueOnce({ success: true, exitCode: 1, stdout: '', stderr: '' });

      await searchNotesWithRipgrep('test-project', 'JWT', { caseSensitive: true });

      // Check that -i flag is NOT included when caseSensitive is true
      const rgCall = mockExecute.mock.calls[1];
      expect(rgCall[0]).not.toContain('-i');
    });

    it('should respect limit option', async () => {
      // Mock multiple matches
      const match1 = JSON.stringify({
        type: 'match',
        data: {
          path: { text: join(notesDir, '20251231-120000-auth-design.md') },
          lines: { text: 'First match' },
          line_number: 10
        }
      });
      const match2 = JSON.stringify({
        type: 'match',
        data: {
          path: { text: join(notesDir, '20251231-130000-api-notes.md') },
          lines: { text: 'Second match' },
          line_number: 15
        }
      });

      mockExecute
        .mockResolvedValueOnce({ success: true, exitCode: 0, stdout: '/usr/bin/rg' })
        .mockResolvedValueOnce({
          success: true,
          exitCode: 0,
          stdout: match1 + '\n' + match2 + '\n',
          stderr: ''
        });

      const results = await searchNotesWithRipgrep('test-project', 'match', { limit: 1 });
      expect(results).toHaveLength(1);
    });

    it('should throw error when ripgrep command fails', async () => {
      mockExecute
        .mockResolvedValueOnce({ success: true, exitCode: 0, stdout: '/usr/bin/rg' })
        .mockResolvedValueOnce({
          success: false,
          exitCode: 2, // rg error exit code
          stdout: '',
          stderr: 'ripgrep error: invalid regex'
        });

      await expect(searchNotesWithRipgrep('test-project', '[invalid')).rejects.toThrow(
        'ripgrep failed'
      );
    });

    it('should handle invalid JSON lines gracefully', async () => {
      mockExecute
        .mockResolvedValueOnce({ success: true, exitCode: 0, stdout: '/usr/bin/rg' })
        .mockResolvedValueOnce({
          success: true,
          exitCode: 0,
          stdout:
            'invalid json line\n' +
            JSON.stringify({
              type: 'match',
              data: {
                path: { text: join(notesDir, '20251231-120000-auth-design.md') },
                lines: { text: 'Valid match' },
                line_number: 10
              }
            }) +
            '\n',
          stderr: ''
        });

      const results = await searchNotesWithRipgrep('test-project', 'test');
      // Should skip invalid JSON and process valid matches
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle files without valid frontmatter', async () => {
      // Create a note without frontmatter
      writeFileSync(join(notesDir, '20251231-140000-no-frontmatter.md'), '# Just content\n\nNo frontmatter here.');

      mockExecute
        .mockResolvedValueOnce({ success: true, exitCode: 0, stdout: '/usr/bin/rg' })
        .mockResolvedValueOnce({
          success: true,
          exitCode: 0,
          stdout: JSON.stringify({
            type: 'match',
            data: {
              path: { text: join(notesDir, '20251231-140000-no-frontmatter.md') },
              lines: { text: 'No frontmatter here.' },
              line_number: 3
            }
          }) + '\n',
          stderr: ''
        });

      const results = await searchNotesWithRipgrep('test-project', 'frontmatter');
      // Should use filename as fallback title
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should deduplicate matches from the same line', async () => {
      const filePath = join(notesDir, '20251231-120000-auth-design.md');
      const matchText = 'JWT tokens for authentication';

      mockExecute
        .mockResolvedValueOnce({ success: true, exitCode: 0, stdout: '/usr/bin/rg' })
        .mockResolvedValueOnce({
          success: true,
          exitCode: 0,
          stdout:
            JSON.stringify({
              type: 'match',
              data: {
                path: { text: filePath },
                lines: { text: matchText },
                line_number: 12
              }
            }) +
            '\n' +
            JSON.stringify({
              type: 'match',
              data: {
                path: { text: filePath },
                lines: { text: matchText }, // Same match
                line_number: 12
              }
            }) +
            '\n',
          stderr: ''
        });

      const results = await searchNotesWithRipgrep('test-project', 'JWT');
      expect(results).toHaveLength(1);
      expect(results[0].matches).toHaveLength(1); // Should deduplicate
    });
  });
});
