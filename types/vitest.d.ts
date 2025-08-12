/// <reference types="vitest/globals" />

import type { TestAPI } from 'vitest';

declare global {
  var vi: TestAPI['vi'];
  var describe: TestAPI['describe'];
  var it: TestAPI['it'];
  var expect: TestAPI['expect'];
  var beforeEach: TestAPI['beforeEach'];
  var afterEach: TestAPI['afterEach'];
}
