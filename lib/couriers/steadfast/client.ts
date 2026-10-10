import { logCourierApiCall } from "../logger";
import {
  CourierNotConfiguredError,
  CourierNetworkError,
  CourierRateLimitError,
  CourierValidationError,
  CourierError,
} from "../errors";

export interface SteadfastCredentials {
  apiKey: string;
  secretKey: string;
}

export interface SteadfastClientConfig {
  credentials: SteadfastCredentials;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class SteadfastClient {
  readonly baseUrl: string;
  readonly credentials: SteadfastCredentials;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: SteadfastClientConfig) {
    this.credentials = config.credentials;
    this.baseUrl = config.baseUrl || "https://portal.packzy.com/api/v1";
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.maxRetries = config.maxRetries ?? 2;
  }

  isConfigured(): boolean {
    return Boolean(
      this.credentials.apiKey?.trim() && this.credentials.secretKey?.trim()
    );
  }

  async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<{ data: T; status: number; durationMs: number }> {
    if (!this.isConfigured()) {
      throw new CourierNotConfiguredError("steadfast");
    }

    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}`;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      attempt++;
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Api-Key": this.credentials.apiKey,
          "Secret-Key": this.credentials.secretKey,
        };

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        let responseData: any;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        // Log API call
        await logCourierApiCall({
          courierCode: "steadfast",
          method,
          endpoint: cleanPath,
          statusCode: response.status,
          success: response.ok,
          responseTimeMs: durationMs,
          payload: body,
          responseData,
        });

        if (response.ok) {
          return { data: responseData as T, status: response.status, durationMs };
        }

        // Handle transient errors
        if (response.status === 429) {
          if (attempt <= this.maxRetries) {
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
            continue;
          }
          throw new CourierRateLimitError("steadfast", "Steadfast rate limit exceeded");
        }

        if ([500, 502, 503, 504].includes(response.status)) {
          if (attempt <= this.maxRetries) {
            await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
            continue;
          }
          throw new CourierNetworkError(
            "steadfast",
            `Steadfast server error HTTP ${response.status}: ${JSON.stringify(responseData)}`
          );
        }

        // Validation / client error
        const msg =
          responseData?.message ||
          (responseData?.errors ? JSON.stringify(responseData.errors) : `HTTP ${response.status}`);
        throw new CourierValidationError("steadfast", msg);
      } catch (err: any) {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        if (err.name === "AbortError") {
          lastError = new CourierNetworkError("steadfast", `Request timed out after ${this.timeoutMs}ms`);
        } else {
          lastError = err;
        }

        await logCourierApiCall({
          courierCode: "steadfast",
          method,
          endpoint: cleanPath,
          statusCode: 0,
          success: false,
          responseTimeMs: durationMs,
          payload: body,
          errorMessage: lastError?.message,
        });

        if (
          err instanceof CourierValidationError ||
          (err instanceof CourierError && !err.isTransient)
        ) {
          throw err;
        }

        if (attempt > this.maxRetries) {
          throw lastError;
        }

        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }

    throw lastError || new CourierNetworkError("steadfast", "Unknown error contacting Steadfast API");
  }
}
