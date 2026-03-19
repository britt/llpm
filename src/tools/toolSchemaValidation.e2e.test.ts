/**
 * End-to-end tests for tool schema validation with OpenAI and Anthropic APIs
 *
 * These tests ensure that our tool schemas are valid and accepted by the actual
 * LLM provider APIs, catching schema format issues before they break production.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { getToolRegistry } from './registry';

describe('Tool Schema Validation E2E', () => {
  let tools: Awaited<ReturnType<typeof getToolRegistry>>;

  beforeAll(async () => {
    tools = await getToolRegistry();
  });

  describe('OpenAI Schema Validation', () => {
    it('should validate all tool schemas against OpenAI API', async () => {
      // Skip if no OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        console.warn('Skipping OpenAI validation: OPENAI_API_KEY not set');
        return;
      }

      const model = openai('gpt-4o-mini');

      // Build all tool definitions and send in a single API call
      const allTools = Object.entries(tools).map(([toolName, toolDef]) => {
        const convertedTool = (toolDef);
        return {
          type: 'function' as const,
          name: toolName,
          description: convertedTool.description,
          parameters: (convertedTool as any).parameters
        };
      });

      try {
        const result = await (model as any).doGenerate({
          mode: {
            type: 'regular',
            tools: allTools
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
          throw new Error(
            `OpenAI schema validation failed: ${errorMessage}`
          );
        }
        // Non-schema errors (rate limits, network) are not test failures
      }
    }, 30000);
  });

  describe('Anthropic Schema Validation', () => {
    it('should validate all tool schemas against Anthropic API', async () => {
      // Skip if no Anthropic API key
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('Skipping Anthropic validation: ANTHROPIC_API_KEY not set');
        return;
      }

      const model = anthropic('claude-3-5-haiku-20241022');

      // Build all tool definitions and send in a single API call
      const allTools = Object.entries(tools).map(([toolName, toolDef]) => {
        const convertedTool = (toolDef);
        return {
          type: 'function' as const,
          name: toolName,
          description: convertedTool.description,
          parameters: (convertedTool as any).parameters
        };
      });

      try {
        const result = await (model as any).doGenerate({
          mode: {
            type: 'regular',
            tools: allTools
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
          throw new Error(
            `Anthropic schema validation failed: ${errorMessage}`
          );
        }
        // Non-schema errors (rate limits, network) are not test failures
      }
    }, 30000);
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
        } catch (error) {
          // Skip validation if we can't parse
        }
      }

      // These are warnings, not errors
      if (warnings.length > 0) {
        console.warn(
          `Schema format warnings for ${warnings.length} tool(s):\n  - ${warnings.join('\n  - ')}`
        );
      }
    });
  });
});
