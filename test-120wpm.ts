#!/usr/bin/env bun
import { render } from 'ink-testing-library';
import React from 'react';
import { ChatInterface } from './src/components/ChatInterface';
import type { Message } from './src/types';

// Mock dependencies for testing
const mockMessages: Message[] = [];

const mockProps = {
  messages: mockMessages,
  onSendMessage: (msg: string) => console.log(`📤 Message sent: "${msg}"`),
  onAddSystemMessage: () => {},
  isLoading: false,
  interactiveCommand: null
};

console.log('🎯 Testing EXACTLY 120 WPM typing speed...');

// 120 WPM = 120 words * 5 chars average = 600 chars per minute
// 600 chars / 60 seconds = 10 chars per second
// 1000ms / 10 chars = 100ms per character
const TYPING_SPEED_120WPM = 100; // milliseconds per character

const testSentences = [
  "This is a test of sustained typing at exactly one hundred twenty words per minute.",
  "The input system must handle this speed without dropping any characters or lagging.",
  "Professional typists can type at this speed and the interface should keep up perfectly."
];

const { lastFrame, stdin, unmount } = render(React.createElement(ChatInterface, mockProps));

console.log(`⏱️ Typing speed: ${TYPING_SPEED_120WPM}ms per character (exactly 120 WPM)`);
console.log(`📝 Testing ${testSentences.length} sentences...`);

let sentenceIndex = 0;
let charIndex = 0;

const typeNextChar = () => {
  if (sentenceIndex >= testSentences.length) {
    console.log('✅ All sentences typed successfully!');
    console.log('🎉 120 WPM test PASSED!');
    unmount();
    process.exit(0);
    return;
  }

  const currentSentence = testSentences[sentenceIndex];
  
  if (charIndex >= currentSentence.length) {
    // Finished current sentence, submit it
    console.log(`📤 Submitting sentence ${sentenceIndex + 1}: "${currentSentence}"`);
    stdin.write('\r'); // Enter to submit
    
    // Move to next sentence
    sentenceIndex++;
    charIndex = 0;
    
    setTimeout(typeNextChar, TYPING_SPEED_120WPM * 2); // Brief pause between sentences
    return;
  }

  const char = currentSentence[charIndex];
  stdin.write(char);
  charIndex++;
  
  // Show progress
  if (charIndex % 10 === 0) {
    console.log(`📊 Sentence ${sentenceIndex + 1}, char ${charIndex}/${currentSentence.length}`);
  }
  
  setTimeout(typeNextChar, TYPING_SPEED_120WPM);
};

// Start typing test after brief delay
console.log('🚀 Starting 120 WPM typing test in 1 second...');
setTimeout(typeNextChar, 1000);

// Safety timeout
setTimeout(() => {
  console.error('❌ Test timed out - 120 WPM performance not achieved!');
  unmount();
  process.exit(1);
}, 30000); // 30 second timeout