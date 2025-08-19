#!/usr/bin/env bun
import { render } from 'ink-testing-library';
import React from 'react';
import { ChatInterface } from './src/components/ChatInterface';
import type { Message } from './src/types';

// Mock dependencies for testing
const mockMessages: Message[] = [];

const mockProps = {
  messages: mockMessages,
  onSendMessage: () => {},
  onAddSystemMessage: () => {},
  isLoading: false,
  interactiveCommand: null
};

console.log('🚀 Testing BLAZING FAST input performance...');

const { lastFrame, stdin, unmount } = render(React.createElement(ChatInterface, mockProps));

// Test rapid typing simulation
const testText = "The quick brown fox jumps over the lazy dog and then some more text to test sustained typing performance at high speeds";
const typingSpeed = 8.33; // 120 WPM = ~10 chars/sec = 100ms per char, but let's test even faster at 8.33ms (120 chars/sec)

console.log(`⚡ Simulating typing at ${typingSpeed}ms per character...`);
console.log(`📝 Text to type: "${testText}"`);

let i = 0;
const typeNextChar = () => {
  if (i < testText.length) {
    const char = testText[i];
    console.log(`Typing char ${i + 1}/${testText.length}: '${char}'`);
    
    // Simulate keystroke
    stdin.write(char);
    
    i++;
    setTimeout(typeNextChar, typingSpeed);
  } else {
    console.log('✅ Typing simulation completed!');
    console.log('📺 Final frame:');
    console.log(lastFrame());
    
    // Test Enter to submit
    console.log('🔥 Testing Enter key...');
    stdin.write('\r'); // Enter key
    
    setTimeout(() => {
      console.log('📺 Frame after Enter:');
      console.log(lastFrame());
      unmount();
      console.log('🎉 Performance test completed successfully!');
      process.exit(0);
    }, 100);
  }
};

// Start typing test
setTimeout(typeNextChar, 100);

// Timeout safety
setTimeout(() => {
  console.error('❌ Test timed out - performance issues detected!');
  unmount();
  process.exit(1);
}, 10000); // 10 second timeout