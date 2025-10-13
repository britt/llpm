/**
 * Markdown rendering utilities for terminal output
 * Provides abstraction for rendering markdown with ANSI formatting
 */

export interface MarkdownRenderer {
  /**
   * Render markdown to terminal-formatted string with ANSI codes
   * @param markdown Raw markdown text
   * @returns Promise resolving to formatted string with ANSI codes for terminal display
   */
  render(markdown: string): Promise<string>;

  /**
   * Check if the renderer is available and can be used
   * @returns true if renderer is ready, false otherwise
   */
  isAvailable(): boolean;

  /**
   * Get the name of this renderer implementation
   */
  getName(): string;
}

/**
 * Plain renderer that returns markdown as-is without any formatting
 * Used as fallback when other renderers are unavailable
 */
export class PlainMarkdownRenderer implements MarkdownRenderer {
  async render(markdown: string): Promise<string> {
    return markdown;
  }

  isAvailable(): boolean {
    return true;
  }

  getName(): string {
    return 'plain';
  }
}

/**
 * Lazy load cli-markdown to avoid import issues
 */
let cliMarkdownModule: ((markdown: string) => string) | null = null;
let cliMarkdownLoadAttempted = false;

async function loadCliMarkdown(): Promise<((markdown: string) => string) | null> {
  if (cliMarkdownLoadAttempted) {
    return cliMarkdownModule;
  }

  cliMarkdownLoadAttempted = true;

  try {
    // Try dynamic import
    const module = await import('cli-markdown');
    cliMarkdownModule = module.default;
    return cliMarkdownModule;
  } catch (error: any) {
    console.error('Failed to load cli-markdown:', error?.message || error);
    return null;
  }
}

/**
 * Renderer using cli-markdown for terminal formatting
 */
export class CliMarkdownRenderer implements MarkdownRenderer {
  private initialized = false;

  async render(markdown: string): Promise<string> {
    // Load cli-markdown on first use
    if (!this.initialized) {
      await loadCliMarkdown();
      this.initialized = true;
    }

    if (!this.isAvailable()) {
      // Fallback to plain if renderer not loaded
      return markdown;
    }

    try {
      return cliMarkdownModule!(markdown);
    } catch (error: any) {
      console.error('cli-markdown rendering failed:', error?.message || error);
      return markdown;
    }
  }

  isAvailable(): boolean {
    return cliMarkdownModule !== null;
  }

  getName(): string {
    return 'cli-markdown';
  }
}

/**
 * Singleton instance of the current markdown renderer
 */
let currentRenderer: MarkdownRenderer | null = null;

/**
 * Initialize the markdown renderer with the specified type
 * @param rendererType Type of renderer to use ('cli-markdown' | 'plain')
 * @returns Promise resolving to the initialized renderer
 */
export async function initializeRenderer(
  rendererType: 'cli-markdown' | 'plain' = 'cli-markdown'
): Promise<MarkdownRenderer> {
  if (rendererType === 'plain') {
    currentRenderer = new PlainMarkdownRenderer();
    return currentRenderer;
  }

  // Try cli-markdown
  const renderer = new CliMarkdownRenderer();

  // Trigger load by calling render with empty string
  // This ensures the module is loaded before we check availability
  await renderer.render('');

  if (renderer.isAvailable()) {
    currentRenderer = renderer;
    return renderer;
  }

  // Fallback to plain
  console.warn('cli-markdown not available, falling back to plain renderer');
  currentRenderer = new PlainMarkdownRenderer();
  return currentRenderer;
}

/**
 * Get the current renderer instance
 * Initializes with default renderer if not yet initialized
 */
export async function getRenderer(): Promise<MarkdownRenderer> {
  if (!currentRenderer) {
    return await initializeRenderer();
  }
  return currentRenderer;
}

/**
 * Render markdown using the current renderer
 * @param markdown Raw markdown text
 * @returns Formatted string for terminal display
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const renderer = await getRenderer();
  return renderer.render(markdown);
}

/**
 * Check if rendering should be enabled based on environment
 * @param force Force enable rendering regardless of environment
 * @returns true if rendering should be enabled
 */
export function shouldEnableRendering(force: boolean = false): boolean {
  if (force) {
    return true;
  }

  // Check if stdout is a TTY
  if (typeof process !== 'undefined' && process.stdout && !process.stdout.isTTY) {
    return false;
  }

  // Check environment variables
  if (process.env.NO_COLOR || process.env.CI === 'true') {
    return false;
  }

  return true;
}
