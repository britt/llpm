import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  Rule,
  RuleEnforcementResult,
  RuleViolation,
  EnforcementLevel,
  RuleScope
} from '../types/rules';
import { logger } from '../utils/logger';
import { RuleMetricsCollector } from './RuleMetricsCollector';

const execAsync = promisify(exec);

export class RuleEnforcer {
  private metricsCollector: RuleMetricsCollector;

  constructor(metricsCollector: RuleMetricsCollector) {
    this.metricsCollector = metricsCollector;
  }

  /**
   * Enforce a set of rules for an agent action
   */
  async enforceRules(
    agentId: string,
    rules: Rule[],
    context?: Record<string, any>
  ): Promise<RuleEnforcementResult> {
    const violations: RuleViolation[] = [];
    const warnings: RuleViolation[] = [];
    let autofixApplied = false;
    let autofixDetails: string | undefined;

    for (const rule of rules) {
      const startTime = Date.now();

      try {
        const result = await this.validateRule(agentId, rule, context);

        // Record latency
        const latency = Date.now() - startTime;
        this.metricsCollector.recordCheckLatency(agentId, rule.id, latency);

        if (!result.passed) {
          const violation: RuleViolation = {
            rule_id: rule.id,
            agent_id: agentId,
            timestamp: new Date(),
            enforcement_level: rule.enforcement,
            scope: rule.scope,
            message: result.message,
            context
          };

          // Record violation
          this.metricsCollector.recordViolation(agentId, rule.id, rule.enforcement);

          if (rule.enforcement === 'enforce') {
            violations.push(violation);
            logger.warn(`Rule violation (enforce): ${rule.id} for agent ${agentId}`, {
              message: result.message
            });
          } else if (rule.enforcement === 'warn') {
            warnings.push(violation);
            logger.info(`Rule violation (warn): ${rule.id} for agent ${agentId}`, {
              message: result.message
            });
          } else {
            // Advisory - just log
            logger.debug(`Rule advisory: ${rule.id} for agent ${agentId}`, {
              message: result.message
            });
          }

          // Attempt autofix if available and appropriate
          if (rule.autofix?.enabled && result.canAutoFix) {
            const fixResult = await this.attemptAutoFix(agentId, rule, context);
            if (fixResult.success) {
              autofixApplied = true;
              autofixDetails = fixResult.details;
              this.metricsCollector.recordAutoFixSuccess(agentId, rule.id);

              // Remove violation if autofix succeeded
              const index = violations.findIndex(v => v.rule_id === rule.id);
              if (index !== -1) {
                violations.splice(index, 1);
              }
            } else {
              this.metricsCollector.recordAutoFixAttempt(agentId, rule.id);
            }
          }
        } else {
          // Rule passed - record acceptance
          this.metricsCollector.recordAcceptance(agentId, rule.id);
        }
      } catch (error) {
        logger.error(`Error enforcing rule ${rule.id}:`, error);
        // Don't fail the entire enforcement - continue with other rules
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      autofix_applied: autofixApplied,
      autofix_details: autofixDetails
    };
  }

  /**
   * Validate a single rule
   */
  private async validateRule(
    agentId: string,
    rule: Rule,
    context?: Record<string, any>
  ): Promise<{ passed: boolean; message: string; canAutoFix: boolean }> {
    if (!rule.validation) {
      // No validation configured - assume pass
      return { passed: true, message: 'No validation configured', canAutoFix: false };
    }

    const { validation } = rule;

    switch (validation.type) {
      case 'command':
        return await this.validateCommand(rule, validation.command!, context);

      case 'regex':
        return this.validateRegex(rule, validation.pattern!, context);

      case 'api':
        return await this.validateApi(rule, validation.endpoint!, context);

      default:
        logger.warn(`Unknown validation type: ${validation.type}`);
        return { passed: true, message: 'Unknown validation type', canAutoFix: false };
    }
  }

  /**
   * Validate using command execution
   */
  private async validateCommand(
    rule: Rule,
    command: string,
    context?: Record<string, any>
  ): Promise<{ passed: boolean; message: string; canAutoFix: boolean }> {
    try {
      // Inject context variables into command
      const expandedCommand = this.expandCommandVariables(command, context);

      const { stdout, stderr } = await execAsync(expandedCommand, {
        timeout: 30000, // 30 second timeout
        env: {
          ...process.env,
          ...context
        }
      });

      const expectedCode = rule.validation?.success_code ?? 0;

      return {
        passed: true,
        message: stdout || 'Command executed successfully',
        canAutoFix: !!rule.autofix?.enabled
      };
    } catch (error: any) {
      const message = error.stderr || error.stdout || error.message;
      return {
        passed: false,
        message: `Command failed: ${message}`,
        canAutoFix: !!rule.autofix?.enabled
      };
    }
  }

  /**
   * Validate using regex pattern
   */
  private validateRegex(
    rule: Rule,
    pattern: string,
    context?: Record<string, any>
  ): { passed: boolean; message: string; canAutoFix: boolean } {
    const content = context?.content || context?.message || '';

    try {
      const regex = new RegExp(pattern);
      const passed = regex.test(content);

      return {
        passed,
        message: passed
          ? 'Pattern matched successfully'
          : `Content does not match required pattern: ${pattern}`,
        canAutoFix: false // Regex validation typically can't auto-fix
      };
    } catch (error: any) {
      return {
        passed: false,
        message: `Invalid regex pattern: ${error.message}`,
        canAutoFix: false
      };
    }
  }

  /**
   * Validate using API endpoint
   */
  private async validateApi(
    rule: Rule,
    endpoint: string,
    context?: Record<string, any>
  ): Promise<{ passed: boolean; message: string; canAutoFix: boolean }> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rule_id: rule.id,
          context
        })
      });

      const result = await response.json();

      return {
        passed: result.passed ?? response.ok,
        message: result.message || 'API validation completed',
        canAutoFix: result.canAutoFix ?? false
      };
    } catch (error: any) {
      return {
        passed: false,
        message: `API validation failed: ${error.message}`,
        canAutoFix: false
      };
    }
  }

  /**
   * Attempt to auto-fix a violation
   */
  private async attemptAutoFix(
    agentId: string,
    rule: Rule,
    context?: Record<string, any>
  ): Promise<{ success: boolean; details: string }> {
    if (!rule.autofix) {
      return { success: false, details: 'No autofix configured' };
    }

    logger.info(`Attempting autofix for rule ${rule.id} (agent: ${agentId})`);

    try {
      const expandedCommand = this.expandCommandVariables(rule.autofix.command, context);

      const { stdout, stderr } = await execAsync(expandedCommand, {
        timeout: (rule.autofix.timeout || 60) * 1000,
        env: {
          ...process.env,
          ...context
        }
      });

      return {
        success: true,
        details: stdout || 'Autofix applied successfully'
      };
    } catch (error: any) {
      logger.error(`Autofix failed for rule ${rule.id}:`, error);
      return {
        success: false,
        details: error.stderr || error.message
      };
    }
  }

  /**
   * Expand variables in commands
   */
  private expandCommandVariables(
    command: string,
    context?: Record<string, any>
  ): string {
    if (!context) {
      return command;
    }

    let expanded = command;
    for (const [key, value] of Object.entries(context)) {
      expanded = expanded.replace(new RegExp(`\\$${key}`, 'g'), String(value));
      expanded = expanded.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
    }

    return expanded;
  }
}
