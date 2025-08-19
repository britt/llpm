import '@testing-library/jest-dom';
import { beforeAll } from 'vitest';

// Setup DOM environment for React Testing Library
beforeAll(() => {
  // Ensure we have a proper DOM environment
  if (typeof document === 'undefined') {
    throw new Error('DOM environment not properly configured');
  }
});
