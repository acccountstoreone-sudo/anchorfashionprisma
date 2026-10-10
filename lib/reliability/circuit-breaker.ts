/**
 * Enterprise Circuit Breaker Pattern
 * Protects downstream services from cascading failures.
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
  failureThreshold: number; // How many failures before opening
  resetTimeout: number; // How long to stay open before trying again (ms)
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private nextAttempt = Date.now();

  private options: CircuitBreakerOptions;

  constructor(options?: Partial<CircuitBreakerOptions>) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 10000, // 10 seconds
      ...options,
    };
  }

  /**
   * Wraps an async function with the circuit breaker.
   */
  async fire<T>(
    action: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() > this.nextAttempt) {
        this.state = "HALF_OPEN";
      } else {
        if (fallback) return fallback();
        throw new Error("Circuit Breaker is OPEN");
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return fallback();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failureCount += 1;
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.options.resetTimeout;
    }
  }

  public getState() {
    return this.state;
  }
}

// Example global instances for specific services
export const PaymentServiceCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000,
});
export const CourierServiceCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 15000,
});
