import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { join } from 'path';
import type { RuleSet } from '../types/rules';
import { logger } from '../utils/logger';

export class RuleLoader {
  private rulesPath: string;
  private loadedRuleSets: Map<string, RuleSet>;

  constructor(rulesPath?: string) {
    // Default to docker/agents/rules directory
    this.rulesPath = rulesPath || join(__dirname, '../../../agents/rules');
    this.loadedRuleSets = new Map();
  }

  /**
   * Load a rule set from a YAML file
   */
  async loadRuleSet(filename: string): Promise<RuleSet | null> {
    const filePath = join(this.rulesPath, filename);

    if (!existsSync(filePath)) {
      logger.warn(`Rule set file not found: ${filePath}`);
      return null;
    }

    try {
      logger.info(`Loading rule set from: ${filePath}`);
      const content = await readFile(filePath, 'utf-8');
      const ruleSet = parseYaml(content) as RuleSet;

      // Validate basic structure
      if (!ruleSet.id || !ruleSet.rules || !Array.isArray(ruleSet.rules)) {
        logger.error(`Invalid rule set structure in: ${filePath}`);
        return null;
      }

      // Cache the loaded rule set
      this.loadedRuleSets.set(ruleSet.id, ruleSet);

      logger.info(`Loaded rule set: ${ruleSet.id} (${ruleSet.rules.length} rules)`);
      return ruleSet;
    } catch (error) {
      logger.error(`Failed to load rule set from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Load rule set for a specific agent type
   */
  async loadRuleSetForAgentType(agentType: string): Promise<RuleSet | null> {
    // Try to load <agentType>.rules.yaml
    const filename = `${agentType}.rules.yaml`;
    return await this.loadRuleSet(filename);
  }

  /**
   * Get a cached rule set by ID
   */
  getRuleSet(ruleSetId: string): RuleSet | null {
    return this.loadedRuleSets.get(ruleSetId) || null;
  }

  /**
   * Get all loaded rule sets
   */
  getAllRuleSets(): RuleSet[] {
    return Array.from(this.loadedRuleSets.values());
  }

  /**
   * Reload all rule sets
   */
  async reloadAll(): Promise<void> {
    this.loadedRuleSets.clear();

    // Load standard rule sets
    const standardRuleSets = ['coding', 'research', 'writing'];

    for (const ruleSetName of standardRuleSets) {
      await this.loadRuleSetForAgentType(ruleSetName);
    }
  }

  /**
   * Get enabled rules for a specific agent
   */
  getEnabledRules(ruleSetId: string): Rule[] {
    const ruleSet = this.getRuleSet(ruleSetId);
    if (!ruleSet) {
      return [];
    }

    return ruleSet.rules.filter(rule => rule.enabled);
  }

  /**
   * Get rules by scope
   */
  getRulesByScope(ruleSetId: string, scope: RuleScope): Rule[] {
    const rules = this.getEnabledRules(ruleSetId);
    return rules.filter(rule => rule.scope === scope);
  }

  /**
   * Find applicable rules for a file based on file patterns
   */
  getApplicableRules(ruleSetId: string, filePath: string, scope?: RuleScope): Rule[] {
    let rules = this.getEnabledRules(ruleSetId);

    // Filter by scope if specified
    if (scope) {
      rules = rules.filter(rule => rule.scope === scope);
    }

    // Filter by file patterns
    return rules.filter(rule => {
      if (!rule.conditions?.file_patterns) {
        return true; // No file pattern restriction
      }

      return rule.conditions.file_patterns.some(pattern => {
        // Simple glob matching (can be enhanced)
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filePath);
      });
    });
  }
}

// Import types at the end to avoid circular dependencies
import type { Rule, RuleScope } from '../types/rules';
