import { NextResponse } from "next/server";
import { logServerError } from "@/lib/utils/error-handler";
import { cookies } from "next/headers";
import { CartService } from "@/lib/services/cart.service";
import { ReferralService } from "@/services/referral.service";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, otp, name, password, phone } = await request.json();

    if (!email || !otp || !name || !password) {
      return NextResponse.json(
        { error: "Missing required fields: email, otp, name, and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. We are simulating OTP verification since Supabase is removed
    if (otp !== "123456" && otp.length < 4) {
      // Just a mock check, in production use proper Auth provider
      return NextResponse.json(
        { error: "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    // 2. Mock creating a user in DB directly (Prisma)
    // Normally your new Auth provider (NextAuth, Neon Auth) handles the core user creation
    const userId = "user_" + Math.random().toString(36).substring(2, 9);
    
    // Create profile
    try {
      await prisma.profile.upsert({
        where: { email: cleanEmail },
        update: {},
        create: {
          id: userId,
          email: cleanEmail,
          firstName: name.split(" ")[0] || name,
          lastName: name.split(" ").slice(1).join(" ") || "",
          role: "customer"
        }
      });
    } catch (e) {
      console.warn("Could not upsert profile, maybe it exists?", e);
    }

    // 3. Merge guest cart if applicable
    const cookieStore = await cookies();
    const guestSessionId = cookieStore.get("af_guest_session")?.value;
    if (guestSessionId) {
      try {
        await CartService.mergeGuestCart(guestSessionId, userId);
        cookieStore.delete("af_guest_session");
      } catch (mergeError) {
        logServerError("AUTH_REGISTER_CART_MERGE", mergeError, { userId });
      }
    }

    // 4. Process Referral Attribution
    const referralCode = cookieStore.get("af_referral_code")?.value;
    if (referralCode) {
      try {
        await ReferralService.attributeReferral(referralCode, userId);
      } catch (refError) {
        logServerError("AUTH_REGISTER_REFERRAL", refError, { userId });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Registration successful (Mocked for Migration)",
      user: { id: userId, email: cleanEmail, name },
    });
  } catch (error: any) {
    logServerError("AUTH_VERIFY_REGISTER_FATAL", error);
    return NextResponse.json({ error: "Internal server error occurred." }, { status: 500 });
  }
}
