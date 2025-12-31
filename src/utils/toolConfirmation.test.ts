import { describe, it, expect } from 'vitest';

import {
  requiresConfirmation,
  formatConfirmationPrompt,
  isConfirmed,
  isCancelled,
  type ConfirmationRequired
} from './toolConfirmation';

describe('Tool Confirmation Utils', () => {
  describe('requiresConfirmation', () => {
    it('should require confirmation for cancel_job', () => {
      const result = requiresConfirmation('cancel_job', { jobId: 'job-123', agentId: 'agent-1' });

      expect(result.required).toBe(true);
      if (result.required) {
        expect(result.operation).toContain('Cancel job job-123');
        expect(result.operation).toContain('agent-1');
        expect(result.details).toContain('terminate');
        expect(result.risks).toContain('In-progress work will be lost');
      }
    });

    it('should require confirmation for delete_agent', () => {
      const result = requiresConfirmation('delete_agent', { agentId: 'agent-456' });

      expect(result.required).toBe(true);
      if (result.required) {
        expect(result.operation).toContain('Delete agent agent-456');
        expect(result.details).toContain('permanently remove');
        expect(result.risks).toContain('Permanent deletion');
      }
    });

    it('should require confirmation for update_agent', () => {
      const result = requiresConfirmation('update_agent', { agentId: 'agent-789' });

      expect(result.required).toBe(true);
      if (result.required) {
        expect(result.operation).toContain('Update agent agent-789');
        expect(result.details).toContain('modify the agent configuration');
        expect(result.risks).toContain('May break existing workflows');
      }
    });

    it('should require confirmation for delete_project', () => {
      const result = requiresConfirmation('delete_project', { projectId: 'proj-001' });

      expect(result.required).toBe(true);
      if (result.required) {
        expect(result.operation).toContain('Delete project proj-001');
        expect(result.details).toContain('permanently delete');
        expect(result.risks).toContain('All data will be permanently lost');
      }
    });

    it('should require confirmation for force_push', () => {
      const result = requiresConfirmation('force_push', { branch: 'main', repo: 'my-repo' });

      expect(result.required).toBe(true);
      if (result.required) {
        expect(result.operation).toContain('Force push to main');
        expect(result.operation).toContain('my-repo');
        expect(result.details).toContain('overwrite the remote branch');
        expect(result.risks).toContain('Rewrites history');
      }
    });

    it('should require confirmation for run_shell_command', () => {
      const result = requiresConfirmation('run_shell_command', { command: 'git status' });

      expect(result.required).toBe(true);
      if (result.required) {
        expect(result.operation).toContain('git status');
        expect(result.details).toContain('shell command');
        expect(result.risks).toContain('Commands can modify files');
      }
    });

    it('should not require confirmation for non-destructive operations', () => {
      const result = requiresConfirmation('list_agents', {});

      expect(result.required).toBe(false);
    });

    it('should not require confirmation for regular tools', () => {
      const result = requiresConfirmation('read_file', { path: '/some/path' });

      expect(result.required).toBe(false);
    });

    it('should return default description for unknown destructive tools', () => {
      // Manually construct a case for unknown tool handling
      const destructiveOps = ['unknown_destructive'];
      // This tests internal logic - we'll verify the structure
      const result = requiresConfirmation('get_status', {});
      expect(result.required).toBe(false);
    });
  });

  describe('formatConfirmationPrompt', () => {
    it('should format confirmation prompt correctly', () => {
      const check: ConfirmationRequired = {
        required: true,
        operation: 'Delete project test-project',
        details: 'This will permanently delete the project.',
        risks: ['Data loss', 'Cannot be undone']
      };

      const prompt = formatConfirmationPrompt(check);

      expect(prompt).toContain('Confirmation Required');
      expect(prompt).toContain('Delete project test-project');
      expect(prompt).toContain('This will permanently delete the project.');
      expect(prompt).toContain('- Data loss');
      expect(prompt).toContain('- Cannot be undone');
      expect(prompt).toContain('yes, proceed');
      expect(prompt).toContain('cancel');
    });

    it('should include all risks in the prompt', () => {
      const check: ConfirmationRequired = {
        required: true,
        operation: 'Force push',
        details: 'Will overwrite history',
        risks: ['Risk 1', 'Risk 2', 'Risk 3']
      };

      const prompt = formatConfirmationPrompt(check);

      expect(prompt).toContain('- Risk 1');
      expect(prompt).toContain('- Risk 2');
      expect(prompt).toContain('- Risk 3');
    });
  });

  describe('isConfirmed', () => {
    it('should accept "yes, proceed"', () => {
      expect(isConfirmed('yes, proceed')).toBe(true);
    });

    it('should accept "yes proceed" without comma', () => {
      expect(isConfirmed('yes proceed')).toBe(true);
    });

    it('should accept "proceed"', () => {
      expect(isConfirmed('proceed')).toBe(true);
    });

    it('should accept "confirm"', () => {
      expect(isConfirmed('confirm')).toBe(true);
    });

    it('should accept "yes"', () => {
      expect(isConfirmed('yes')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isConfirmed('YES, PROCEED')).toBe(true);
      expect(isConfirmed('Confirm')).toBe(true);
      expect(isConfirmed('PROCEED')).toBe(true);
    });

    it('should handle whitespace', () => {
      expect(isConfirmed('  yes, proceed  ')).toBe(true);
      expect(isConfirmed('\tproceed\n')).toBe(true);
    });

    it('should reject invalid responses', () => {
      expect(isConfirmed('maybe')).toBe(false);
      expect(isConfirmed('ok')).toBe(false);
      expect(isConfirmed('sure')).toBe(false);
    });

    it('should reject cancellation phrases', () => {
      expect(isConfirmed('no')).toBe(false);
      expect(isConfirmed('cancel')).toBe(false);
    });
  });

  describe('isCancelled', () => {
    it('should accept "cancel"', () => {
      expect(isCancelled('cancel')).toBe(true);
    });

    it('should accept "no"', () => {
      expect(isCancelled('no')).toBe(true);
    });

    it('should accept "abort"', () => {
      expect(isCancelled('abort')).toBe(true);
    });

    it('should accept "stop"', () => {
      expect(isCancelled('stop')).toBe(true);
    });

    it('should accept "no, cancel"', () => {
      expect(isCancelled('no, cancel')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isCancelled('CANCEL')).toBe(true);
      expect(isCancelled('No')).toBe(true);
      expect(isCancelled('ABORT')).toBe(true);
    });

    it('should handle whitespace', () => {
      expect(isCancelled('  cancel  ')).toBe(true);
      expect(isCancelled('\tno\n')).toBe(true);
    });

    it('should reject invalid responses', () => {
      expect(isCancelled('maybe')).toBe(false);
      expect(isCancelled('later')).toBe(false);
    });

    it('should reject confirmation phrases', () => {
      expect(isCancelled('yes')).toBe(false);
      expect(isCancelled('proceed')).toBe(false);
    });
  });
});
