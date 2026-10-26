import { NextResponse } from "next/server";

/**
 * DISABLED: this endpoint was a migration-era mock. It accepted ANY verification
 * code of 4+ characters, was unauthenticated, and triggered cart-merge and
 * referral attribution for an arbitrary identity. Nothing in the app calls it.
 * Registration and email verification are handled by Neon Auth (see /auth/register).
 */
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been retired. Use the standard sign-up flow." },
    { status: 410 }
  );
}
