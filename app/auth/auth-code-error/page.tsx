"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Clock, ArrowLeft, RefreshCw, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";

function AuthCodeErrorContent() {
  const searchParams = useSearchParams();
  const [errorDetails, setErrorDetails] = useState({
    code: searchParams.get("error_code") || searchParams.get("error") || "",
    description: searchParams.get("error_description") || "",
  });

  useEffect(() => {
    // In browsers, Supabase often appends error parameters in the hash fragment:
    // e.g. #error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
    if (typeof window !== "undefined" && window.location.hash) {
      try {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const hCode = hashParams.get("error_code") || hashParams.get("error");
        const hDesc = hashParams.get("error_description");

        if (hCode || hDesc) {
          setErrorDetails({
            code: hCode || errorDetails.code,
            description: hDesc ? decodeURIComponent(hDesc.replace(/\+/g, " ")) : errorDetails.description,
          });
        }
      } catch (e) {
        console.error("Failed to parse hash params:", e);
      }
    }
  }, [errorDetails.code, errorDetails.description]);

  const isExpired =
    errorDetails.code === "otp_expired" ||
    errorDetails.description.toLowerCase().includes("expired") ||
    errorDetails.description.toLowerCase().includes("invalid");

  return (
    <div className="flex flex-col items-center justify-center space-y-5 text-center py-2">
      {/* Icon Badge */}
      <div className="relative">
        <div className="rounded-full bg-rose-100 dark:bg-rose-950/60 p-4 border border-rose-200 dark:border-rose-900">
          {isExpired ? (
            <Clock className="h-10 w-10 text-rose-600 dark:text-rose-400" />
          ) : (
            <AlertCircle className="h-10 w-10 text-rose-600 dark:text-rose-400" />
          )}
        </div>
      </div>

      {/* Heading & Subtext */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isExpired ? "Link Expired or Invalid" : "Authentication Error"}
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {errorDetails.description ||
            (isExpired
              ? "The password reset or sign-in link you clicked has expired or has already been used."
              : "We could not verify your authentication request. Please try requesting a new link.")}
        </p>
      </div>

      {/* Security explanation note */}
      <div className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3.5 text-xs text-muted-foreground text-left space-y-1">
        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span>Security Notice</span>
        </div>
        <p>
          For your account security, password reset and verification links expire quickly and can only be used once.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col w-full gap-2.5 pt-2">
        <Link href="/auth/forgot-password" className="w-full">
          <Button className="w-full h-11 font-medium bg-[#C9A86A] hover:bg-[#b09156] text-white">
            <RefreshCw className="mr-2 h-4 w-4" />
            Request New Reset Link
          </Button>
        </Link>

        <Link href="/auth/login" className="w-full">
          <Button variant="outline" className="w-full h-11">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </Link>
      </div>

      {/* Help Link */}
      <div className="pt-2 text-xs text-muted-foreground">
        Need assistance?{" "}
        <Link href="/contact" className="underline underline-offset-4 text-primary hover:text-primary/80 font-medium">
          Contact Support
        </Link>
      </div>
    </div>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading error details...</p>
        </div>
      }
    >
      <AuthCodeErrorContent />
    </Suspense>
  );
}
