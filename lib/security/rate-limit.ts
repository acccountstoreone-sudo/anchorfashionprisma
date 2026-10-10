// A simple in-memory rate limiter for Edge Runtime
// Note: For a production enterprise app across distributed servers,
// you would typically use Redis (e.g., Upstash) for rate limiting.
// This serves as an interface and basic implementation.

interface RateLimitTracker {
  count: number;
  expiresAt: number;
}

const store = new Map<string, RateLimitTracker>();

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 5, windowMs: 60000 }
) {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || record.expiresAt < now) {
    store.set(identifier, {
      count: 1,
      expiresAt: now + config.windowMs,
    });
    return { success: true, remaining: config.limit - 1 };
  }

  if (record.count >= config.limit) {
    return { success: false, remaining: 0 };
  }

  record.count += 1;
  store.set(identifier, record);

  return { success: true, remaining: config.limit - record.count };
}

export function clearRateLimit(identifier: string) {
  store.delete(identifier);
}
