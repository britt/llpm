import '@testing-library/jest-dom';
import { beforeAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Note: bun:sqlite is mocked via vitest.config.ts alias to test/mocks/bun-sqlite.js
// This provides browser/testing compatibility for the native Bun SQLite module

// Type for global with DOM properties
interface GlobalWithDOM {
  window?: unknown;
  document?: unknown;
  navigator?: unknown;
  HTMLElement?: unknown;
  process?: {
    env: Record<string, string | undefined>;
  };
}

// Setup DOM environment for React Testing Library
beforeAll(() => {
  const globalWithDOM = global as unknown as GlobalWithDOM;

  // Ensure we have a proper DOM environment
  if (typeof globalWithDOM.document === 'undefined') {
    // Use happy-dom which works better with Bun
    const { Window } = require('happy-dom');
    const window = new Window({
      url: 'http://localhost'
    });

    globalWithDOM.window = window;
    globalWithDOM.document = window.document;
    globalWithDOM.navigator = window.navigator;
    globalWithDOM.HTMLElement = window.HTMLElement;

    // Ensure process is available for React
    if (typeof globalWithDOM.process === 'undefined') {
      globalWithDOM.process = {
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
