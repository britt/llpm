#!/usr/bin/env bun
import React from 'react';
import { render, Text } from 'ink';

export function App() {
  return React.createElement(Text, null, 'Hello, World!');
}

if (import.meta.main) {
  render(React.createElement(App));
}