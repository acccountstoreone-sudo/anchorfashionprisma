import { Metadata } from "next";
import { ChangePassword } from "@/components/customer/ChangePassword";
import { SecuritySettings } from "@/components/customer/SecuritySettings";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  fetchLoginHistoryAction,
  fetchActiveSessionsAction,
} from "@/app/actions/customer.actions";

export const metadata: Metadata = {
  title: "Security | Anchor Fashion",
  description: "Manage your account security.",
};

export default async function SecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/account/security");
  }

  // Fetch security data
  const [historyRes, sessionsRes] = await Promise.all([
    fetchLoginHistoryAction(),
    fetchActiveSessionsAction(),
  ]);

  const loginHistory =
    historyRes.success && historyRes.data ? historyRes.data : [];
  const activeSessions =
    sessionsRes.success && sessionsRes.data ? sessionsRes.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Security</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your password, login history, and security preferences.
        </p>
      </div>

      <div className="grid gap-6">
        <ChangePassword />
        <SecuritySettings
          loginHistory={loginHistory}
          activeSessions={activeSessions}
        />
      </div>
    </div>
  );
}
