/**
 * Parse an array of string arguments, respecting quoted strings.
 * Joins multi-word quoted args and strips outer quotes.
 *
 * Example: ['add', '"My', 'Project"', 'repo'] => ['add', 'My Project', 'repo']
 */
export function parseQuotedArgs(args: string[]): string[] {
  const result: string[] = [];
  let currentArg = '';
  let inQuote = false;
  let quoteChar = '';

  for (const arg of args) {
    if (!inQuote) {
      // Check if this arg starts with a quote
      if ((arg.startsWith('"') || arg.startsWith("'")) && arg.length > 1) {
        quoteChar = arg[0];
        // Check if it also ends with the same quote (single-word quoted arg)
        if (arg.endsWith(quoteChar) && arg.length >= 2) {
          result.push(arg.slice(1, -1));
        } else {
          inQuote = true;
          currentArg = arg.slice(1);
        }
      } else {
        result.push(arg);
      }
    } else {
      // We're inside a quoted string
      if (arg.endsWith(quoteChar)) {
        currentArg += ' ' + arg.slice(0, -1);
        result.push(currentArg);
        currentArg = '';
        inQuote = false;
      } else {
        currentArg += ' ' + arg;
      }
    }
  }

  // If we're still in a quote at the end, just add what we have
  if (inQuote && currentArg) {
    result.push(currentArg);
  }

  return result;
}
