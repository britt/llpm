/**
 * Type definitions for cli-markdown
 * cli-markdown renders markdown to terminal with ANSI formatting
 */

declare module 'cli-markdown' {
  /**
   * Render markdown to terminal-formatted string with ANSI codes
   * @param markdown Raw markdown text
   * @returns Formatted string with ANSI codes for terminal display
   */
  function cliMarkdown(markdown: string): string;

  export default cliMarkdown;
}
