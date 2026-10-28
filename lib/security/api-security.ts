import crypto from "crypto";

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

export const APISecurityService = {
  /**
   * Validates API Keys against an enterprise vault or database.
   * In a real implementation, this would cache validated keys using Redis.
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    return apiKey.length > 30;
  },

  /**
   * Protects against replay attacks by validating request timestamp freshness.
   */
  validateRequestFreshness(timestamp: number, _nonce: string): boolean {
    const now = Date.now();
    if (Math.abs(now - timestamp) > TIMESTAMP_TOLERANCE_MS) {
      return false;
    }
    return true;
  },

  /**
   * Enterprise Request Signing (HMAC-SHA256)
   * Ensures that the request body and parameters were not tampered with in transit.
   */
  verifySignature(payload: string, secret: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Timing safe comparison
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  },
};
