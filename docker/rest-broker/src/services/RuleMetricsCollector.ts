import type { RuleMetrics, EnforcementLevel } from '../types/rules';
import { logger } from '../utils/logger';

export class RuleMetricsCollector {
  private metrics: Map<string, RuleMetrics>;

  constructor() {
    this.metrics = new Map();
  }

  /**
   * Get or create metrics for an agent-rule pair
   */
  private getOrCreateMetrics(agentId: string, ruleId: string): RuleMetrics {
    const key = `${agentId}:${ruleId}`;
    let metrics = this.metrics.get(key);

    if (!metrics) {
      metrics = {
        agent_id: agentId,
        rule_id: ruleId,
        violation_count: 0,
        enforcement_outcomes: {
          accepted: 0,
          warned: 0,
          blocked: 0
        },
        check_latency_ms: [],
        autofix_attempts: 0,
        autofix_successes: 0
      };
      this.metrics.set(key, metrics);
    }

    return metrics;
  }

  /**
   * Record a rule violation
   */
  recordViolation(agentId: string, ruleId: string, enforcementLevel: EnforcementLevel): void {
    const metrics = this.getOrCreateMetrics(agentId, ruleId);

    metrics.violation_count++;
    metrics.last_violation_timestamp = new Date();

    if (enforcementLevel === 'enforce') {
      metrics.enforcement_outcomes.blocked++;
    } else if (enforcementLevel === 'warn') {
      metrics.enforcement_outcomes.warned++;
    }

    logger.debug(`Recorded violation for ${agentId}:${ruleId}`, {
      total_violations: metrics.violation_count,
      enforcement_level: enforcementLevel
    });
  }

  /**
   * Record a rule acceptance (passed)
   */
  recordAcceptance(agentId: string, ruleId: string): void {
    const metrics = this.getOrCreateMetrics(agentId, ruleId);
    metrics.enforcement_outcomes.accepted++;
  }

  /**
   * Record rule check latency
   */
  recordCheckLatency(agentId: string, ruleId: string, latencyMs: number): void {
    const metrics = this.getOrCreateMetrics(agentId, ruleId);

    metrics.check_latency_ms.push(latencyMs);

    // Keep only last 100 latency measurements
    if (metrics.check_latency_ms.length > 100) {
      metrics.check_latency_ms.shift();
    }
  }

  /**
   * Record an autofix attempt
   */
  recordAutoFixAttempt(agentId: string, ruleId: string): void {
    const metrics = this.getOrCreateMetrics(agentId, ruleId);
    metrics.autofix_attempts++;
  }

  /**
   * Record a successful autofix
   */
  recordAutoFixSuccess(agentId: string, ruleId: string): void {
    const metrics = this.getOrCreateMetrics(agentId, ruleId);
    metrics.autofix_attempts++;
    metrics.autofix_successes++;
  }

  /**
   * Get metrics for a specific agent-rule pair
   */
  getMetrics(agentId: string, ruleId: string): RuleMetrics | undefined {
    const key = `${agentId}:${ruleId}`;
    return this.metrics.get(key);
  }

  /**
   * Get all metrics for an agent
   */
  getAgentMetrics(agentId: string): RuleMetrics[] {
    const agentMetrics: RuleMetrics[] = [];

    for (const [key, metrics] of this.metrics.entries()) {
      if (key.startsWith(`${agentId}:`)) {
        agentMetrics.push(metrics);
      }
    }

    return agentMetrics;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): RuleMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Calculate average latency for a rule
   */
  getAverageLatency(agentId: string, ruleId: string): number {
    const metrics = this.getMetrics(agentId, ruleId);

    if (!metrics || metrics.check_latency_ms.length === 0) {
      return 0;
    }

    const sum = metrics.check_latency_ms.reduce((a, b) => a + b, 0);
    return sum / metrics.check_latency_ms.length;
  }

  /**
   * Calculate autofix success rate
   */
  getAutoFixSuccessRate(agentId: string, ruleId: string): number {
    const metrics = this.getMetrics(agentId, ruleId);

    if (!metrics || metrics.autofix_attempts === 0) {
      return 0;
    }

    return (metrics.autofix_successes / metrics.autofix_attempts) * 100;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    let output = '';

    // Violation count metric
    output += '# HELP rule_violation_count Total number of rule violations\n';
    output += '# TYPE rule_violation_count counter\n';

    for (const metrics of this.getAllMetrics()) {
      output += `rule_violation_count{agent="${metrics.agent_id}",rule="${metrics.rule_id}"} ${metrics.violation_count}\n`;
    }

    // Last violation timestamp
    output += '# HELP rule_violation_last_timestamp Timestamp of last violation (Unix time)\n';
    output += '# TYPE rule_violation_last_timestamp gauge\n';

    for (const metrics of this.getAllMetrics()) {
      if (metrics.last_violation_timestamp) {
        const timestamp = Math.floor(metrics.last_violation_timestamp.getTime() / 1000);
        output += `rule_violation_last_timestamp{agent="${metrics.agent_id}",rule="${metrics.rule_id}"} ${timestamp}\n`;
      }
    }

    // Enforcement outcomes
    output += '# HELP rule_enforcement_outcome Total enforcement outcomes by type\n';
    output += '# TYPE rule_enforcement_outcome counter\n';

    for (const metrics of this.getAllMetrics()) {
      output += `rule_enforcement_outcome{agent="${metrics.agent_id}",rule="${metrics.rule_id}",outcome="accepted"} ${metrics.enforcement_outcomes.accepted}\n`;
      output += `rule_enforcement_outcome{agent="${metrics.agent_id}",rule="${metrics.rule_id}",outcome="warned"} ${metrics.enforcement_outcomes.warned}\n`;
      output += `rule_enforcement_outcome{agent="${metrics.agent_id}",rule="${metrics.rule_id}",outcome="blocked"} ${metrics.enforcement_outcomes.blocked}\n`;
    }

    // Average latency
    output += '# HELP rule_check_latency_avg_ms Average rule check latency in milliseconds\n';
    output += '# TYPE rule_check_latency_avg_ms gauge\n';

    for (const metrics of this.getAllMetrics()) {
      const avgLatency = this.getAverageLatency(metrics.agent_id, metrics.rule_id);
      output += `rule_check_latency_avg_ms{agent="${metrics.agent_id}",rule="${metrics.rule_id}"} ${avgLatency.toFixed(2)}\n`;
    }

    // Autofix metrics
    output += '# HELP rule_autofix_success_rate Autofix success rate percentage\n';
    output += '# TYPE rule_autofix_success_rate gauge\n';

    for (const metrics of this.getAllMetrics()) {
      const successRate = this.getAutoFixSuccessRate(metrics.agent_id, metrics.rule_id);
      output += `rule_autofix_success_rate{agent="${metrics.agent_id}",rule="${metrics.rule_id}"} ${successRate.toFixed(2)}\n`;
    }

    return output;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    logger.info('Rule metrics reset');
  }
}
