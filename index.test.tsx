import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './index';

describe('App', () => {
  it('renders hello world message', () => {
    const { getByText } = render(<App />);
    expect(getByText('Hello, World!')).toBeInTheDocument();
  });
});