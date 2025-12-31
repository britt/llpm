import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveCurrentModel, loadCurrentModel, clearStoredModel } from './modelStorage';
import type { ModelConfig } from '../types/models';

// Mock projectConfig
vi.mock('./projectConfig', () => ({
  loadProjectConfig: vi.fn(),
  saveProjectConfig: vi.fn()
}));

// Mock logger
vi.mock('./logger', () => ({
  debug: vi.fn()
}));

import { loadProjectConfig, saveProjectConfig } from './projectConfig';

describe('modelStorage', () => {
  const mockModel: ModelConfig = {
    provider: 'openai',
    modelId: 'gpt-4o',
    displayName: 'GPT-4o',
    description: 'Latest OpenAI model'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('saveCurrentModel', () => {
    it('should save model to project config', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({});
      vi.mocked(saveProjectConfig).mockResolvedValue(undefined);

      await saveCurrentModel(mockModel);

      expect(loadProjectConfig).toHaveBeenCalled();
      expect(saveProjectConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({
            currentModel: mockModel,
            lastUpdated: expect.any(String)
          })
        })
      );
    });

    it('should preserve existing config when saving', async () => {
      const existingConfig = {
        someOtherSetting: 'value',
        anotherSetting: 123
      };
      vi.mocked(loadProjectConfig).mockResolvedValue(existingConfig);
      vi.mocked(saveProjectConfig).mockResolvedValue(undefined);

      await saveCurrentModel(mockModel);

      expect(saveProjectConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          someOtherSetting: 'value',
          anotherSetting: 123,
          model: expect.objectContaining({
            currentModel: mockModel
          })
        })
      );
    });

    it('should not throw on save error', async () => {
      vi.mocked(loadProjectConfig).mockRejectedValue(new Error('Save failed'));

      // Should not throw
      await expect(saveCurrentModel(mockModel)).resolves.not.toThrow();
    });
  });

  describe('loadCurrentModel', () => {
    it('should load model from project config', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({
        model: {
          currentModel: mockModel,
          lastUpdated: '2024-01-01T00:00:00Z'
        }
      });

      const result = await loadCurrentModel();

      expect(result).toEqual(mockModel);
    });

    it('should return null when no model is stored', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({});

      const result = await loadCurrentModel();

      expect(result).toBeNull();
    });

    it('should return null when model field exists but currentModel is missing', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({
        model: {
          lastUpdated: '2024-01-01T00:00:00Z'
        }
      });

      const result = await loadCurrentModel();

      expect(result).toBeNull();
    });

    it('should return null on load error', async () => {
      vi.mocked(loadProjectConfig).mockRejectedValue(new Error('Load failed'));

      const result = await loadCurrentModel();

      expect(result).toBeNull();
    });
  });

  describe('clearStoredModel', () => {
    it('should clear model from project config', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({
        model: {
          currentModel: mockModel,
          lastUpdated: '2024-01-01T00:00:00Z'
        },
        otherSetting: 'preserved'
      });
      vi.mocked(saveProjectConfig).mockResolvedValue(undefined);

      await clearStoredModel();

      expect(saveProjectConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          otherSetting: 'preserved',
          model: expect.objectContaining({
            lastUpdated: expect.any(String)
          })
        })
      );

      // Verify currentModel is not in the saved config
      const savedConfig = vi.mocked(saveProjectConfig).mock.calls[0]![0];
      expect(savedConfig.model.currentModel).toBeUndefined();
    });

    it('should not throw on clear error', async () => {
      vi.mocked(loadProjectConfig).mockRejectedValue(new Error('Clear failed'));

      // Should not throw
      await expect(clearStoredModel()).resolves.not.toThrow();
    });
  });
});
