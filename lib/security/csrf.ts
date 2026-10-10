import { cookies } from "next/headers";
import crypto from "crypto";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Enterprise CSRF Protection Utility
 * Helps mitigate Cross-Site Request Forgery attacks.
 */
export const CSRFService = {
  /**
   * Generates a new CSRF token and sets it as an HTTP-only cookie.
   * Typically called on page load or auth state change.
   */
  async generateToken(): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");
    const cookieStore = await cookies();
    cookieStore.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    return token;
  },

  /**
   * Validates a provided token against the one stored in the cookie.
   */
  async validateToken(requestHeaderToken: string | null): Promise<boolean> {
    if (!requestHeaderToken) return false;

    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    if (!cookieToken) return false;

    // Use timing-safe equal to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(requestHeaderToken)
    );
  },
};
