import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { HistorySearchBar } from './HistorySearchBar';

describe('HistorySearchBar', () => {
  it('should render search prompt', () => {
    const { lastFrame } = render(
      React.createElement(HistorySearchBar, {
        query: '',
        matchCount: 0,
        currentMatch: 0,
        onQueryChange: vi.fn(),
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('/');
  });

  it('should show match count when there are matches', () => {
    const { lastFrame } = render(
      React.createElement(HistorySearchBar, {
        query: 'test',
        matchCount: 5,
        currentMatch: 2,
        onQueryChange: vi.fn(),
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('3 of 5');
  });

  it('should show no matches when query has no results', () => {
    const { lastFrame } = render(
      React.createElement(HistorySearchBar, {
        query: 'xyz',
        matchCount: 0,
        currentMatch: 0,
        onQueryChange: vi.fn(),
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('No matches');
  });
});
