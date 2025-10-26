/**
 * Interactive user input tool - allows LLM to ask questions in chat
 *
 * The LLM calls this tool to format a question, which appears in its response.
 * The user's next chat message is interpreted as the answer.
 */

import { z } from 'zod';
import { tool } from './instrumentedTool';
import { debug } from '../utils/logger';

/**
 * Input schema for ask_user tool
 */
const askUserInputSchema = z.object({
  question: z.string().describe('The question to ask the user'),
  type: z
    .enum(['text', 'confirm', 'choice', 'number'])
    .optional()
    .default('text')
    .describe('Type of question for formatting hints'),
  options: z.array(z.string()).optional().describe('Available options for choice type'),
  context: z.string().optional().describe('Additional context about why you need this information')
});

/**
 * Format the question based on type
 */
function formatQuestion(input: {
  question: string;
  type?: 'text' | 'confirm' | 'choice' | 'number';
  options?: string[];
  context?: string;
}): string {
  const parts: string[] = [];

  // Add context if provided
  if (input.context) {
    parts.push(`📋 ${input.context}`);
    parts.push('');
  }

  // Add the question
  parts.push(`❓ **${input.question}**`);
  parts.push('');

  // Add type-specific formatting
  switch (input.type) {
    case 'confirm':
      parts.push('_Please respond with yes/no or y/n_');
      break;

    case 'choice':
      if (input.options && input.options.length > 0) {
        parts.push('**Options:**');
        input.options.forEach((opt, i) => {
          parts.push(`  ${i + 1}. ${opt}`);
        });
        parts.push('');
        parts.push('_Please respond with the number or exact text of your choice_');
      }
      break;

    case 'number':
      parts.push('_Please respond with a number_');
      break;

    case 'text':
    default:
      // No special formatting for text
      break;
  }

  return parts.join('\n');
}

/**
 * ask_user tool - Ask the user a question in chat
 *
 * Use this tool when you need information from the user that wasn't provided
 * in their original request. The question will appear in your response, and
 * their next message will be the answer.
 *
 * Good use cases:
 * - Asking for sensitive data (API keys, passwords)
 * - Confirming before destructive actions
 * - Clarifying when multiple valid options exist
 * - Gathering specific parameters you cannot infer
 *
 * After calling this tool, you should:
 * 1. Include the formatted question in your response
 * 2. Stop and wait for the user's answer
 * 3. Their next message will contain the answer - interpret it accordingly
 */
export const askUserTool = tool({
  name: 'ask_user',
  description: `Format a question to ask the user in the chat. After asking, you should stop your response and wait for their answer. Their next message will be the response.

Use this when you need information not provided in the original request:
- Sensitive data (API keys, passwords, tokens)
- Confirmation before destructive actions
- Clarification when multiple options exist
- Specific parameters you cannot infer

Question types:
- text: Free-form answer (default)
- confirm: Yes/no question
- choice: Select from provided options
- number: Numeric answer

The tool formats the question nicely. You must include it in your response and then stop to wait for the user's answer.`,

  inputSchema: askUserInputSchema,

  execute: async input => {
    // Apply default type if not provided
    const questionType = input.type || 'text';

    debug('askUserTool: Formatting question', { question: input.question, type: questionType });

    const formattedQuestion = formatQuestion(input);

    debug('askUserTool: Question formatted', { formatted: formattedQuestion });

    return {
      success: true,
      question: input.question,
      type: questionType,
      content: formattedQuestion,
      userMessage: `\n\n${formattedQuestion}\n\n---\n\n_⏸️  Waiting for your response..._`
    };
  }
});
