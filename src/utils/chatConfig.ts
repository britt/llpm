import type { ChatConfig } from '../types/project';
import { loadProjectConfig } from './projectConfig';
import { debug } from './logger';

const DEFAULT_MAX_RENDERED_LINES = 100;

/**
 * Get the chat configuration with environment variable override
 */
export async function getChatConfig(): Promise<ChatConfig> {
  const projectConfig = await loadProjectConfig();
  const config: ChatConfig = projectConfig.chat || {};

  // Environment variable override
  const envMaxLines = process.env.LLPM_CHAT_MAX_RENDER_LINES;
  if (envMaxLines) {
    const parsed = parseInt(envMaxLines, 10);
    if (!isNaN(parsed) && parsed > 0) {
      config.maxRenderedLines = parsed;
      debug('Using LLPM_CHAT_MAX_RENDER_LINES from environment:', parsed);
    } else {
      debug('Invalid LLPM_CHAT_MAX_RENDER_LINES value, ignoring:', envMaxLines);
    }
  }

  // Set default if not configured
  if (!config.maxRenderedLines) {
    config.maxRenderedLines = DEFAULT_MAX_RENDERED_LINES;
  }

  return config;
}

/**
 * Get the max rendered lines value (convenience function)
 */
export async function getMaxRenderedLines(): Promise<number> {
  const config = await getChatConfig();
  return config.maxRenderedLines || DEFAULT_MAX_RENDERED_LINES;
}
