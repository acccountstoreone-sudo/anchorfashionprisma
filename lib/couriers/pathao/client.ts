import { PathaoAuthManager, PathaoCredentials } from "./auth";
import { logCourierApiCall } from "../logger";
import {
  CourierNetworkError,
  CourierRateLimitError,
  CourierValidationError,
  CourierError,
} from "../errors";

export interface PathaoClientConfig {
  baseUrl: string;
  credentials: PathaoCredentials;
  timeoutMs?: number;
  maxRetries?: number;
}

export class PathaoClient {
  readonly baseUrl: string;
  readonly auth: PathaoAuthManager;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: PathaoClientConfig) {
    this.baseUrl = config.baseUrl;
    this.auth = new PathaoAuthManager(config.baseUrl, config.credentials);
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.maxRetries = config.maxRetries ?? 2;
  }

  isConfigured(): boolean {
    return this.auth.isConfigured();
  }

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    requiresAuth = true
  ): Promise<{ data: T; status: number; durationMs: number }> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
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
          Accept: "application/json",
        };

        if (requiresAuth) {
          const token = await this.auth.getAccessToken();
          headers["Authorization"] = `Bearer ${token}`;
        }

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
          courierCode: "pathao",
          method,
          endpoint: path,
          statusCode: response.status,
          success: response.ok,
          responseTimeMs: durationMs,
          payload: body,
          responseData,
        });

        if (response.ok) {
          return { data: responseData as T, status: response.status, durationMs };
        }

        // Check if transient and should retry
        if (response.status === 429) {
          if (attempt <= this.maxRetries) {
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
            continue;
          }
          throw new CourierRateLimitError("pathao", "Pathao rate limit exceeded");
        }

        if ([500, 502, 503, 504].includes(response.status)) {
          if (attempt <= this.maxRetries) {
            await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
            continue;
          }
          throw new CourierNetworkError(
            "pathao",
            `Pathao server error HTTP ${response.status}: ${JSON.stringify(responseData)}`
          );
        }

        if (response.status === 401 && attempt === 1 && requiresAuth) {
          // Token might have expired early; clear cache and retry once
          this.auth.clearCache();
          continue;
        }

        // Client validation error
        const msg =
          responseData?.message ||
          (responseData?.errors ? JSON.stringify(responseData.errors) : `HTTP ${response.status}`);
        throw new CourierValidationError("pathao", msg);
      } catch (err: any) {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        if (err.name === "AbortError") {
          lastError = new CourierNetworkError("pathao", `Request timed out after ${this.timeoutMs}ms`);
        } else {
          lastError = err;
        }

        // Log network failures
        await logCourierApiCall({
          courierCode: "pathao",
          method,
          endpoint: path,
          statusCode: 0,
          success: false,
          responseTimeMs: durationMs,
          payload: body,
          errorMessage: lastError?.message,
        });

        // Do not retry validation or auth errors
        if (
          err instanceof CourierValidationError ||
          err instanceof CourierError && !err.isTransient
        ) {
          throw err;
        }

        if (attempt > this.maxRetries) {
          throw lastError;
        }

        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }

    throw lastError || new CourierNetworkError("pathao", "Unknown error contacting Pathao API");
  }
}
