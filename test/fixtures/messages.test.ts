import { describe, it, expect } from 'vitest';
import type { Message } from '../../src/types';
import {
  userMessage,
  assistantMessage,
  systemMessage,
  uiNotificationMessage,
  conversationHistory,
  createUserMessage,
  createAssistantMessage,
  createSystemMessage,
  createUiNotificationMessage
} from './messages';

describe('Message Fixtures', () => {
  describe('Pre-built fixtures', () => {
    it('should have a user message fixture', () => {
      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toBeDefined();
      expect(typeof userMessage.content).toBe('string');
      expect(userMessage.content.length).toBeGreaterThan(0);
    });

    it('should have an assistant message fixture', () => {
      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.content).toBeDefined();
      expect(typeof assistantMessage.content).toBe('string');
      expect(assistantMessage.content.length).toBeGreaterThan(0);
    });

    it('should have a system message fixture', () => {
      expect(systemMessage.role).toBe('system');
      expect(systemMessage.content).toBeDefined();
      expect(typeof systemMessage.content).toBe('string');
      expect(systemMessage.content.length).toBeGreaterThan(0);
    });

    it('should have a ui-notification message fixture', () => {
      expect(uiNotificationMessage.role).toBe('ui-notification');
      expect(uiNotificationMessage.content).toBeDefined();
      expect(typeof uiNotificationMessage.content).toBe('string');
      expect(uiNotificationMessage.content.length).toBeGreaterThan(0);
    });

    it('should have a conversation history fixture', () => {
      expect(Array.isArray(conversationHistory)).toBe(true);
      expect(conversationHistory.length).toBeGreaterThan(0);

      // Should have multiple roles
      const roles = conversationHistory.map(msg => msg.role);
      expect(roles).toContain('user');
      expect(roles).toContain('assistant');
    });
  });

  describe('Factory functions', () => {
    it('should create custom user message', () => {
      const msg = createUserMessage('Custom user text');

      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Custom user text');
    });

    it('should create custom assistant message', () => {
      const msg = createAssistantMessage('Custom assistant text');

      expect(msg.role).toBe('assistant');
      expect(msg.content).toBe('Custom assistant text');
    });

    it('should create custom system message', () => {
      const msg = createSystemMessage('Custom system text');

      expect(msg.role).toBe('system');
      expect(msg.content).toBe('Custom system text');
    });

    it('should create custom ui-notification message', () => {
      const msg = createUiNotificationMessage('Custom notification');

      expect(msg.role).toBe('ui-notification');
      expect(msg.content).toBe('Custom notification');
    });

    it('should create message with custom id', () => {
      const msg = createUserMessage('Test', 'custom-id-123');

      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Test');
      expect(msg.id).toBe('custom-id-123');
    });

    it('should create message without id by default', () => {
      const msg = createUserMessage('Test');

      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Test');
      expect(msg.id).toBeUndefined();
    });
  });

  describe('Fixture validation', () => {
    it('should have valid message structure for all fixtures', () => {
      const allMessages = [
        userMessage,
        assistantMessage,
        systemMessage,
        uiNotificationMessage,
        ...conversationHistory
      ];

      allMessages.forEach(msg => {
        expect(msg).toHaveProperty('role');
        expect(['user', 'assistant', 'system', 'ui-notification']).toContain(msg.role);
        expect(msg).toHaveProperty('content');
      });
    });

    it('should match Message type structure', () => {
      const testMessage: Message = createUserMessage('Type test');

      expect(testMessage.role).toBeDefined();
      expect(testMessage.content).toBeDefined();
      // id is optional, so we just check it exists or doesn't
      expect(testMessage.id === undefined || typeof testMessage.id === 'string').toBe(true);
    });
  });
});
