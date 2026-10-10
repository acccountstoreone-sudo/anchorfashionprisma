import { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Secure Checkout | Anchor Fashion",
  description: "Complete your purchase securely.",
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <header className="border-b py-4">
        <div className="container mx-auto flex items-center justify-between px-4">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            ANCHOR<span className="text-primary">.</span>
          </Link>
          <div className="flex items-center text-sm font-medium text-slate-500">
            <Lock className="mr-2 h-4 w-4 text-green-600" />
            Secure Checkout
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-12 border-t bg-slate-50 py-6 dark:bg-slate-900">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} Anchor Fashion Enterprise. All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
