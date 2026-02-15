import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing command
vi.mock('../utils/projectConfig', () => ({
  getCurrentProject: vi.fn(),
  loadProjectConfig: vi.fn(),
  removeProject: vi.fn()
}));
vi.mock('../services/notesBackend', () => ({
  getNotesBackend: vi.fn()
}));
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import { deleteCommand } from './delete';
import { getCurrentProject, loadProjectConfig, removeProject } from '../utils/projectConfig';
import { getNotesBackend } from '../services/notesBackend';

const mockBackend = {
  getNote: vi.fn(),
  deleteNote: vi.fn()
};

describe('Delete Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic properties', () => {
    it('should have correct name and description', () => {
      expect(deleteCommand.name).toBe('delete');
      expect(deleteCommand.description).toBeDefined();
    });
  });

  describe('Argument parsing errors', () => {
    it('should fail when no arguments provided', async () => {
      const result = await deleteCommand.execute([]);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
      expect(result.content).toContain('/delete');
      expect(result.content).toContain('note');
      expect(result.content).toContain('project');
    });

    it('should fail for unknown resource type', async () => {
      const result = await deleteCommand.execute(['banana', 'abc123']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unknown resource type');
      expect(result.content).toContain('banana');
      expect(result.content).toContain('note');
      expect(result.content).toContain('project');
    });

    it('should fail when identifier is missing', async () => {
      const result = await deleteCommand.execute(['note']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Missing identifier');
    });

    it('should fail when project identifier is missing', async () => {
      const result = await deleteCommand.execute(['project']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Missing identifier');
    });
  });

  describe('Help subcommand', () => {
    it('should show help text', async () => {
      const result = await deleteCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('/delete');
      expect(result.content).toContain('note');
      expect(result.content).toContain('project');
      expect(result.content).toContain('--force');
    });
  });

  describe('Delete note', () => {
    it('should show preview without --force', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({
        id: 'test-project', name: 'Test', path: '/test', repository: 'owner/repo', createdAt: '2024-01-01', updatedAt: '2024-01-01'
      });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.getNote.mockResolvedValue({
        id: 'note-1', title: 'Architecture Overview', content: 'Some content',
        tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01', source: 'user'
      });

      const result = await deleteCommand.execute(['note', 'note-1']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Architecture Overview');
      expect(result.content).toContain('note-1');
      expect(result.content).toContain('--force');
      expect(mockBackend.deleteNote).not.toHaveBeenCalled();
    });

    it('should delete note with --force flag', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({
        id: 'test-project', name: 'Test', path: '/test', repository: 'owner/repo', createdAt: '2024-01-01', updatedAt: '2024-01-01'
      });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.getNote.mockResolvedValue({
        id: 'note-1', title: 'Architecture Overview', content: 'Some content',
        tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01', source: 'user'
      });
      mockBackend.deleteNote.mockResolvedValue(true);

      const result = await deleteCommand.execute(['note', 'note-1', '--force']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Deleted note');
      expect(result.content).toContain('Architecture Overview');
      expect(mockBackend.deleteNote).toHaveBeenCalledWith('note-1');
    });

    it('should delete note with -f flag', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({
        id: 'test-project', name: 'Test', path: '/test', repository: 'owner/repo', createdAt: '2024-01-01', updatedAt: '2024-01-01'
      });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.getNote.mockResolvedValue({
        id: 'note-1', title: 'Architecture Overview', content: 'Some content',
        tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01', source: 'user'
      });
      mockBackend.deleteNote.mockResolvedValue(true);

      const result = await deleteCommand.execute(['note', 'note-1', '-f']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Deleted note');
      expect(mockBackend.deleteNote).toHaveBeenCalledWith('note-1');
    });

    it('should fail when note not found', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({
        id: 'test-project', name: 'Test', path: '/test', repository: 'owner/repo', createdAt: '2024-01-01', updatedAt: '2024-01-01'
      });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.getNote.mockResolvedValue(null);

      const result = await deleteCommand.execute(['note', 'nonexistent', '--force']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not found');
      expect(result.content).toContain('nonexistent');
    });

    it('should fail when no active project', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue(null);

      const result = await deleteCommand.execute(['note', 'note-1', '--force']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('No active project');
    });

    it('should handle --force flag before identifier', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({
        id: 'test-project', name: 'Test', path: '/test', repository: 'owner/repo', createdAt: '2024-01-01', updatedAt: '2024-01-01'
      });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.getNote.mockResolvedValue({
        id: 'note-1', title: 'Architecture Overview', content: 'Some content',
        tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01', source: 'user'
      });
      mockBackend.deleteNote.mockResolvedValue(true);

      const result = await deleteCommand.execute(['note', '--force', 'note-1']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Deleted note');
      expect(mockBackend.deleteNote).toHaveBeenCalledWith('note-1');
    });
  });

  describe('Delete project', () => {
    it('should show preview without --force', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({
        projects: {
          'proj-1': {
            id: 'proj-1', name: 'My App', path: '/app', repository: 'owner/repo', createdAt: '2024-01-01', updatedAt: '2024-01-01'
          }
        },
        currentProject: 'other-project'
      });

      const result = await deleteCommand.execute(['project', 'proj-1']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('My App');
      expect(result.content).toContain('proj-1');
      expect(result.content).toContain('--force');
      expect(removeProject).not.toHaveBeenCalled();
    });

    it('should delete project with --force flag', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({
        projects: {
          'proj-1': {
            id: 'proj-1', name: 'My App', path: '/app', repository: 'owner/repo', createdAt: '2024-01-01', updatedAt: '2024-01-01'
          }
        },
        currentProject: 'other-project'
      });

      const result = await deleteCommand.execute(['project', 'proj-1', '--force']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Deleted project');
      expect(result.content).toContain('My App');
      expect(removeProject).toHaveBeenCalledWith('proj-1');
    });

    it('should fail when project not found', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({
        projects: {},
        currentProject: undefined
      });

      const result = await deleteCommand.execute(['project', 'nonexistent', '--force']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not found');
      expect(result.content).toContain('nonexistent');
    });

    it('should fail when deleting active project', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({
        projects: {
          'active-proj': {
            id: 'active-proj', name: 'Active App', path: '/app', repository: 'owner/repo', createdAt: '2024-01-01', updatedAt: '2024-01-01'
          }
        },
        currentProject: 'active-proj'
      });

      const result = await deleteCommand.execute(['project', 'active-proj', '--force']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Cannot delete the active project');
      expect(result.content).toContain('/project switch');
      expect(removeProject).not.toHaveBeenCalled();
    });

    it('should delete project with -f flag', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({
        projects: {
          'proj-1': {
            id: 'proj-1', name: 'My App', path: '/app', repository: 'owner/repo', createdAt: '2024-01-01', updatedAt: '2024-01-01'
          }
        },
        currentProject: undefined
      });

      const result = await deleteCommand.execute(['project', 'proj-1', '-f']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Deleted project');
      expect(removeProject).toHaveBeenCalledWith('proj-1');
    });
  });
});
