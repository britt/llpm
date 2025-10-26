/* eslint-disable @typescript-eslint/no-unused-vars */
export interface WaitForStateOptions {
  /**
   * Maximum time to wait in milliseconds (default: 5000)
   */
  timeout?: number;

  /**
   * Interval between checks in milliseconds (default: 50)
   */
  interval?: number;

  /**
   * Optional description for better error messages
   */
  description?: string;
}

/**
 * Waits for a state condition to become true.
 *
 * Useful for testing async state updates in React hooks.
 * Polls the predicate function at regular intervals until it returns true
 * or the timeout is reached.
 *
 * @param predicate - Function that returns true when the desired state is reached
 * @param options - Configuration options
 * @returns Promise that resolves when condition is met
 * @throws Error if timeout is reached before condition becomes true
 *
 * @example
 * ```typescript
 * // Wait for loading state to become false
 * await waitForState(() => !isLoading, {
 *   timeout: 2000,
 *   description: 'loading to complete'
 * });
 *
 * // Wait for messages to be populated
 * await waitForState(() => messages.length > 0);
 * ```
 */
export async function waitForState(
  predicate: () => boolean | Promise<boolean>,
  options: WaitForStateOptions = {}
): Promise<void> {
  const { timeout = 5000, interval = 50, description } = options;

  const startTime = Date.now();

  while (true) {
    // Check if timeout exceeded
    if (Date.now() - startTime >= timeout) {
      const errorMessage = description
        ? `Timeout waiting for state condition: ${description}`
        : 'Timeout waiting for state condition';
      throw new Error(errorMessage);
    }

    try {
      // Evaluate the predicate (handle both sync and async)
      const result = await Promise.resolve(predicate());

      if (result) {
        // Condition met!
        return;
      }
    } catch (error) {
      // Predicate threw an error - continue polling
      // This allows tests to wait for state to stabilize
    }

    // Wait for the interval before checking again
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}
