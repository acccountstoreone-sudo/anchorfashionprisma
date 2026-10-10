/**
 * Enterprise Database Logger
 * Intercepts or wraps DB calls to log slow queries and errors.
 * Suitable for integration with Datadog, Winston, or Sentry.
 */
export class DbLogger {
  private static SLOW_QUERY_THRESHOLD_MS = 1000;

  static async logExecutionTime<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;

      if (duration > this.SLOW_QUERY_THRESHOLD_MS) {
        console.warn(
          `[SLOW DB QUERY] ${operationName} took ${duration.toFixed(2)}ms`
        );
      }
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(
        `[DB ERROR] ${operationName} failed after ${duration.toFixed(2)}ms`,
        error
      );
      throw error;
    }
  }

  static info(message: string, meta?: any) {
    console.warn(`[DB INFO] ${message}`, meta || "");
  }

  static error(message: string, error?: any) {
    console.error(`[DB ERROR] ${message}`, error || "");
  }
}
