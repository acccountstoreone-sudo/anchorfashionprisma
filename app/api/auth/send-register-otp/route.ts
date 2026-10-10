import { POST as sendOtpPost } from "../otp/send/route";

/**
 * Legacy alias for /api/auth/otp/send to maintain backwards compatibility
 */
export async function POST(request: Request) {
  return sendOtpPost(request);
}
