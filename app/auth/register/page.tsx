import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { RegisterForm } from "@/features/auth/components/register-form";
import { ReferralCapture } from "./referral-capture";

export const metadata: Metadata = {
  title: "Create an account | Anchor Fashion",
  description: "Join Anchor Fashion to manage your orders, wishlist, and more.",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center">
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      {/* Logo */}
      <div className="mb-6">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Anchor Fashion"
            width={200}
            height={60}
            style={{ width: "auto", height: "auto" }}
            className="max-w-[200px]"
            priority
          />
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-8 text-slate-900 dark:text-slate-100">
        Create an Account
      </h1>

      <div className="w-full">
        <RegisterForm />
      </div>

      <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-[#C9A86A] hover:underline font-medium"
        >
          Login
        </Link>
      </p>

      <p className="mx-auto mt-4 max-w-sm px-8 text-center text-xs text-muted-foreground/80">
        By clicking continue, you agree to our{" "}
        <Link
          href="/terms"
          className="hover:text-foreground underline"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="hover:text-foreground underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
