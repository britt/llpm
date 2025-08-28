// Mock implementation of bun:sqlite for browser/CI compatibility
export class Database {
  constructor() {
    this.closed = false;
  }

  query(sql) {
    return {
      all: () => [],
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
      get: () => null
    };
  }

  prepare(sql) {
    return {
      all: () => [],
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
      get: () => null
    };
  }

  exec(sql) {
    return { changes: 0 };
  }

  close() {
    this.closed = true;
  }
}

export default { Database };