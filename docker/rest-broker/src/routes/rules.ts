import { Router, Request, Response } from 'express';
import { RuleLoader } from '../services/RuleLoader';
import { RuleEnforcer } from '../services/RuleEnforcer';
import { RuleMetricsCollector } from '../services/RuleMetricsCollector';
import { logger } from '../utils/logger';

const router = Router();

// Initialize services
const ruleLoader = new RuleLoader();
const metricsCollector = new RuleMetricsCollector();
const ruleEnforcer = new RuleEnforcer(metricsCollector);

// Load standard rule sets on initialization
ruleLoader.reloadAll().catch(error => {
  logger.error('Failed to load initial rule sets:', error);
});

/**
 * GET /rules
 * List all loaded rule sets
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const ruleSets = ruleLoader.getAllRuleSets();
    res.json({
      success: true,
      count: ruleSets.length,
      rule_sets: ruleSets.map(rs => ({
        id: rs.id,
        name: rs.name,
        description: rs.description,
        version: rs.version,
        agent_types: rs.agent_types,
        rule_count: rs.rules.length
      }))
    });
  } catch (error) {
    logger.error('Error listing rule sets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list rule sets'
    });
  }
});

/**
 * GET /rules/:id
 * Get a specific rule set by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ruleSet = ruleLoader.getRuleSet(id);

    if (!ruleSet) {
      return res.status(404).json({
        success: false,
        error: `Rule set not found: ${id}`
      });
    }

    res.json({
      success: true,
      rule_set: ruleSet
    });
  } catch (error) {
    logger.error('Error getting rule set:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rule set'
    });
  }
});

/**
 * POST /rules/reload
 * Reload all rule sets from disk
 */
router.post('/reload', async (req: Request, res: Response) => {
  try {
    await ruleLoader.reloadAll();
    const ruleSets = ruleLoader.getAllRuleSets();

    res.json({
      success: true,
      message: 'Rule sets reloaded',
      count: ruleSets.length
    });
  } catch (error) {
    logger.error('Error reloading rule sets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reload rule sets'
    });
  }
});

/**
 * POST /rules/:id/enforce
 * Enforce rules for a specific action
 */
router.post('/:id/enforce', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agent_id, scope, context } = req.body;

    if (!agent_id) {
      return res.status(400).json({
        success: false,
        error: 'agent_id is required'
      });
    }

    const ruleSet = ruleLoader.getRuleSet(id);
    if (!ruleSet) {
      return res.status(404).json({
        success: false,
        error: `Rule set not found: ${id}`
      });
    }

    // Get rules for the specified scope (or all enabled rules)
    const rules = scope
      ? ruleLoader.getRulesByScope(id, scope)
      : ruleLoader.getEnabledRules(id);

    const result = await ruleEnforcer.enforceRules(agent_id, rules, context);

    res.json({
      success: result.passed,
      result
    });
  } catch (error) {
    logger.error('Error enforcing rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enforce rules'
    });
  }
});

/**
 * GET /rules/metrics
 * Get all rule metrics
 */
router.get('/metrics/all', async (req: Request, res: Response) => {
  try {
    const metrics = metricsCollector.getAllMetrics();

    res.json({
      success: true,
      count: metrics.length,
      metrics
    });
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

/**
 * GET /rules/metrics/agent/:agentId
 * Get metrics for a specific agent
 */
router.get('/metrics/agent/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const metrics = metricsCollector.getAgentMetrics(agentId);

    res.json({
      success: true,
      agent_id: agentId,
      count: metrics.length,
      metrics
    });
  } catch (error) {
    logger.error('Error getting agent metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent metrics'
    });
  }
});

/**
 * GET /rules/metrics/prometheus
 * Get metrics in Prometheus format
 */
router.get('/metrics/prometheus', async (req: Request, res: Response) => {
  try {
    const prometheusMetrics = metricsCollector.exportPrometheusMetrics();

    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
  } catch (error) {
    logger.error('Error exporting Prometheus metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export Prometheus metrics'
    });
  }
});

/**
 * POST /rules/metrics/reset
 * Reset all metrics
 */
router.post('/metrics/reset', async (req: Request, res: Response) => {
  try {
    metricsCollector.reset();

    res.json({
      success: true,
      message: 'Metrics reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics'
    });
  }
});

export { router as rulesRouter, ruleLoader, metricsCollector, ruleEnforcer };
