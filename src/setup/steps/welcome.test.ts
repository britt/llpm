import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showWelcome } from './welcome';

describe('welcome step', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should print LLPM banner text', () => {
    showWelcome();

    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('LLPM');
  });

  it('should print setup description', () => {
    showWelcome();

    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('setup');
  });

  it('should mention AI provider configuration', () => {
    showWelcome();

    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('AI provider');
  });
});
