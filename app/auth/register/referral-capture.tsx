"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ReferralCapture() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      // Set the af_referral_code cookie (valid for 30 days)
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      document.cookie = `af_referral_code=${encodeURIComponent(ref)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    }
  }, [searchParams]);

  return null;
}
