import { Metadata } from "next";
import { getSecuritySettings } from "@/lib/actions/settings.actions";
import { SecuritySettingsClient } from "./SecuritySettingsClient";

export const metadata: Metadata = {
  title: "Security Policies | Admin",
  description: "Configure system security policies and session management.",
};

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const securityConfig = await getSecuritySettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security & Privacy</h1>
        <p className="mt-1 text-muted-foreground">
          Manage system security policies, access controls, and session guardrails.
        </p>
      </div>

      <SecuritySettingsClient initialConfig={securityConfig} />
    </div>
  );
}
