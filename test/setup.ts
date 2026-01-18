import '@testing-library/jest-dom';
import { beforeAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Setup DOM environment for React Testing Library
beforeAll(() => {
  // Ensure we have a proper DOM environment
  if (typeof (global as any).document === 'undefined') {
    // Use happy-dom which works better with Bun
    const { Window } = require('happy-dom');
    const window = new Window({
      url: 'http://localhost'
    });

    (global as any).window = window;
    (global as any).document = window.document;
    (global as any).navigator = window.navigator;
    (global as any).HTMLElement = window.HTMLElement;

    // Ensure process is available for React
    if (typeof (global as any).process === 'undefined') {
      (global as any).process = {
        env: {
          NODE_ENV: 'test'
        }
      };
    }
  }

  // Set NODE_ENV to test for all test runs to ensure temp config dirs are used
  if (typeof process !== 'undefined' && process.env) {
    process.env.NODE_ENV = 'test';
  }
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});
