import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Forgot Password | Anchor Fashion",
  description: "Request a password reset link for your Anchor Fashion account.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Logo */}
      <Link href="/" aria-label="Go to homepage">
        <Image
          src="/logo.png"
          alt="Anchor Fashion"
          width={180}
          height={50}
          style={{ width: "auto", height: "auto" }}
          className="max-w-[160px]"
          priority
        />
      </Link>

      {/* Heading */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Forgot your password?
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-slate-200 dark:bg-slate-700/60" />

      {/* Form */}
      <div className="w-full">
        <ForgotPasswordForm />
      </div>

      {/* Back to login */}
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-[#C9A86A] transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Sign In
      </Link>
    </div>
  );
}
