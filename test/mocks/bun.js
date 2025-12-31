// Mock implementation of bun for browser/CI compatibility

// Mock shell executor
export const $ = (strings, ...values) => {
  // Return a chainable object that resolves to a mock result
  return {
    cwd: function() { return this; },
    env: function() { return this; },
    quiet: function() { return this; },
    nothrow: async function() {
      return {
        exitCode: 0,
        stdout: Buffer.from(''),
        stderr: Buffer.from('')
      };
    }
  };
};

// Export as default for compatibility
export default { $ };
