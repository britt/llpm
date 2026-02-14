import { describe, it, expect } from 'vitest';
import { parseSkillFile } from '../utils/skillParser';
import { join } from 'path';

/**
 * Tests for the Project Planning skills collection (Issue #195).
 *
 * These are core skills that use existing tools to:
 * - Decompose projects into GitHub issues
 * - Generate Mermaid architecture diagrams
 * - Map issue dependencies
 * - Create Gantt chart timelines
 * - Orchestrate the full planning workflow
 */
describe('Project Planning Skills', () => {
  const skillsDir = join(__dirname, '../../skills');

  describe('issue-decomposition', () => {
    const skillPath = join(skillsDir, 'issue-decomposition');

    it('should parse with valid YAML frontmatter', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct name', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.name).toBe('issue-decomposition');
    });

    it('should have a description', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.description).toBeDefined();
      expect(result.skill?.description.length).toBeGreaterThan(0);
    });

    it('should declare allowed tools for issue creation', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.allowedTools).toBeDefined();
      expect(result.skill?.allowedTools).toContain('create_github_issue');
    });

    it('should have content with issue template format', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).toBeDefined();
      expect(result.skill?.content).toContain('User Story');
      expect(result.skill?.content).toContain('Acceptance Criteria');
    });
  });

  describe('architecture-diagramming', () => {
    const skillPath = join(skillsDir, 'architecture-diagramming');

    it('should parse with valid YAML frontmatter', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct name', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.name).toBe('architecture-diagramming');
    });

    it('should have a description', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.description).toBeDefined();
      expect(result.skill?.description.length).toBeGreaterThan(0);
    });

    it('should declare allowed tools for project analysis', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.allowedTools).toBeDefined();
      // Should include tools for reading project structure
      expect(result.skill?.allowedTools?.some(t =>
        t.includes('read_project_file') || t.includes('get_project_scan')
      )).toBe(true);
    });

    it('should have content with Mermaid flowchart examples', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).toBeDefined();
      expect(result.skill?.content).toContain('flowchart');
      expect(result.skill?.content).toContain('subgraph');
    });

    it('should reference mermaid syntax rules about parentheses', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      // Must include warning about parentheses in labels
      expect(result.skill?.content).toContain('parenthes');
    });
  });

  describe('dependency-mapping', () => {
    const skillPath = join(skillsDir, 'dependency-mapping');

    it('should parse with valid YAML frontmatter', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct name', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.name).toBe('dependency-mapping');
    });

    it('should have a description', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.description).toBeDefined();
      expect(result.skill?.description.length).toBeGreaterThan(0);
    });

    it('should declare allowed tools for issue listing', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.allowedTools).toBeDefined();
      expect(result.skill?.allowedTools).toContain('list_github_issues');
    });

    it('should have content with dependency graph examples', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).toBeDefined();
      expect(result.skill?.content).toContain('flowchart');
    });

    it('should explain issue node naming convention', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      // Should show how to name issue nodes like I201[#201 Title]
      expect(result.skill?.content).toMatch(/#\d+/);
    });
  });

  describe('timeline-planning', () => {
    const skillPath = join(skillsDir, 'timeline-planning');

    it('should parse with valid YAML frontmatter', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct name', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.name).toBe('timeline-planning');
    });

    it('should have a description', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.description).toBeDefined();
      expect(result.skill?.description.length).toBeGreaterThan(0);
    });

    it('should declare allowed tools for issue listing', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.allowedTools).toBeDefined();
      expect(result.skill?.allowedTools).toContain('list_github_issues');
    });

    it('should have content with Gantt chart examples', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).toBeDefined();
      expect(result.skill?.content).toContain('gantt');
    });

    it('should explain estimate-to-duration conversion', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      // Should have guidance on converting estimates to durations
      expect(result.skill?.content.toLowerCase()).toContain('estimate');
    });
  });

  describe('project-planning (orchestrator)', () => {
    const skillPath = join(skillsDir, 'project-planning');

    it('should parse with valid YAML frontmatter', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct name', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.name).toBe('project-planning');
    });

    it('should have a description mentioning orchestration', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.description).toBeDefined();
      expect(result.skill?.description.toLowerCase()).toMatch(/orchestrat|coordinat|comprehensive/);
    });

    it('should declare allowed tools including load_skills', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.allowedTools).toBeDefined();
      expect(result.skill?.allowedTools).toContain('load_skills');
      expect(result.skill?.allowedTools).toContain('create_github_issue');
      expect(result.skill?.allowedTools).toContain('add_note');
    });

    it('should reference sub-skills', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).toBeDefined();
      expect(result.skill?.content).toContain('issue-decomposition');
      expect(result.skill?.content).toContain('architecture-diagramming');
      expect(result.skill?.content).toContain('dependency-mapping');
      expect(result.skill?.content).toContain('timeline-planning');
    });

    it('should have content with planning workflow', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).toBeDefined();
      // Should describe the orchestration workflow
      expect(result.skill?.content.toLowerCase()).toContain('workflow');
    });

    it('should include planning document format', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      // Should describe the output planning document
      expect(result.skill?.content).toContain('docs/plans');
    });
  });
});
