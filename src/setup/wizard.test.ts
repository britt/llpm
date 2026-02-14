import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all step modules
vi.mock('./steps/welcome', () => ({
  showWelcome: vi.fn(),
}));

vi.mock('./steps/apiKeys', () => ({
  setupApiKeys: vi.fn().mockResolvedValue({ success: true, configuredProviders: ['openai'] }),
}));

vi.mock('./steps/modelSelection', () => ({
  setupModelSelection: vi.fn().mockResolvedValue({ success: true, selectedModel: { modelId: 'gpt-4o' } }),
}));

vi.mock('./steps/githubToken', () => ({
  setupGithubToken: vi.fn().mockResolvedValue({ success: true, skipped: false }),
}));

vi.mock('./steps/arcadeKey', () => ({
  setupArcadeKey: vi.fn().mockResolvedValue({ success: true, skipped: false }),
}));

vi.mock('./steps/project', () => ({
  setupFirstProject: vi.fn().mockResolvedValue({ success: true, skipped: false, project: { name: 'Test' } }),
}));

vi.mock('./prompts', () => ({
  createReadlineInterface: vi.fn(() => ({
    question: vi.fn(),
    close: vi.fn(),
  })),
  closeReadlineInterface: vi.fn(),
}));

import { runSetupWizard } from './wizard';
import { showWelcome } from './steps/welcome';
import { setupApiKeys } from './steps/apiKeys';
import { setupModelSelection } from './steps/modelSelection';
import { setupGithubToken } from './steps/githubToken';
import { setupArcadeKey } from './steps/arcadeKey';
import { setupFirstProject } from './steps/project';
import { createReadlineInterface, closeReadlineInterface } from './prompts';

describe('wizard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(showWelcome).mockReturnValue(undefined);
    vi.mocked(setupApiKeys).mockResolvedValue({ success: true, configuredProviders: ['openai'] });
    vi.mocked(setupModelSelection).mockResolvedValue({ success: true, selectedModel: { modelId: 'gpt-4o', provider: 'openai', displayName: 'GPT-4o', description: '', family: '' } });
    vi.mocked(setupGithubToken).mockResolvedValue({ success: true, skipped: false });
    vi.mocked(setupArcadeKey).mockResolvedValue({ success: true, skipped: false });
    vi.mocked(setupFirstProject).mockResolvedValue({ success: true, skipped: false, project: { id: 'test-1', name: 'Test', repository: 'o/r', github_repo: 'o/r', path: '/tmp', createdAt: '', updatedAt: '' } });
    vi.mocked(createReadlineInterface).mockReturnValue({ question: vi.fn(), close: vi.fn() });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should run all steps in order', async () => {
    await runSetupWizard({ force: false });

    expect(showWelcome).toHaveBeenCalled();
    expect(setupApiKeys).toHaveBeenCalled();
    expect(setupModelSelection).toHaveBeenCalled();
    expect(setupGithubToken).toHaveBeenCalled();
    expect(setupArcadeKey).toHaveBeenCalled();
    expect(setupFirstProject).toHaveBeenCalled();
  });

  it('should pass force flag to all steps', async () => {
    await runSetupWizard({ force: true });

    expect(setupApiKeys).toHaveBeenCalledWith(expect.anything(), true);
    expect(setupGithubToken).toHaveBeenCalledWith(expect.anything(), true);
    expect(setupArcadeKey).toHaveBeenCalledWith(expect.anything(), true);
    expect(setupFirstProject).toHaveBeenCalledWith(expect.anything(), true);
  });

  it('should stop if API keys step fails', async () => {
    vi.mocked(setupApiKeys).mockResolvedValue({ success: false, configuredProviders: [] });

    await runSetupWizard({ force: false });

    expect(setupApiKeys).toHaveBeenCalled();
    expect(setupModelSelection).not.toHaveBeenCalled();
  });

  it('should stop if model selection fails', async () => {
    vi.mocked(setupModelSelection).mockResolvedValue({ success: false });

    await runSetupWizard({ force: false });

    expect(setupModelSelection).toHaveBeenCalled();
    expect(setupGithubToken).not.toHaveBeenCalled();
  });

  it('should continue if GitHub token is skipped', async () => {
    vi.mocked(setupGithubToken).mockResolvedValue({ success: true, skipped: true });

    await runSetupWizard({ force: false });

    expect(setupArcadeKey).toHaveBeenCalled();
    expect(setupFirstProject).toHaveBeenCalled();
  });

  it('should continue if Arcade key is skipped', async () => {
    vi.mocked(setupArcadeKey).mockResolvedValue({ success: true, skipped: true });

    await runSetupWizard({ force: false });

    expect(setupFirstProject).toHaveBeenCalled();
  });

  it('should close readline interface when done', async () => {
    await runSetupWizard({ force: false });

    expect(closeReadlineInterface).toHaveBeenCalled();
  });

  it('should close readline interface even on failure', async () => {
    vi.mocked(setupApiKeys).mockResolvedValue({ success: false, configuredProviders: [] });

    await runSetupWizard({ force: false });

    expect(closeReadlineInterface).toHaveBeenCalled();
  });

  it('should print summary after successful setup', async () => {
    await runSetupWizard({ force: false });

    const output = vi.mocked(console.log).mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Setup Complete');
  });

  it('should not tell user to run bun run start (process exits after setup)', async () => {
    await runSetupWizard({ force: false });

    const output = vi.mocked(console.log).mock.calls.map(c => c[0]).join('\n');
    expect(output).not.toContain('bun run start');
  });
});
