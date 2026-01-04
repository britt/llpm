import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';

// Auto-mock fs modules
vi.mock('fs/promises');
vi.mock('fs');

// Mock dependencies
vi.mock('./projectAnalyzer', () => ({
  scanFiles: vi.fn(),
  detectLanguages: vi.fn(),
  detectFrameworks: vi.fn(),
  inferProjectType: vi.fn(),
  identifyKeyFiles: vi.fn(),
  analyzeDirectoryStructure: vi.fn(),
}));

vi.mock('./documentationAnalyzer', () => ({
  analyzeDocumentation: vi.fn(),
}));

vi.mock('./dependencyAnalyzer', () => ({
  analyzeDependencies: vi.fn(),
}));

vi.mock('./architectureAnalyzer', () => ({
  analyzeArchitecture: vi.fn(),
}));

vi.mock('./projectScanBackend', () => ({
  saveProjectScan: vi.fn(),
  loadProjectScan: vi.fn(),
  projectScanExists: vi.fn(),
}));

vi.mock('../utils/gitignore', () => ({
  createIgnoreFilter: vi.fn(),
}));

import {
  ProjectScanOrchestrator,
  type ScanOptions,
  type ScanProgress,
} from './projectScanOrchestrator';
import { scanFiles, detectLanguages, detectFrameworks, inferProjectType, identifyKeyFiles, analyzeDirectoryStructure } from './projectAnalyzer';
import { analyzeDocumentation } from './documentationAnalyzer';
import { analyzeDependencies } from './dependencyAnalyzer';
import { analyzeArchitecture } from './architectureAnalyzer';
import { saveProjectScan, loadProjectScan, projectScanExists } from './projectScanBackend';
import { createIgnoreFilter } from '../utils/gitignore';

describe('ProjectScanOrchestrator', () => {
  let orchestrator: ProjectScanOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    orchestrator = new ProjectScanOrchestrator();

    // Default mocks
    vi.mocked(createIgnoreFilter).mockResolvedValue(() => false);
    vi.mocked(scanFiles).mockResolvedValue([]);
    vi.mocked(detectLanguages).mockReturnValue(['TypeScript']);
    vi.mocked(detectFrameworks).mockReturnValue(['React']);
    vi.mocked(inferProjectType).mockReturnValue('web-app');
    vi.mocked(identifyKeyFiles).mockReturnValue([]);
    vi.mocked(analyzeDirectoryStructure).mockReturnValue([]);
    vi.mocked(analyzeDocumentation).mockResolvedValue({
      readmePath: null,
      readmeSummary: null,
      readmeContent: null,
      hasDocumentation: false,
      docFiles: [],
      coverage: { score: 0, level: 'poor', hasReadme: false, docFileCount: 0, commentRatio: 0 },
    });
    vi.mocked(analyzeDependencies).mockResolvedValue({
      packageManager: 'npm',
      runtime: [],
      development: [],
      peer: [],
      totalCount: 0,
    });
    vi.mocked(analyzeArchitecture).mockResolvedValue({
      description: '',
      components: [],
    });
    vi.mocked(saveProjectScan).mockResolvedValue(undefined);
    vi.mocked(loadProjectScan).mockResolvedValue(null);
    vi.mocked(projectScanExists).mockReturnValue(false);
    vi.mocked(fsPromises.readFile).mockResolvedValue('{}');
  });

  describe('performFullScan', () => {
    it('should perform a full project scan', async () => {
      const result = await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(result).toBeDefined();
      expect(result.projectId).toBe('test-project');
      expect(result.projectName).toBe('Test Project');
      expect(result.projectPath).toBe('/test/project');
    });

    it('should call all analyzers', async () => {
      await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(createIgnoreFilter).toHaveBeenCalled();
      expect(scanFiles).toHaveBeenCalled();
      expect(detectLanguages).toHaveBeenCalled();
      expect(detectFrameworks).toHaveBeenCalled();
      expect(analyzeDocumentation).toHaveBeenCalled();
      expect(analyzeDependencies).toHaveBeenCalled();
    });

    it('should skip architecture analysis when skipLLM is true', async () => {
      await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
        skipLLM: true,
      });

      expect(analyzeArchitecture).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        { skipLLM: true }
      );
    });

    it('should save the scan result', async () => {
      await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(saveProjectScan).toHaveBeenCalled();
    });

    it('should use cached scan when available and not forced', async () => {
      vi.mocked(projectScanExists).mockReturnValue(true);
      vi.mocked(loadProjectScan).mockResolvedValue({
        version: '1.0.0',
        scannedAt: new Date().toISOString(),
        projectId: 'test-project',
        projectName: 'Test Project',
        projectPath: '/test/project',
        overview: {
          summary: 'Cached summary',
          primaryLanguages: [],
          frameworks: [],
          projectType: 'web-app',
          totalFiles: 10,
          totalLines: 1000,
        },
        keyFiles: [],
        directoryStructure: [],
        documentation: {
          readmeSummary: null,
          hasDocumentation: false,
          docFiles: [],
        },
        dependencies: {
          packageManager: null,
          runtime: [],
          development: [],
        },
        architecture: {
          description: '',
          components: [],
        },
      });

      const result = await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(result.overview.summary).toBe('Cached summary');
      expect(scanFiles).not.toHaveBeenCalled();
    });

    it('should rescan when force is true', async () => {
      vi.mocked(projectScanExists).mockReturnValue(true);

      await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
        force: true,
      });

      expect(scanFiles).toHaveBeenCalled();
    });

    it('should include file statistics in overview', async () => {
      vi.mocked(scanFiles).mockResolvedValue([
        { path: 'src/index.ts', name: 'index.ts', extension: '.ts', lines: 100, size: 2000 } as any,
        { path: 'src/utils.ts', name: 'utils.ts', extension: '.ts', lines: 50, size: 1000 } as any,
      ]);

      const result = await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(result.overview.totalFiles).toBe(2);
      expect(result.overview.totalLines).toBe(150);
    });

    it('should include detected languages and frameworks', async () => {
      vi.mocked(detectLanguages).mockReturnValue(['TypeScript', 'JavaScript']);
      vi.mocked(detectFrameworks).mockReturnValue(['React', 'Express']);

      const result = await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(result.overview.primaryLanguages).toEqual(['TypeScript', 'JavaScript']);
      expect(result.overview.frameworks).toEqual(['React', 'Express']);
    });
  });

  describe('onProgress', () => {
    it('should call progress callback during scan', async () => {
      const progressCallback = vi.fn();
      orchestrator.onProgress(progressCallback);

      await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(progressCallback).toHaveBeenCalled();
      // Should be called for each phase
      expect(progressCallback.mock.calls.length).toBeGreaterThan(3);
    });

    it('should report phase names in progress', async () => {
      const phases: string[] = [];
      orchestrator.onProgress((progress) => {
        phases.push(progress.phase);
      });

      await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(phases).toContain('scanning');
      expect(phases).toContain('analyzing');
      expect(phases).toContain('documentation');
      expect(phases).toContain('dependencies');
    });

    it('should report progress percentage', async () => {
      const progressValues: number[] = [];
      orchestrator.onProgress((progress) => {
        progressValues.push(progress.progress);
      });

      await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      // Progress should increase
      expect(progressValues[progressValues.length - 1]).toBeGreaterThanOrEqual(
        progressValues[0]
      );
      // Should reach 100%
      expect(progressValues).toContain(100);
    });
  });

  describe('error handling', () => {
    it('should handle scan errors gracefully', async () => {
      vi.mocked(scanFiles).mockRejectedValue(new Error('Scan failed'));

      await expect(
        orchestrator.performFullScan({
          projectPath: '/test/project',
          projectId: 'test-project',
          projectName: 'Test Project',
        })
      ).rejects.toThrow('Scan failed');
    });

    it('should continue if documentation analysis fails', async () => {
      vi.mocked(analyzeDocumentation).mockRejectedValue(new Error('Doc analysis failed'));

      // Should not throw - should continue with empty documentation
      const result = await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(result).toBeDefined();
      expect(result.documentation.hasDocumentation).toBe(false);
    });

    it('should continue if dependency analysis fails', async () => {
      vi.mocked(analyzeDependencies).mockRejectedValue(new Error('Dep analysis failed'));

      const result = await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(result).toBeDefined();
    });

    it('should continue if architecture analysis fails', async () => {
      vi.mocked(analyzeArchitecture).mockRejectedValue(new Error('Arch analysis failed'));

      const result = await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(result).toBeDefined();
      expect(result.architecture.description).toBe('');
    });
  });

  describe('configuration', () => {
    it('should respect maxFiles option', async () => {
      await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
        maxFiles: 1000,
      });

      expect(scanFiles).toHaveBeenCalledWith(
        '/test/project',
        expect.any(Function),
        1000,
        expect.any(Number)
      );
    });

    it('should use default maxFiles when not specified', async () => {
      await orchestrator.performFullScan({
        projectPath: '/test/project',
        projectId: 'test-project',
        projectName: 'Test Project',
      });

      expect(scanFiles).toHaveBeenCalledWith(
        '/test/project',
        expect.any(Function),
        5000, // Default
        expect.any(Number)
      );
    });
  });
});
