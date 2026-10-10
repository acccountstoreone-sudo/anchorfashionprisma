import { Metadata } from "next";
import { ChangePassword } from "@/components/customer/ChangePassword";
import Link from "next/link";
import { Shield, ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Security & Password | Manager Dashboard",
  description: "View current credentials and manage manager account password.",
};

export const dynamic = "force-dynamic";

export default function ManagerSecurityPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/manager/settings" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Manager Settings</span>
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
          <KeyRound className="h-7 w-7 text-[#C9A86A]" />
          Account Security & Password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your current login password and update credentials for your manager account.
        </p>
      </div>

      <ChangePassword />
    </div>
  );
}
