import { describe, it, expect } from 'vitest';
import type { Message } from './types';

describe('Message type', () => {
  it('should allow optional timestamp field', () => {
    const msg: Message = {
      role: 'user',
      content: 'hello',
      timestamp: Date.now(),
    };
    expect(msg.timestamp).toBeDefined();
    expect(typeof msg.timestamp).toBe('number');
  });

  it('should work without timestamp for backward compatibility', () => {
    const msg: Message = {
      role: 'assistant',
      content: 'hi',
    };
    expect(msg.timestamp).toBeUndefined();
  });
});
