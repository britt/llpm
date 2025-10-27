/**
import * as z from 'zod';
 * Tests for askUserTool
 */
import { describe, it, expect } from 'vitest';
import { askUserTool } from './askUserTool';

describe('askUserTool', () => {
  describe('Text Questions', () => {
    it('should format basic text question', async () => {
      const result = await (askUserTool.execute as any)({
        question: 'What is your API key?'
      });

      expect(result.success).toBe(true);
      expect(result.question).toBe('What is your API key?');
      expect(result.type).toBe('text');
      expect(result.content).toContain('❓ **What is your API key?**');
      expect(result.userMessage).toContain('⏸️  Waiting for your response...');
    });

    it('should include context when provided', async () => {
      const result = await (askUserTool.execute as any)({
        question: 'Which environment?',
        context: 'I need to know where to deploy this application'
      });

      expect(result.success).toBe(true);
      expect(result.content).toContain('📋 I need to know where to deploy this application');
      expect(result.content).toContain('❓ **Which environment?**');
    });
  });

  describe('Confirm Questions', () => {
    it('should format confirm question with yes/no prompt', async () => {
      const result = await (askUserTool.execute as any)({
        question: 'Are you sure you want to delete all files?',
        type: 'confirm'
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('confirm');
      expect(result.content).toContain('❓ **Are you sure you want to delete all files?**');
      expect(result.content).toContain('_Please respond with yes/no or y/n_');
    });
  });

  describe('Choice Questions', () => {
    it('should format choice question with numbered options', async () => {
      const result = await (askUserTool.execute as any)({
        question: 'Which branch should I deploy to?',
        type: 'choice',
        options: ['main', 'staging', 'development']
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('choice');
      expect(result.content).toContain('❓ **Which branch should I deploy to?**');
      expect(result.content).toContain('**Options:**');
      expect(result.content).toContain('  1. main');
      expect(result.content).toContain('  2. staging');
      expect(result.content).toContain('  3. development');
      expect(result.content).toContain(
        '_Please respond with the number or exact text of your choice_'
      );
    });

    it('should handle choice without options', async () => {
      const result = await (askUserTool.execute as any)({
        question: 'Pick one',
        type: 'choice'
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('choice');
      expect(result.content).toContain('❓ **Pick one**');
      // Should not include options section if no options provided
      expect(result.content).not.toContain('**Options:**');
    });
  });

  describe('Number Questions', () => {
    it('should format number question with numeric prompt', async () => {
      const result = await (askUserTool.execute as any)({
        question: 'How many instances should I scale to?',
        type: 'number'
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('number');
      expect(result.content).toContain('❓ **How many instances should I scale to?**');
      expect(result.content).toContain('_Please respond with a number_');
    });
  });

  describe('Tool Metadata', () => {
    it('should have proper tool definition', () => {
      expect(askUserTool.description).toBeDefined();
      expect(askUserTool.description).toContain('question');
      expect(askUserTool.inputSchema).toBeDefined();
    });

    it('should have inputSchema property', () => {
      expect(askUserTool.inputSchema).toBeDefined();
      expect(askUserTool.inputSchema.shape).toBeDefined();
      expect(askUserTool.inputSchema.shape.question).toBeDefined();
      expect(askUserTool.inputSchema.shape.type).toBeDefined();
      expect(askUserTool.inputSchema.shape.options).toBeDefined();
      expect(askUserTool.inputSchema.shape.context).toBeDefined();
    });
  });

  describe('userMessage Field', () => {
    it('should always include userMessage field for display', async () => {
      const result = await (askUserTool.execute as any)({
        question: 'Test question'
      });

      expect(result.userMessage).toBeDefined();
      expect(result.userMessage).toContain('❓ **Test question**');
      expect(result.userMessage).toContain('⏸️  Waiting for your response...');
      expect(result.userMessage).toContain('---');
    });
  });
});
