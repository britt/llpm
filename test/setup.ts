import '@testing-library/jest-dom';
import { beforeAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock bun:sqlite for browser compatibility
vi.mock('bun:sqlite', () => {
  const mockDatabase = vi.fn().mockImplementation(() => ({
    query: vi.fn().mockReturnValue({
      all: vi.fn().mockReturnValue([]),
      run: vi.fn(),
      get: vi.fn().mockReturnValue(null)
    }),
    exec: vi.fn(),
    close: vi.fn(),
    prepare: vi.fn().mockReturnValue({
      all: vi.fn().mockReturnValue([]),
      run: vi.fn(),
      get: vi.fn().mockReturnValue(null)
    })
  }));

  return {
    default: mockDatabase,
    Database: mockDatabase
  };
});

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
