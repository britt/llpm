/**
 * Mock for yoga-layout WASM module
 *
 * The yoga-layout WASM binary fails to compile in GitHub Actions.
 * This mock provides minimal stubs for the layout engine.
 */

const ALIGN_AUTO = 0;
const ALIGN_FLEX_START = 1;
const ALIGN_CENTER = 2;
const ALIGN_FLEX_END = 3;
const ALIGN_STRETCH = 4;

const DIMENSION_WIDTH = 0;
const DIMENSION_HEIGHT = 1;

const DIRECTION_INHERIT = 0;
const DIRECTION_LTR = 1;
const DIRECTION_RTL = 2;

const DISPLAY_FLEX = 0;
const DISPLAY_NONE = 1;

const EDGE_LEFT = 0;
const EDGE_TOP = 1;
const EDGE_RIGHT = 2;
const EDGE_BOTTOM = 3;
const EDGE_START = 4;
const EDGE_END = 5;
const EDGE_HORIZONTAL = 6;
const EDGE_VERTICAL = 7;
const EDGE_ALL = 8;

const FLEX_DIRECTION_COLUMN = 0;
const FLEX_DIRECTION_COLUMN_REVERSE = 1;
const FLEX_DIRECTION_ROW = 2;
const FLEX_DIRECTION_ROW_REVERSE = 3;

const JUSTIFY_FLEX_START = 0;
const JUSTIFY_CENTER = 1;
const JUSTIFY_FLEX_END = 2;
const JUSTIFY_SPACE_BETWEEN = 3;
const JUSTIFY_SPACE_AROUND = 4;
const JUSTIFY_SPACE_EVENLY = 5;

const OVERFLOW_VISIBLE = 0;
const OVERFLOW_HIDDEN = 1;
const OVERFLOW_SCROLL = 2;

const POSITION_TYPE_STATIC = 0;
const POSITION_TYPE_RELATIVE = 1;
const POSITION_TYPE_ABSOLUTE = 2;

const WRAP_NO_WRAP = 0;
const WRAP_WRAP = 1;
const WRAP_WRAP_REVERSE = 2;

class MockNode {
  constructor() {
    this.children = [];
    this.parent = null;
    this.style = {};
    this.layout = {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };
  }

  insertChild(child, index) {
    child.parent = this;
    this.children.splice(index, 0, child);
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }

  getChildCount() {
    return this.children.length;
  }

  getChild(index) {
    return this.children[index];
  }

  getParent() {
    return this.parent;
  }

  calculateLayout(width, height, direction) {
    this.layout.width = width || 0;
    this.layout.height = height || 0;
  }

  getComputedLayout() {
    return this.layout;
  }

  getComputedLeft() { return this.layout.left; }
  getComputedTop() { return this.layout.top; }
  getComputedWidth() { return this.layout.width; }
  getComputedHeight() { return this.layout.height; }
  getComputedBorder(edge) { return 0; }
  getComputedPadding(edge) { return 0; }
  getComputedMargin(edge) { return 0; }

  setWidth(value) { this.style.width = value; }
  setHeight(value) { this.style.height = value; }
  setMinWidth(value) { this.style.minWidth = value; }
  setMinHeight(value) { this.style.minHeight = value; }
  setMaxWidth(value) { this.style.maxWidth = value; }
  setMaxHeight(value) { this.style.maxHeight = value; }
  setFlexDirection(value) { this.style.flexDirection = value; }
  setFlexWrap(value) { this.style.flexWrap = value; }
  setFlexGrow(value) { this.style.flexGrow = value; }
  setFlexShrink(value) { this.style.flexShrink = value; }
  setFlexBasis(value) { this.style.flexBasis = value; }
  setAlignItems(value) { this.style.alignItems = value; }
  setAlignSelf(value) { this.style.alignSelf = value; }
  setAlignContent(value) { this.style.alignContent = value; }
  setJustifyContent(value) { this.style.justifyContent = value; }
  setDisplay(value) { this.style.display = value; }
  setPositionType(value) { this.style.positionType = value; }
  setPosition(edge, value) { this.style[`position_${edge}`] = value; }
  setMargin(edge, value) { this.style[`margin_${edge}`] = value; }
  setPadding(edge, value) { this.style[`padding_${edge}`] = value; }
  setBorder(edge, value) { this.style[`border_${edge}`] = value; }
  setOverflow(value) { this.style.overflow = value; }

  setWidthPercent(value) { this.style.widthPercent = value; }
  setHeightPercent(value) { this.style.heightPercent = value; }
  setMarginPercent(edge, value) { this.style[`marginPercent_${edge}`] = value; }
  setPaddingPercent(edge, value) { this.style[`paddingPercent_${edge}`] = value; }
  setPositionPercent(edge, value) { this.style[`positionPercent_${edge}`] = value; }
  setFlexBasisPercent(value) { this.style.flexBasisPercent = value; }

  setWidthAuto() { this.style.width = 'auto'; }
  setHeightAuto() { this.style.height = 'auto'; }
  setMarginAuto(edge) { this.style[`margin_${edge}`] = 'auto'; }
  setFlexBasisAuto() { this.style.flexBasis = 'auto'; }

  setMeasureFunc(func) { this.measureFunc = func; }
  unsetMeasureFunc() { this.measureFunc = null; }

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

const Yoga = {
  Node: {
    create: () => new MockNode(),
    createDefault: () => new MockNode(),
    createWithConfig: () => new MockNode(),
  },
  Config: {
    create: () => ({}),
  },

  // Constants
  ALIGN_AUTO,
  ALIGN_FLEX_START,
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  ALIGN_STRETCH,
  ALIGN_BASELINE: 5,
  ALIGN_SPACE_BETWEEN: 6,
  ALIGN_SPACE_AROUND: 7,

  DIMENSION_WIDTH,
  DIMENSION_HEIGHT,

  DIRECTION_INHERIT,
  DIRECTION_LTR,
  DIRECTION_RTL,

  DISPLAY_FLEX,
  DISPLAY_NONE,

  EDGE_LEFT,
  EDGE_TOP,
  EDGE_RIGHT,
  EDGE_BOTTOM,
  EDGE_START,
  EDGE_END,
  EDGE_HORIZONTAL,
  EDGE_VERTICAL,
  EDGE_ALL,

  FLEX_DIRECTION_COLUMN,
  FLEX_DIRECTION_COLUMN_REVERSE,
  FLEX_DIRECTION_ROW,
  FLEX_DIRECTION_ROW_REVERSE,

  JUSTIFY_FLEX_START,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_END,
  JUSTIFY_SPACE_BETWEEN,
  JUSTIFY_SPACE_AROUND,
  JUSTIFY_SPACE_EVENLY,

  OVERFLOW_VISIBLE,
  OVERFLOW_HIDDEN,
  OVERFLOW_SCROLL,

  POSITION_TYPE_STATIC,
  POSITION_TYPE_RELATIVE,
  POSITION_TYPE_ABSOLUTE,

  WRAP_NO_WRAP,
  WRAP_WRAP,
  WRAP_WRAP_REVERSE,

  UNIT_UNDEFINED: 0,
  UNIT_POINT: 1,
  UNIT_PERCENT: 2,
  UNIT_AUTO: 3,
};

export default Yoga;
module.exports = Yoga;
module.exports.default = Yoga;
