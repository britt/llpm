import '@testing-library/jest-dom';
import { beforeAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Note: bun:sqlite is mocked via vitest.config.ts alias to test/mocks/bun-sqlite.js
// This provides browser/testing compatibility for the native Bun SQLite module

// Mock WebAssembly in CI to prevent yoga-layout WASM compilation errors
if (process.env.CI === 'true') {
  const mockWasmInstance = {
    exports: {
      memory: new WebAssembly.Memory({ initial: 1 }),
    }
  };

  const originalInstantiate = WebAssembly.instantiate;
  (global as any).WebAssembly.instantiate = async (bufferSource: BufferSource, importObject?: WebAssembly.Imports) => {
    // Check if this is base64 data that's corrupted (yoga-layout issue)
    if (bufferSource instanceof ArrayBuffer && bufferSource.byteLength > 0) {
      const view = new Uint8Array(bufferSource);
      // WASM magic number is [0x00, 0x61, 0x73, 0x6d]
      if (view[0] !== 0x00 || view[1] !== 0x61 || view[2] !== 0x73 || view[3] !== 0x6d) {
        // Not valid WASM, return a mock
        return { instance: mockWasmInstance, module: {} };
      }
    }
    return originalInstantiate(bufferSource, importObject);
  };
}

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
