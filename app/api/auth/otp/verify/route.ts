import { NextResponse } from "next/server";
import { OtpStore } from "@/lib/auth/otp-store";
import { logServerError } from "@/lib/utils/error-handler";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, otp } = body;

    if (!email || typeof email !== "string" || !otp || typeof otp !== "string") {
      return NextResponse.json(
        { error: "Both email and verification code are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        { error: "Verification code must be a 6-digit numeric code." },
        { status: 400 }
      );
    }

    // Verify and atomically consume/invalidate the OTP
    const result = await OtpStore.verifyAndConsumeOtp(cleanEmail, cleanOtp);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Invalid verification code. Please check and try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification successful. OTP has been validated and cleared.",
      verifiedEmail: cleanEmail,
    });
  } catch (error: any) {
    logServerError("AUTH_OTP_VERIFY_FATAL", error);
    return NextResponse.json(
      { error: "Internal server error occurred while verifying code." },
      { status: 500 }
    );
  }
}
