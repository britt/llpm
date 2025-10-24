/**
 * ChatRenderBuffer - Manages chat transcript rendering with tail support
 *
 * This utility handles efficient rendering of long chat transcripts by only
 * displaying the last N lines while preserving the full content in memory.
 */

export interface TailResult {
  text: string;
  hiddenLinesCount: number;
  totalLines: number;
}

export class ChatRenderBuffer {
  private fullText: string = '';
  private totalLines: number = 0;

  /**
   * Append text to the buffer and update line counts
   */
  append(textChunk: string): void {
    this.fullText += textChunk;
    this.totalLines = this.countLines(this.fullText);
  }

  /**
   * Set the full text content (replaces existing content)
   */
  setText(text: string): void {
    this.fullText = text;
    this.totalLines = this.countLines(text);
  }

  /**
   * Get the last N lines of the transcript
   */
  getTail(maxLines: number): TailResult {
    if (maxLines <= 0 || this.totalLines <= maxLines) {
      // Return everything if max lines is 0, negative, or we have fewer lines than max
      return {
        text: this.fullText,
        hiddenLinesCount: 0,
        totalLines: this.totalLines
      };
    }

    // Split by newlines
    let lines = this.fullText.split('\n');

    // If the text ends with a newline, split creates an empty string at the end
    // We need to remove it to get accurate line counts
    const endsWithNewline = this.fullText.endsWith('\n');
    if (endsWithNewline && lines[lines.length - 1] === '') {
      lines = lines.slice(0, -1);
    }

    // Get the last N lines
    const tailLines = lines.slice(-maxLines);

    // Reconstruct the text, preserving the trailing newline if it was there
    let tailText = tailLines.join('\n');
    if (endsWithNewline) {
      tailText += '\n';
    }

    const hiddenLinesCount = this.totalLines - maxLines;

    return {
      text: tailText,
      hiddenLinesCount,
      totalLines: this.totalLines
    };
  }

  /**
   * Get the full text content
   */
  getFullText(): string {
    return this.fullText;
  }

  /**
   * Get the total line count
   */
  getTotalLines(): number {
    return this.totalLines;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.fullText = '';
    this.totalLines = 0;
  }

  /**
   * Count lines in a string (based on newline characters)
   * Note: This is a simple newline-based count and doesn't account for
   * terminal soft-wrapping, which is acceptable for MVP.
   */
  private countLines(text: string): number {
    if (text.length === 0) return 0;

    // Count newlines, plus 1 for the last line if it doesn't end with newline
    const newlineCount = (text.match(/\n/g) || []).length;
    const endsWithNewline = text.endsWith('\n');

    return endsWithNewline ? newlineCount : newlineCount + 1;
  }
}
