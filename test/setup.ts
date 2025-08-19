import '@testing-library/jest-dom';
import { beforeAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Setup DOM environment for React Testing Library
beforeAll(() => {
  // Ensure we have a proper DOM environment
  if (typeof (global as any).document === 'undefined') {
    // Try to setup basic DOM globals if they're missing
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    (global as any).window = dom.window;
    (global as any).document = dom.window.document;
    (global as any).navigator = dom.window.navigator;
  }
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});
