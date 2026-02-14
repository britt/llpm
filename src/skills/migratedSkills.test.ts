import { describe, it, expect } from 'vitest';
import { parseSkillFile } from '../utils/skillParser';
import { join } from 'path';

/**
 * Tests for the 5 skills migrated from tools (Issue #221).
 *
 * These skills replace 26 specialized tools with primitive tool usage:
 * - requirement-elicitation (replaces 7 elicitation tools)
 * - context-aware-questions (replaces 4 question generation tools)
 * - stakeholder-tracking (replaces 9 stakeholder tools)
 * - at-risk-detection (replaces 3 risk detection tools)
 * - project-analysis (replaces 4 project analysis tools)
 */

const OLD_TOOL_NAMES = [
  'start_requirement_elicitation',
  'record_requirement_answer',
  'get_elicitation_state',
  'advance_elicitation_section',
  'skip_elicitation_section',
  'refine_requirement_section',
  'generate_requirements_document',
  'generate_project_questions',
  'generate_issue_questions',
  'suggest_clarifications',
  'identify_information_gaps',
  'add_stakeholder',
  'list_stakeholders',
  'get_stakeholder',
  'update_stakeholder',
  'remove_stakeholder',
  'link_issue_to_goal',
  'unlink_issue_from_goal',
  'generate_coverage_report',
  'resolve_stakeholder_conflict',
  'analyze_project_risks',
  'analyze_issue_risks',
  'get_at_risk_items',
  'analyze_project_full',
  'get_project_architecture',
  'get_project_key_files',
  'get_project_dependencies',
];

describe('Migrated Skills (Issue #221)', () => {
  const skillsDir = join(__dirname, '../../skills');

  describe('requirement-elicitation', () => {
    const skillPath = join(skillsDir, 'requirement-elicitation');

    it('should parse with valid YAML frontmatter', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct name', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.name).toBe('requirement-elicitation');
    });

    it('should have a description', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.description).toBeDefined();
      expect(result.skill?.description.length).toBeGreaterThan(0);
    });

    it('should declare primitive tools only', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.allowedTools).toBeDefined();
      expect(result.skill?.allowedTools).toContain('add_note');
      expect(result.skill?.allowedTools).toContain('ask_user');
      expect(result.skill?.allowedTools).toContain('search_notes');
    });

    it('should not reference old tool names in allowed tools', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      for (const oldTool of OLD_TOOL_NAMES) {
        expect(result.skill?.allowedTools).not.toContain(oldTool);
      }
    });

    it('should not reference old tool names in content', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).not.toContain('start_requirement_elicitation');
      expect(result.skill?.content).not.toContain('record_requirement_answer');
      expect(result.skill?.content).not.toContain('get_elicitation_state');
    });
  });

  describe('context-aware-questions', () => {
    const skillPath = join(skillsDir, 'context-aware-questions');

    it('should parse with valid YAML frontmatter', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct name', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.name).toBe('context-aware-questions');
    });

    it('should have a description', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.description).toBeDefined();
      expect(result.skill?.description.length).toBeGreaterThan(0);
    });

    it('should declare primitive tools only', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.allowedTools).toBeDefined();
      expect(result.skill?.allowedTools).toContain('list_github_issues');
      expect(result.skill?.allowedTools).toContain('get_github_issue_with_comments');
      expect(result.skill?.allowedTools).toContain('read_project_file');
      expect(result.skill?.allowedTools).toContain('get_project_scan');
    });

    it('should not reference old tool names in allowed tools', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      for (const oldTool of OLD_TOOL_NAMES) {
        expect(result.skill?.allowedTools).not.toContain(oldTool);
      }
    });

    it('should not reference old tool names in content', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).not.toContain('generate_project_questions');
      expect(result.skill?.content).not.toContain('generate_issue_questions');
      expect(result.skill?.content).not.toContain('suggest_clarifications');
      expect(result.skill?.content).not.toContain('identify_information_gaps');
    });
  });

  describe('stakeholder-tracking', () => {
    const skillPath = join(skillsDir, 'stakeholder-tracking');

    it('should parse with valid YAML frontmatter', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct name', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.name).toBe('stakeholder-tracking');
    });

    it('should have a description', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.description).toBeDefined();
      expect(result.skill?.description.length).toBeGreaterThan(0);
    });

    it('should declare note-based primitive tools', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.allowedTools).toBeDefined();
      expect(result.skill?.allowedTools).toContain('add_note');
      expect(result.skill?.allowedTools).toContain('update_note');
      expect(result.skill?.allowedTools).toContain('search_notes');
      expect(result.skill?.allowedTools).toContain('list_notes');
      expect(result.skill?.allowedTools).toContain('delete_note');
      expect(result.skill?.allowedTools).toContain('list_github_issues');
    });

    it('should not reference old tool names in allowed tools', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      for (const oldTool of OLD_TOOL_NAMES) {
        expect(result.skill?.allowedTools).not.toContain(oldTool);
      }
    });

    it('should describe stakeholder note format', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).toContain('type: stakeholder');
      expect(result.skill?.content).toContain('goals');
      expect(result.skill?.content).toContain('painPoints');
    });

    it('should not reference old stakeholder commands', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).not.toContain('/stakeholder add');
      expect(result.skill?.content).not.toContain('/stakeholder list');
      expect(result.skill?.content).not.toContain('/stakeholder remove');
      expect(result.skill?.content).not.toContain('/stakeholder coverage');
    });
  });

  describe('at-risk-detection', () => {
    const skillPath = join(skillsDir, 'at-risk-detection');

    it('should parse with valid YAML frontmatter', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct name', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.name).toBe('at-risk-detection');
    });

    it('should have a description', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.description).toBeDefined();
      expect(result.skill?.description.length).toBeGreaterThan(0);
    });

    it('should declare GitHub primitive tools only', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.allowedTools).toBeDefined();
      expect(result.skill?.allowedTools).toContain('list_github_issues');
      expect(result.skill?.allowedTools).toContain('get_github_issue_with_comments');
    });

    it('should not reference old tool names in allowed tools', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      for (const oldTool of OLD_TOOL_NAMES) {
        expect(result.skill?.allowedTools).not.toContain(oldTool);
      }
    });

    it('should not reference old tool names in content', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).not.toContain('analyze_project_risks');
      expect(result.skill?.content).not.toContain('analyze_issue_risks');
      expect(result.skill?.content).not.toContain('get_at_risk_items');
    });

    it('should describe risk detection heuristics', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).toContain('Stale');
      expect(result.skill?.content).toContain('Blocked');
      expect(result.skill?.content).toContain('Deadline');
      expect(result.skill?.content).toContain('Scope');
    });
  });

  describe('project-analysis', () => {
    const skillPath = join(skillsDir, 'project-analysis');

    it('should parse with valid YAML frontmatter', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct name', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.name).toBe('project-analysis');
    });

    it('should have a description', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.description).toBeDefined();
      expect(result.skill?.description.length).toBeGreaterThan(0);
    });

    it('should declare scan and filesystem primitive tools', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.allowedTools).toBeDefined();
      expect(result.skill?.allowedTools).toContain('scan_project');
      expect(result.skill?.allowedTools).toContain('get_project_scan');
      expect(result.skill?.allowedTools).toContain('read_project_file');
      expect(result.skill?.allowedTools).toContain('list_project_directory');
    });

    it('should not reference old tool names in allowed tools', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      for (const oldTool of OLD_TOOL_NAMES) {
        expect(result.skill?.allowedTools).not.toContain(oldTool);
      }
    });

    it('should describe analysis workflow', async () => {
      const result = await parseSkillFile(skillPath, 'user');

      expect(result.skill?.content).toContain('Architecture');
      expect(result.skill?.content).toContain('Dependencies');
      expect(result.skill?.content).toContain('Key Files');
    });
  });
});
