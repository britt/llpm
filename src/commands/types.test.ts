import { describe, it, expect } from 'vitest';
import type { CommandResult } from './types';
import type { Message } from '../types';

describe('CommandResult types', () => {
  it('should support history-view interactive type', () => {
    const messages: Message[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ];

    const result: CommandResult = {
      content: '',
      success: true,
      interactive: {
        type: 'history-view',
        messages,
      },
    };

    expect(result.interactive?.type).toBe('history-view');
    if (result.interactive?.type === 'history-view') {
      expect(result.interactive.messages).toHaveLength(2);
    }
  });

  it('should still support model-select interactive type', () => {
    const result: CommandResult = {
      content: '',
      success: true,
      interactive: {
        type: 'model-select',
        models: [
          { id: 'gpt-4o', label: 'GPT-4o', value: 'openai/gpt-4o' },
        ],
      },
    };

    expect(result.interactive?.type).toBe('model-select');
    if (result.interactive?.type === 'model-select') {
      expect(result.interactive.models).toHaveLength(1);
      expect(result.interactive.models[0]!.id).toBe('gpt-4o');
    }
  });

  it('should support CommandResult without interactive', () => {
    const result: CommandResult = {
      content: 'done',
      success: true,
    };

    expect(result.interactive).toBeUndefined();
  });

  it('should include messages with optional fields in history-view', () => {
    const messages: Message[] = [
      { role: 'user', content: 'hello', id: 'msg-1', timestamp: 1234567890 },
      { role: 'assistant', content: 'hi' },
    ];

    const result: CommandResult = {
      content: '',
      success: true,
      interactive: {
        type: 'history-view',
        messages,
      },
    };

    if (result.interactive?.type === 'history-view') {
      expect(result.interactive.messages[0]!.id).toBe('msg-1');
      expect(result.interactive.messages[0]!.timestamp).toBe(1234567890);
      expect(result.interactive.messages[1]!.id).toBeUndefined();
    }
  });
});
