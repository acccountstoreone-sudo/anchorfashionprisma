import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication | Anchor Fashion",
  description: "Sign in to your Anchor Fashion account.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 transition-colors overflow-hidden">
      {/* Subtle decorative blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#C9A86A]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#C9A86A]/8 blur-3xl"
      />

      {/* Card */}
      <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 p-8 text-slate-900 dark:text-slate-100 transition-all">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-slate-400 dark:text-slate-600 text-center select-none">
        &copy; {new Date().getFullYear()} Anchor Fashion. All rights reserved.
      </p>
    </div>
  );
}
