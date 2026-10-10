import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { CartService } from "@/lib/services/cart.service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const rawNext = searchParams.get("next") ?? "/account/profile";
  const next = rawNext === "/reset-password" ? "/auth/reset-password" : rawNext;

  // Check if Supabase sent error params directly in the query string
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDesc = searchParams.get("error_description");

  if (errorParam || errorCode || errorDesc) {
    const errParams = new URLSearchParams();
    if (errorParam) errParams.set("error", errorParam);
    if (errorCode) errParams.set("error_code", errorCode);
    if (errorDesc) errParams.set("error_description", errorDesc);
    return NextResponse.redirect(`${origin}/auth/auth-code-error?${errParams.toString()}`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data?.user) {
        try {
          const cookieStore = await cookies();
          const guestSessionId = cookieStore.get("af_guest_session")?.value;
          if (guestSessionId) {
            await CartService.mergeGuestCart(guestSessionId, data.user.id);
            cookieStore.delete("af_guest_session");
          }
        } catch (mergeErr) {
          console.error("Cart merge error in auth callback:", mergeErr);
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalhost = process.env.NODE_ENV === "development";
      if (isLocalhost) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }

    // Exchange failed: pass error details
    const errParams = new URLSearchParams();
    if (error) {
      errParams.set("error", error.name || "auth_error");
      errParams.set("error_code", error.code || "exchange_failed");
      errParams.set("error_description", error.message);
    }
    return NextResponse.redirect(`${origin}/auth/auth-code-error?${errParams.toString()}`);
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
