import { describe, it, expect } from 'vitest';
import { waitForState } from './waitForState';

describe('waitForState', () => {
  it('should resolve immediately if condition is already true', async () => {
    const predicate = () => true;
    const startTime = Date.now();

    await waitForState(predicate);

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(100); // Should be almost instant
  });

  it('should wait for condition to become true', async () => {
    let counter = 0;
    const predicate = () => counter >= 3;

    // Simulate state changes
    setTimeout(() => {
      counter = 1;
    }, 50);
    setTimeout(() => {
      counter = 2;
    }, 100);
    setTimeout(() => {
      counter = 3;
    }, 150);

    // Should resolve once counter >= 3
    await waitForState(predicate, { timeout: 1000, interval: 10 });

    expect(counter).toBe(3);
  });

  it('should timeout if condition never becomes true', async () => {
    const predicate = () => false;

    await expect(waitForState(predicate, { timeout: 100, interval: 10 })).rejects.toThrow(
      'Timeout waiting for state condition'
    );
  });

  it('should use custom timeout', async () => {
    const predicate = () => false;

    const startTime = Date.now();

    try {
      await waitForState(predicate, { timeout: 200, interval: 10 });
      throw new Error('Should have timed out');
    } catch (error) {
      const elapsed = Date.now() - startTime;
      // Should timeout around 200ms
      expect(elapsed).toBeGreaterThanOrEqual(190);
      expect(elapsed).toBeLessThan(300);
      expect((error as Error).message).toContain('Timeout waiting for state condition');
    }
  });

  it('should use custom interval for checking', async () => {
    let checkCount = 0;
    const predicate = () => {
      checkCount++;
      return checkCount >= 5;
    };

    await waitForState(predicate, { interval: 20, timeout: 1000 });

    // Should have checked at least 5 times
    expect(checkCount).toBeGreaterThanOrEqual(5);
  });

  it('should include description in timeout error', async () => {
    const predicate = () => false;

    await expect(
      waitForState(predicate, {
        timeout: 100,
        interval: 10,
        description: 'loading state to become false'
      })
    ).rejects.toThrow('Timeout waiting for state condition: loading state to become false');
  });

  it('should work with async predicates', async () => {
    let value = 0;
    const asyncPredicate = async () => {
      await Promise.resolve();
      return value >= 2;
    };

    // Change state asynchronously
    setTimeout(() => {
      value = 1;
    }, 50);
    setTimeout(() => {
      value = 2;
    }, 100);

    await waitForState(asyncPredicate, { timeout: 500, interval: 10 });

    expect(value).toBe(2);
  });

  it('should handle predicate errors gracefully', async () => {
    let shouldError = true;
    const predicate = () => {
      if (shouldError) {
        throw new Error('Predicate error');
      }
      return true;
    };

    // Fix the error after a delay
    setTimeout(() => {
      shouldError = false;
    }, 100);

    // Should eventually succeed once predicate stops throwing
    await waitForState(predicate, { timeout: 500, interval: 10 });

    expect(shouldError).toBe(false);
  });

  it('should use default timeout and interval if not specified', async () => {
    let value = false;
    const predicate = () => value;

    // Set value to true after a short delay
    setTimeout(() => {
      value = true;
    }, 50);

    // Should use defaults (timeout: 5000, interval: 50)
    await waitForState(predicate);

    expect(value).toBe(true);
  });

  it('should work with complex state conditions', async () => {
    const state = {
      loading: true,
      data: null as string | null,
      error: null as Error | null
    };

    const predicate = () => !state.loading && state.data !== null;

    // Simulate async operation
    setTimeout(() => {
      state.loading = false;
      state.data = 'Loaded data';
    }, 100);

    await waitForState(predicate, { timeout: 500, interval: 10 });

    expect(state.loading).toBe(false);
    expect(state.data).toBe('Loaded data');
  });
});
