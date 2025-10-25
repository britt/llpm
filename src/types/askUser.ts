/**
 * Types for the ask_user tool - interactive LLM-user communication
 */

/**
 * Question types supported by ask_user tool
 */
export type QuestionType =
  | 'text'      // Free-form input
  | 'confirm'   // Yes/no
  | 'choice'    // Single selection
  | 'number';   // Numeric input

/**
 * Input parameters for ask_user tool
 */
export interface AskUserInput {
  question: string;           // Question text to display
  type?: QuestionType;        // Question type (default: 'text')
  options?: string[];         // For choice type
  context?: string;           // Additional context about why this is needed
}
