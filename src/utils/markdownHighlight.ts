/**
 * Apply basic markdown syntax highlighting using ANSI color codes
 */
export function highlightMarkdown(text: string): string {
  let highlighted = text;
  
  // Code blocks must be processed first (before inline code)
  // This regex looks for ``` followed by optional language, newline, content, newline, ```
  highlighted = highlighted.replace(/(```(\w*)\n)([\s\S]*?)(\n```)/g, (match, openBlock, lang, code, _closeBlock) => {
    return `\x1b[2m\x1b[37m\`\`\`${lang || ''}\x1b[0m\n\x1b[90m${code}\x1b[0m\n\x1b[2m\x1b[37m\`\`\`\x1b[0m`;
  });
  
  // Inline code (`code`) - after code blocks  
  highlighted = highlighted.replace(/(?<!`)`([^`\n]+)`(?!`)/g, '\x1b[90m\x1b[47m$1\x1b[0m');
  
  // Headers (# ## ###)
  highlighted = highlighted.replace(/^(#{1,6})\s+(.+)$/gm, '\x1b[1m\x1b[36m$1\x1b[0m \x1b[1m$2\x1b[0m');
  
  // Bold text (**text** or __text__)
  highlighted = highlighted.replace(/\*\*([^*]+)\*\*/g, '\x1b[1m$1\x1b[0m');
  highlighted = highlighted.replace(/__([^_]+)__/g, '\x1b[1m$1\x1b[0m');
  
  // Italic text (*text* or _text_)
  highlighted = highlighted.replace(/\*([^*]+)\*/g, '\x1b[3m$1\x1b[0m');
  highlighted = highlighted.replace(/_([^_]+)_/g, '\x1b[3m$1\x1b[0m');
  
  // Lists (- or *)
  highlighted = highlighted.replace(/^(\s*)([-*])\s+(.+)$/gm, '$1\x1b[33m$2\x1b[0m $3');
  
  // Numbered lists (1. 2. etc.)
  highlighted = highlighted.replace(/^(\s*)(\d+\.)\s+(.+)$/gm, '$1\x1b[33m$2\x1b[0m $3');
  
  // Links [text](url)
  highlighted = highlighted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '\x1b[34m\x1b[4m$1\x1b[0m');
  
  // Quotes (> text)
  highlighted = highlighted.replace(/^>\s+(.+)$/gm, '\x1b[2m\x1b[37m>\x1b[0m \x1b[3m$1\x1b[0m');
  
  return highlighted;
}

/**
 * Wrap text in a markdown code block with syntax highlighting
 */
export function formatAsMarkdownCodeBlock(content: string, language = 'markdown'): string {
  return `\`\`\`${language}\n${content}\n\`\`\``;
}