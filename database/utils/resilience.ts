/**
 * Retry Options Configuration
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

/**
 * Exponential Backoff Retry Execution
 * Wraps async database calls to handle transient network or lock errors.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const initialDelayMs = options?.initialDelayMs ?? 500;
  const backoffFactor = options?.backoffFactor ?? 2;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;

      // Determine if error is transient (e.g., lock timeout, connection failure)
      // Postgres lock timeout is '55P03', connection issues might be generic network errors
      const isTransient =
        error.code === "55P03" || error.message?.includes("fetch");

      if (!isTransient || attempt >= maxRetries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }

  throw new Error("Maximum retries exceeded");
}
