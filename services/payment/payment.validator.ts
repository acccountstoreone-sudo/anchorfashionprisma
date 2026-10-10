import { z } from "zod";
import crypto from "crypto";

export class PaymentValidator {
  /**
   * Generates an idempotency key from a payload
   */
  static generateIdempotencyKey(payload: any): string {
    const stringified =
      typeof payload === "string" ? payload : JSON.stringify(payload);
    return crypto.createHash("sha256").update(stringified).digest("hex");
  }

  /**
   * Validates if a webhook payload is stale (replay protection)
   * Example assumes timestamp in payload is in milliseconds or ISO format
   */
  static isReplayAttack(
    timestamp: string | number,
    maxAgeMs: number = 300000
  ): boolean {
    // 5 mins
    const now = Date.now();
    const eventTime = new Date(timestamp).getTime();

    if (isNaN(eventTime)) return false; // Can't validate

    return now - eventTime > maxAgeMs;
  }

  /**
   * Format generic zod validation errors
   */
  static formatZodError(error: z.ZodError): string {
    return error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
  }
}
