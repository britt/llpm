/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from 'vitest';
import { getSystemPrompt, getBaseSystemPrompt, getDefaultSystemPrompt } from './systemPrompt';
import { getCurrentProject } from './projectConfig';

describe('System Prompt Project Context Integration', () => {
  it('should generate system prompt with or without project context', async () => {
    const systemPrompt = await getSystemPrompt();
    const basePrompt = await getBaseSystemPrompt();
    const currentProject = await getCurrentProject();

    // Basic structure should always be present
    expect(systemPrompt).toContain('You are LLPM');
    expect(systemPrompt.length).toBeGreaterThan(1000); // Should be substantial

    if (currentProject) {
      // If there's an active project, context should be injected
      expect(systemPrompt).toContain('🎯 Current Active Project:');
      expect(systemPrompt).toContain(currentProject.name);
      expect(systemPrompt).toContain('Context Instructions:');
      expect(systemPrompt.length).toBeGreaterThan(basePrompt.length);

      // Verify project details are included
      expect(systemPrompt).toContain(`- **Name**: ${currentProject.name}`);
      expect(systemPrompt).toContain(`- **ID**: ${currentProject.id}`);

      if (currentProject.repository) {
        expect(systemPrompt).toContain('GitHub Repository');
      }

      if (currentProject.path) {
        expect(systemPrompt).toContain(`- **Local Path**: ${currentProject.path}`);
      }
    } else {
      // If no active project, should be same as base prompt
      expect(systemPrompt).toBe(basePrompt);
      expect(systemPrompt).not.toContain('🎯 Current Active Project:');
    }
  });

  it('should maintain core system prompt structure', async () => {
    const systemPrompt = await getSystemPrompt();
    const defaultPrompt = getDefaultSystemPrompt();

    // Core sections should always be present (check for either new or legacy format)
    const hasModernTools = systemPrompt.includes('## Available Tools');
    const hasLegacyTools = systemPrompt.includes('You have access to tools for:');
    expect(hasModernTools || hasLegacyTools).toBe(true);

    const hasModernGuidelines = systemPrompt.includes('## Response Guidelines');
    const hasLegacyGuidelines = systemPrompt.includes(
      'CRITICAL: You MUST ALWAYS provide a text response'
    );
    expect(hasModernGuidelines || hasLegacyGuidelines).toBe(true);

    // Should contain key capabilities (check for either new or legacy format)
    const hasModernCapabilities =
      systemPrompt.includes('Multi-Project Orchestration') &&
      systemPrompt.includes('GitHub Ecosystem Integration');
    const hasLegacyCapabilities =
      systemPrompt.includes('Project Management:') && systemPrompt.includes('GitHub Integration:');
    expect(hasModernCapabilities || hasLegacyCapabilities).toBe(true);

    // Should maintain LLPM identity
    expect(systemPrompt).toContain('Large Language Model Product Manager');
  });

  it('should handle URL formatting correctly', async () => {
    const systemPrompt = await getSystemPrompt();
    const currentProject = await getCurrentProject();

    if (currentProject && currentProject.repository) {
      // Should not have double https:// in URLs
      expect(systemPrompt).not.toContain('https://github.com/https://');

      // Should have properly formatted repository info
      if (systemPrompt.includes('Repository URL')) {
        expect(systemPrompt).toMatch(/Repository URL.*: https:\/\/github\.com\/[^/]+\/[^/\s]+/);
      }
    }
  });

  it('should position project context appropriately', async () => {
    const systemPrompt = await getSystemPrompt();
    const currentProject = await getCurrentProject();

    if (currentProject) {
      const lines = systemPrompt.split('\n');
      const projectIndex = lines.findIndex(line => line.includes('🎯 Current Active Project:'));
      const coreIndex = lines.findIndex(line => line.includes('## Core Context'));

      // Project context should come before Core Context
      expect(projectIndex).toBeGreaterThan(-1);
      if (coreIndex > -1) {
        expect(projectIndex).toBeLessThan(coreIndex);
      }
    }
  });
});
