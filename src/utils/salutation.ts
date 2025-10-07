/**
 * Utilities for composing GitHub content with LLPM salutation
 */

export const DEFAULT_SALUTATION = '🤖 LLPM';

export interface SalutationConfig {
  enabled: boolean;
  text: string;
}

/**
 * Composes body text with LLPM salutation prepended.
 *
 * @param body - The body text to prepend salutation to
 * @param config - Optional configuration for salutation (defaults to enabled with default text)
 * @returns The body text with salutation prepended (if enabled and not already present)
 */
export function composeWithSalutation(
  body: string,
  config: Partial<SalutationConfig> = {}
): string {
  const { enabled = true, text = DEFAULT_SALUTATION } = config;

  if (!enabled) {
    return body;
  }

  // Normalize body - trim leading/trailing whitespace
  const normalizedBody = body.trim();

  // Check if salutation is already present (exact line match at start)
  const salutationLine = text;
  const expectedStart = `${salutationLine}\n\n`;
  if (normalizedBody.startsWith(expectedStart) || normalizedBody === salutationLine) {
    return normalizedBody;
  }

  // Prepend salutation with double newline separator
  return `${salutationLine}\n\n${normalizedBody}`;
}

/**
 * Gets the salutation configuration from app config.
 * Returns default config if not set.
 *
 * @param appConfig - The application configuration object
 * @returns The salutation configuration
 */
export function getSalutationConfig(appConfig?: any): SalutationConfig {
  if (!appConfig?.automation?.salutation) {
    return {
      enabled: true,
      text: DEFAULT_SALUTATION
    };
  }

  return {
    enabled: appConfig.automation.salutation.enabled ?? true,
    text: appConfig.automation.salutation.text ?? DEFAULT_SALUTATION
  };
}
