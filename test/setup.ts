import '@testing-library/jest-dom';
import { beforeAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Note: bun:sqlite is mocked via vitest.config.ts alias to test/mocks/bun-sqlite.js
// This provides browser/testing compatibility for the native Bun SQLite module

// Mock the specific yoga-layout WASM binary that fails in CI
vi.mock('yoga-layout/dist/binaries/yoga-wasm-base64-esm.js', () => {
  return {
    default: async () => ({ exports: {} })
  };
});

// Mock yoga-layout to prevent WASM compilation errors in CI
// vi.mock is hoisted and runs before any module imports
vi.mock('yoga-layout', () => {
  const EDGE_LEFT = 0;
  const EDGE_TOP = 1;
  const EDGE_RIGHT = 2;
  const EDGE_BOTTOM = 3;

  class MockNode {
    children: MockNode[] = [];
    parent: MockNode | null = null;
    style: Record<string, any> = {};
    layout = { left: 0, top: 0, width: 0, height: 0 };

    insertChild(child: MockNode, index: number) {
      child.parent = this;
      this.children.splice(index, 0, child);
    }
    removeChild(child: MockNode) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) { this.children.splice(idx, 1); child.parent = null; }
    }
    getChildCount() { return this.children.length; }
    getChild(index: number) { return this.children[index]; }
    getParent() { return this.parent; }
    calculateLayout(width: number, height: number) {
      this.layout.width = width || 0;
      this.layout.height = height || 0;
    }
    getComputedLayout() { return this.layout; }
    getComputedLeft() { return this.layout.left; }
    getComputedTop() { return this.layout.top; }
    getComputedWidth() { return this.layout.width; }
    getComputedHeight() { return this.layout.height; }
    getComputedBorder() { return 0; }
    getComputedPadding() { return 0; }
    getComputedMargin() { return 0; }
    setWidth(v: any) { this.style.width = v; }
    setHeight(v: any) { this.style.height = v; }
    setMinWidth(v: any) { this.style.minWidth = v; }
    setMinHeight(v: any) { this.style.minHeight = v; }
    setMaxWidth(v: any) { this.style.maxWidth = v; }
    setMaxHeight(v: any) { this.style.maxHeight = v; }
    setFlexDirection(v: any) { this.style.flexDirection = v; }
    setFlexWrap(v: any) { this.style.flexWrap = v; }
    setFlexGrow(v: any) { this.style.flexGrow = v; }
    setFlexShrink(v: any) { this.style.flexShrink = v; }
    setFlexBasis(v: any) { this.style.flexBasis = v; }
    setAlignItems(v: any) { this.style.alignItems = v; }
    setAlignSelf(v: any) { this.style.alignSelf = v; }
    setAlignContent(v: any) { this.style.alignContent = v; }
    setJustifyContent(v: any) { this.style.justifyContent = v; }
    setDisplay(v: any) { this.style.display = v; }
    setPositionType(v: any) { this.style.positionType = v; }
    setPosition(e: any, v: any) { this.style[`position_${e}`] = v; }
    setMargin(e: any, v: any) { this.style[`margin_${e}`] = v; }
    setPadding(e: any, v: any) { this.style[`padding_${e}`] = v; }
    setBorder(e: any, v: any) { this.style[`border_${e}`] = v; }
    setOverflow(v: any) { this.style.overflow = v; }
    setWidthPercent(v: any) { this.style.widthPercent = v; }
    setHeightPercent(v: any) { this.style.heightPercent = v; }
    setMarginPercent(e: any, v: any) { this.style[`marginPercent_${e}`] = v; }
    setPaddingPercent(e: any, v: any) { this.style[`paddingPercent_${e}`] = v; }
    setPositionPercent(e: any, v: any) { this.style[`positionPercent_${e}`] = v; }
    setFlexBasisPercent(v: any) { this.style.flexBasisPercent = v; }
    setWidthAuto() { this.style.width = 'auto'; }
    setHeightAuto() { this.style.height = 'auto'; }
    setMarginAuto(e: any) { this.style[`margin_${e}`] = 'auto'; }
    setFlexBasisAuto() { this.style.flexBasis = 'auto'; }
    setMeasureFunc(f: any) { (this as any).measureFunc = f; }
    unsetMeasureFunc() { (this as any).measureFunc = null; }
    markDirty() {}
    isDirty() { return false; }
    free() {}
    freeRecursive() {}
    reset() {
      this.children = [];
      this.parent = null;
      this.style = {};
      this.layout = { left: 0, top: 0, width: 0, height: 0 };
    }
  }

  return {
    default: {
      Node: { create: () => new MockNode(), createDefault: () => new MockNode(), createWithConfig: () => new MockNode() },
      Config: { create: () => ({}) },
      ALIGN_AUTO: 0, ALIGN_FLEX_START: 1, ALIGN_CENTER: 2, ALIGN_FLEX_END: 3, ALIGN_STRETCH: 4, ALIGN_BASELINE: 5, ALIGN_SPACE_BETWEEN: 6, ALIGN_SPACE_AROUND: 7,
      DIMENSION_WIDTH: 0, DIMENSION_HEIGHT: 1,
      DIRECTION_INHERIT: 0, DIRECTION_LTR: 1, DIRECTION_RTL: 2,
      DISPLAY_FLEX: 0, DISPLAY_NONE: 1,
      EDGE_LEFT, EDGE_TOP, EDGE_RIGHT, EDGE_BOTTOM, EDGE_START: 4, EDGE_END: 5, EDGE_HORIZONTAL: 6, EDGE_VERTICAL: 7, EDGE_ALL: 8,
      FLEX_DIRECTION_COLUMN: 0, FLEX_DIRECTION_COLUMN_REVERSE: 1, FLEX_DIRECTION_ROW: 2, FLEX_DIRECTION_ROW_REVERSE: 3,
      JUSTIFY_FLEX_START: 0, JUSTIFY_CENTER: 1, JUSTIFY_FLEX_END: 2, JUSTIFY_SPACE_BETWEEN: 3, JUSTIFY_SPACE_AROUND: 4, JUSTIFY_SPACE_EVENLY: 5,
      OVERFLOW_VISIBLE: 0, OVERFLOW_HIDDEN: 1, OVERFLOW_SCROLL: 2,
      POSITION_TYPE_STATIC: 0, POSITION_TYPE_RELATIVE: 1, POSITION_TYPE_ABSOLUTE: 2,
      WRAP_NO_WRAP: 0, WRAP_WRAP: 1, WRAP_WRAP_REVERSE: 2,
      UNIT_UNDEFINED: 0, UNIT_POINT: 1, UNIT_PERCENT: 2, UNIT_AUTO: 3,
    }
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
