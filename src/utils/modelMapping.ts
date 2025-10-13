/**
 * Model name normalization and mapping utilities
 *
 * Handles conversion between various model naming conventions:
 * - Anthropic snapshot IDs (e.g., claude-sonnet-4-5-20250929)
 * - Anthropic aliases (e.g., claude-sonnet-4-5, claude-sonnet-4)
 * - Vercel AI SDK format (e.g., anthropic/claude-sonnet-4.5)
 */

export interface ModelMapping {
  /** Canonical Anthropic API model ID (alias form) */
  canonical: string;
  /** Alternative names that map to this model (including snapshot IDs) */
  aliases: string[];
}

/**
 * Canonical mapping of Anthropic model names to their preferred alias form
 *
 * Uses aliases as canonical IDs for better usability and forward compatibility.
 * Snapshot IDs are supported as input but normalized to aliases.
 *
 * Based on:
 * - Anthropic Models Overview: https://docs.claude.com/en/docs/about-claude/models/overview
 * - Vercel AI Gateway: https://vercel.com/ai-gateway/models/claude-sonnet-4.5
 */
export const ANTHROPIC_MODEL_MAPPING: Record<string, ModelMapping> = {
  'claude-sonnet-4-5': {
    canonical: 'claude-sonnet-4-5',
    aliases: [
      'claude-sonnet-4.5',
      'anthropic/claude-sonnet-4.5',
      'anthropic/claude-sonnet-4-5',
      'claude-sonnet-4-5-20250929' // Snapshot ID
    ]
  },
  'claude-opus-4-1': {
    canonical: 'claude-opus-4-1',
    aliases: [
      'claude-opus-4.1',
      'anthropic/claude-opus-4.1',
      'anthropic/claude-opus-4-1',
      'claude-opus-4-1-20250805' // Snapshot ID
    ]
  },
  'claude-sonnet-4': {
    canonical: 'claude-sonnet-4',
    aliases: [
      'claude-sonnet-4-0',
      'claude-sonnet-4.0',
      'anthropic/claude-sonnet-4',
      'anthropic/claude-sonnet-4.0',
      'claude-sonnet-4-20250514' // Snapshot ID
    ]
  },
  'claude-opus-4': {
    canonical: 'claude-opus-4',
    aliases: [
      'claude-opus-4-0',
      'claude-opus-4.0',
      'anthropic/claude-opus-4',
      'anthropic/claude-opus-4.0',
      'claude-opus-4-20250514' // Snapshot ID
    ]
  },
  'claude-3-7-sonnet-latest': {
    canonical: 'claude-3-7-sonnet-latest',
    aliases: [
      'claude-3-7-sonnet',
      'anthropic/claude-3.7-sonnet',
      'anthropic/claude-3-7-sonnet',
      'claude-3-7-sonnet-20250219' // Snapshot ID
    ]
  },
  'claude-3-5-haiku-latest': {
    canonical: 'claude-3-5-haiku-latest',
    aliases: [
      'claude-3-5-haiku',
      'anthropic/claude-3.5-haiku',
      'anthropic/claude-3-5-haiku',
      'claude-3-5-haiku-20241022' // Snapshot ID
    ]
  },
  'claude-3-haiku': {
    canonical: 'claude-3-haiku',
    aliases: [
      'anthropic/claude-3-haiku',
      'claude-3-haiku-20240307' // Snapshot ID
    ]
  }
};

/**
 * Reverse mapping: alias -> canonical ID
 * Built from ANTHROPIC_MODEL_MAPPING for fast lookups
 */
const ALIAS_TO_CANONICAL = (() => {
  const map = new Map<string, string>();

  for (const [canonical, { aliases }] of Object.entries(ANTHROPIC_MODEL_MAPPING)) {
    // Add the canonical ID itself
    map.set(canonical.toLowerCase(), canonical);

    // Add all aliases
    for (const alias of aliases) {
      map.set(alias.toLowerCase(), canonical);
    }
  }

  return map;
})();

/**
 * Normalize an Anthropic model name to its canonical alias form
 *
 * Handles:
 * - Vercel AI SDK format (anthropic/claude-sonnet-4.5)
 * - Snapshot IDs (claude-sonnet-4-5-20250929)
 * - Alternative aliases (claude-sonnet-4.5 with dots)
 *
 * @param modelName - Input model name in any supported format
 * @returns Canonical Anthropic model ID (alias form), or original if no mapping found
 *
 * @example
 * normalizeAnthropicModel('anthropic/claude-sonnet-4.5')
 * // => 'claude-sonnet-4-5'
 *
 * normalizeAnthropicModel('claude-sonnet-4-5-20250929')
 * // => 'claude-sonnet-4-5'
 *
 * normalizeAnthropicModel('claude-sonnet-4-5')
 * // => 'claude-sonnet-4-5'
 */
export function normalizeAnthropicModel(modelName: string): string {
  // Normalize to lowercase and trim
  const normalized = modelName.toLowerCase().trim();

  // Strip 'anthropic/' prefix if present
  const withoutPrefix = normalized.startsWith('anthropic/')
    ? normalized.slice('anthropic/'.length)
    : normalized;

  // Look up in alias mapping
  const canonical = ALIAS_TO_CANONICAL.get(withoutPrefix);

  if (canonical) {
    return canonical;
  }

  // If no mapping found, return original (user might be using a new/unknown model)
  return modelName;
}

/**
 * Check if a model name is a valid Anthropic model (either canonical or alias)
 *
 * @param modelName - Model name to check
 * @returns true if recognized as Anthropic model
 */
export function isValidAnthropicModel(modelName: string): boolean {
  const normalized = modelName.toLowerCase().trim();
  const withoutPrefix = normalized.startsWith('anthropic/')
    ? normalized.slice('anthropic/'.length)
    : normalized;

  return ALIAS_TO_CANONICAL.has(withoutPrefix);
}

/**
 * Get all recognized aliases for a canonical model ID
 *
 * @param canonicalId - Canonical Anthropic model ID
 * @returns Array of aliases, or empty array if not found
 */
export function getModelAliases(canonicalId: string): string[] {
  const mapping = ANTHROPIC_MODEL_MAPPING[canonicalId];
  return mapping ? mapping.aliases : [];
}

/**
 * List all available Anthropic model IDs (canonical snapshot IDs)
 *
 * @returns Array of canonical model IDs
 */
export function listAnthropicModels(): string[] {
  return Object.keys(ANTHROPIC_MODEL_MAPPING);
}
