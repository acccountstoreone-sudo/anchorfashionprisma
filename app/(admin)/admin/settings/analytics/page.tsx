import { Metadata } from "next";
import { getAnalyticsSettings } from "@/lib/actions/settings.actions";
import { AnalyticsSettingsClient } from "./AnalyticsSettingsClient";

export const metadata: Metadata = {
  title: "Analytics Settings | Admin",
  description: "Configure third-party analytics and tracking integrations.",
};

export const dynamic = "force-dynamic";

export default async function AnalyticsSettingsPage() {
  const analyticsConfig = await getAnalyticsSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Tracking</h1>
        <p className="mt-1 text-muted-foreground">
          Integrate third-party tracking, pixel measurement, and analytics tools.
        </p>
      </div>

      <AnalyticsSettingsClient initialConfig={analyticsConfig} />
    </div>
  );
}
