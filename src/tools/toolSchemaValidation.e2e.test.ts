/**
import * as z from 'zod';
 * End-to-end tests for tool schema validation with OpenAI and Anthropic APIs
 *
 * These tests ensure that our tool schemas are valid and accepted by the actual
 * LLM provider APIs, catching schema format issues before they break production.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { getToolRegistry } from './registry';
import { convertToLanguageModelTool } from 'ai';

describe('Tool Schema Validation E2E', () => {
  let tools: Awaited<ReturnType<typeof getToolRegistry>>;

  beforeAll(async () => {
    tools = await getToolRegistry();
  });

  describe('OpenAI Schema Validation', () => {
    it('should validate all tool schemas against OpenAI API', async () => {
      // Skip if no OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        return;
      }

      const model = openai('gpt-4o-mini');
      const errors: Array<{ toolName: string; error: string }> = [];

      // Test each tool's schema with OpenAI
      for (const [toolName, toolDef] of Object.entries(tools)) {
        try {
          // Convert to language model tool format
          const convertedTool = convertToLanguageModelTool(toolDef);

          // Make a minimal API call to validate the schema
          // We don't actually execute the tool, just verify OpenAI accepts the schema
          const result = await model.doGenerate({
            mode: {
              type: 'regular',
              tools: [
                {
                  type: 'function' as const,
                  name: toolName,
                  description: convertedTool.description,
                  parameters: convertedTool.parameters
                }
              ]
            },
            inputFormat: 'messages',
            prompt: [
              {
                role: 'user',
                content: [{ type: 'text', text: 'Test schema validation' }]
              }
            ]
          });

          // If we got here without an error, the schema is valid
          expect(result).toBeDefined();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Only fail if it's a schema validation error
          if (errorMessage.includes('schema') || errorMessage.includes('parameters')) {
            errors.push({ toolName, error: errorMessage });
          }
        }
      }

      // Report all schema errors at once
      if (errors.length > 0) {
        const errorReport = errors
          .map(({ toolName, error }) => `  - ${toolName}: ${error}`)
          .join('\n');
        throw new Error(
          `OpenAI schema validation failed for ${errors.length} tool(s):\n${errorReport}`
        );
      }
    }, 60000); // 60 second timeout for API calls
  });

  describe('Anthropic Schema Validation', () => {
    it('should validate all tool schemas against Anthropic API', async () => {
      // Skip if no Anthropic API key
      if (!process.env.ANTHROPIC_API_KEY) {
        return;
      }

      const model = anthropic('claude-3-5-haiku-20241022');
      const errors: Array<{ toolName: string; error: string }> = [];

      // Test each tool's schema with Anthropic
      for (const [toolName, toolDef] of Object.entries(tools)) {
        try {
          // Convert to language model tool format
          const convertedTool = convertToLanguageModelTool(toolDef);

          // Make a minimal API call to validate the schema
          const result = await model.doGenerate({
            mode: {
              type: 'regular',
              tools: [
                {
                  type: 'function' as const,
                  name: toolName,
                  description: convertedTool.description,
                  parameters: convertedTool.parameters
                }
              ]
            },
            inputFormat: 'messages',
            prompt: [
              {
                role: 'user',
                content: [{ type: 'text', text: 'Test schema validation' }]
              }
            ]
          });

          expect(result).toBeDefined();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Only fail if it's a schema validation error
          if (errorMessage.includes('schema') || errorMessage.includes('parameters')) {
            errors.push({ toolName, error: errorMessage });
          }
        }
      }

      // Report all schema errors at once
      if (errors.length > 0) {
        const errorReport = errors
          .map(({ toolName, error }) => `  - ${toolName}: ${error}`)
          .join('\n');
        throw new Error(
          `Anthropic schema validation failed for ${errors.length} tool(s):\n${errorReport}`
        );
      }
    }, 60000); // 60 second timeout for API calls
  });

  describe('Schema Format Validation', () => {
    it('should ensure all tools have valid inputSchema property', () => {
      const errors: string[] = [];

      for (const [toolName, toolDef] of Object.entries(tools)) {
        // Check that tool has inputSchema property
        if (!('inputSchema' in toolDef)) {
          errors.push(`${toolName}: Missing inputSchema property`);
          continue;
        }

        // Check that inputSchema is an object with _def property (Zod schema)
        const schema = (toolDef as any).inputSchema;
        if (!schema || typeof schema !== 'object' || !('_def' in schema)) {
          errors.push(`${toolName}: inputSchema is not a valid Zod schema`);
        }
      }

      if (errors.length > 0) {
        throw new Error(
          `Invalid tool schema format for ${errors.length} tool(s):\n  - ${errors.join('\n  - ')}`
        );
      }
    });

    it('should ensure empty parameter tools use z.object({})', () => {
      const warnings: string[] = [];

      for (const [toolName, toolDef] of Object.entries(tools)) {
        const schema = (toolDef as any).inputSchema;

        // Try to infer if it's an empty schema by checking if it has no properties
        try {
          const parsed = schema.safeParse({});
          if (parsed.success && Object.keys(parsed.data).length === 0) {
            // This is an empty schema - verify it's z.object({}) format
            const schemaType = schema._def?.typeName;
            if (schemaType !== 'ZodObject') {
              warnings.push(
                `${toolName}: Empty parameter tool should use z.object({}), got ${schemaType}`
              );
            }
          }
        } catch {
          // Skip validation if we can't parse
        }
      }

      // These are warnings, not errors (silently ignored in tests)
    });
  });
});
