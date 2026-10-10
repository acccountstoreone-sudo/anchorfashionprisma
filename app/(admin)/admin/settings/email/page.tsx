import { Metadata } from "next";
import { getEmailSettings } from "@/lib/actions/settings.actions";
import { EmailSettingsClient } from "./EmailSettingsClient";

export const metadata: Metadata = {
  title: "Email Settings | Admin",
  description: "Configure SMTP and transactional email settings.",
};

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage() {
  const emailSettings = await getEmailSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email & SMTP</h1>
        <p className="mt-1 text-muted-foreground">
          Configure how the system sends transactional emails, order receipts, and alerts.
        </p>
      </div>

      <EmailSettingsClient initialConfig={emailSettings} />
    </div>
  );
}
