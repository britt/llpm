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
  }
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});
