/**
 * Type definitions for agent rule system
 */

export type EnforcementLevel = 'warn' | 'enforce' | 'advisory';
export type RuleScope = 'commit' | 'workflow' | 'pr' | 'push' | 'precommit';
export type ValidationType = 'command' | 'regex' | 'api';

export interface RuleConditions {
  file_patterns?: string[];
  branch_patterns?: string[];
  confidence_threshold?: number;
}

export interface AutoFixConfig {
  enabled: boolean;
  command: string;
  requires_approval: boolean;
  timeout: number;
}

export interface ValidationConfig {
  type: ValidationType;
  command?: string;
  pattern?: string;
  endpoint?: string;
  success_code?: number;
}

export interface RuleMetadata {
  priority: number;
  tags: string[];
  docs_url?: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  enforcement: EnforcementLevel;
  scope: RuleScope;
  enabled: boolean;
  conditions?: RuleConditions;
  autofix?: AutoFixConfig;
  validation?: ValidationConfig;
  metadata: RuleMetadata;
}

export interface RuleSet {
  id: string;
  name: string;
  description: string;
  version: string;
  agent_types: string[];
  rules: Rule[];
}

export interface RuleViolation {
  rule_id: string;
  agent_id: string;
  timestamp: Date;
  enforcement_level: EnforcementLevel;
  scope: RuleScope;
  message: string;
  context?: Record<string, any>;
}

export interface RuleEnforcementResult {
  passed: boolean;
  violations: RuleViolation[];
  warnings: RuleViolation[];
  autofix_applied?: boolean;
  autofix_details?: string;
}

export interface RuleMetrics {
  agent_id: string;
  rule_id: string;
  violation_count: number;
  last_violation_timestamp?: Date;
  enforcement_outcomes: {
    accepted: number;
    warned: number;
    blocked: number;
  };
  check_latency_ms: number[];
  autofix_attempts: number;
  autofix_successes: number;
}
