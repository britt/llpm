import { describe, it, expect } from 'vitest';
import { getToolRegistry } from './registry';

describe('Tool Registry', () => {
  it('should include shell tools in registry', async () => {
    const registry = await getToolRegistry();
    expect(registry.run_shell_command).toBeDefined();
  });
});
