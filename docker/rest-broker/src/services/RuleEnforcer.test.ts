import { RuleEnforcer } from './RuleEnforcer';
import { RuleMetricsCollector } from './RuleMetricsCollector';
import type { Rule } from '../types/rules';

describe('RuleEnforcer', () => {
  let enforcer: RuleEnforcer;
  let metricsCollector: RuleMetricsCollector;

  beforeEach(() => {
    metricsCollector = new RuleMetricsCollector();
    enforcer = new RuleEnforcer(metricsCollector);
  });

  describe('enforceRules', () => {
    it('should pass when all rules are satisfied', async () => {
      const rules: Rule[] = [
        {
          id: 'test_rule',
          name: 'Test Rule',
          description: 'A test rule',
          enforcement: 'warn',
          scope: 'commit',
          enabled: true,
          validation: {
            type: 'command',
            command: 'echo "success"',
            success_code: 0
          },
          metadata: {
            priority: 50,
            tags: ['test']
          }
        }
      ];

      const result = await enforcer.enforceRules('test-agent', rules);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should create warnings for warn-level violations', async () => {
      const rules: Rule[] = [
        {
          id: 'test_warn_rule',
          name: 'Test Warn Rule',
          description: 'A test rule that warns',
          enforcement: 'warn',
          scope: 'commit',
          enabled: true,
          validation: {
            type: 'command',
            command: 'exit 1',
            success_code: 0
          },
          metadata: {
            priority: 50,
            tags: ['test']
          }
        }
      ];

      const result = await enforcer.enforceRules('test-agent', rules);

      expect(result.passed).toBe(true); // Still passes with warnings
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].rule_id).toBe('test_warn_rule');
    });

    it('should fail on enforce-level violations', async () => {
      const rules: Rule[] = [
        {
          id: 'test_enforce_rule',
          name: 'Test Enforce Rule',
          description: 'A test rule that enforces',
          enforcement: 'enforce',
          scope: 'commit',
          enabled: true,
          validation: {
            type: 'command',
            command: 'exit 1',
            success_code: 0
          },
          metadata: {
            priority: 90,
            tags: ['test']
          }
        }
      ];

      const result = await enforcer.enforceRules('test-agent', rules);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule_id).toBe('test_enforce_rule');
      expect(result.violations[0].enforcement_level).toBe('enforce');
    });

    it('should validate regex patterns correctly', async () => {
      const rules: Rule[] = [
        {
          id: 'regex_rule',
          name: 'Regex Rule',
          description: 'Tests regex validation',
          enforcement: 'enforce',
          scope: 'commit',
          enabled: true,
          validation: {
            type: 'regex',
            pattern: '^feat\\(.*\\): .*'
          },
          metadata: {
            priority: 70,
            tags: ['test', 'commit-message']
          }
        }
      ];

      // Should pass with matching content
      const passResult = await enforcer.enforceRules('test-agent', rules, {
        content: 'feat(core): add new feature'
      });
      expect(passResult.passed).toBe(true);

      // Should fail with non-matching content
      const failResult = await enforcer.enforceRules('test-agent', rules, {
        content: 'just a commit message'
      });
      expect(failResult.passed).toBe(false);
    });

    it('should record metrics for violations', async () => {
      const rules: Rule[] = [
        {
          id: 'metrics_test_rule',
          name: 'Metrics Test Rule',
          description: 'Tests metrics recording',
          enforcement: 'enforce',
          scope: 'commit',
          enabled: true,
          validation: {
            type: 'command',
            command: 'exit 1'
          },
          metadata: {
            priority: 80,
            tags: ['test']
          }
        }
      ];

      await enforcer.enforceRules('test-agent', rules);

      const metrics = metricsCollector.getMetrics('test-agent', 'metrics_test_rule');
      expect(metrics).toBeDefined();
      expect(metrics!.violation_count).toBe(1);
      expect(metrics!.enforcement_outcomes.blocked).toBe(1);
    });

    it('should handle multiple rules with different enforcement levels', async () => {
      const rules: Rule[] = [
        {
          id: 'warn_rule',
          name: 'Warn Rule',
          description: 'Warning rule',
          enforcement: 'warn',
          scope: 'commit',
          enabled: true,
          validation: {
            type: 'command',
            command: 'exit 1'
          },
          metadata: {
            priority: 50,
            tags: ['test']
          }
        },
        {
          id: 'enforce_rule',
          name: 'Enforce Rule',
          description: 'Enforcement rule',
          enforcement: 'enforce',
          scope: 'commit',
          enabled: true,
          validation: {
            type: 'command',
            command: 'exit 1'
          },
          metadata: {
            priority: 90,
            tags: ['test']
          }
        }
      ];

      const result = await enforcer.enforceRules('test-agent', rules);

      expect(result.passed).toBe(false); // Fails due to enforce rule
      expect(result.warnings).toHaveLength(1);
      expect(result.violations).toHaveLength(1);
    });
  });
});
