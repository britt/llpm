#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/no-unused-vars */
import { render } from 'ink-testing-library';
import React from 'react';
import { ChatInterface } from './src/components/ChatInterface';
import type { Message } from './src/types';

// Mock dependencies for testing
const mockMessages: Message[] = [];

const mockProps = {
  messages: mockMessages,
  onSendMessage: (msg: string) => {},
  onAddSystemMessage: () => {},
  isLoading: false,
  interactiveCommand: null
};

// 120 WPM = 120 words * 5 chars average = 600 chars per minute
// 600 chars / 60 seconds = 10 chars per second
// 1000ms / 10 chars = 100ms per character
const TYPING_SPEED_120WPM = 100; // milliseconds per character

const testSentences = [
  'This is a test of sustained typing at exactly one hundred twenty words per minute.',
  'The input system must handle this speed without dropping any characters or lagging.',
  'Professional typists can type at this speed and the interface should keep up perfectly.'
];

const { lastFrame, stdin, unmount } = render(React.createElement(ChatInterface, mockProps));

let sentenceIndex = 0;
let charIndex = 0;

const typeNextChar = () => {
  if (sentenceIndex >= testSentences.length) {
    unmount();
    process.exit(0);
    return;
  }

  const currentSentence = testSentences[sentenceIndex];

  if (charIndex >= currentSentence.length) {
    // Finished current sentence, submit it
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

  setTimeout(typeNextChar, TYPING_SPEED_120WPM);
};

// Start typing test after brief delay
setTimeout(typeNextChar, 1000);

// Safety timeout
setTimeout(() => {
  unmount();
  process.exit(1);
}, 30000); // 30 second timeout
