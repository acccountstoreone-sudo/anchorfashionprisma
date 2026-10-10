import { Metadata } from "next";
import { getSeoSettings } from "@/lib/actions/settings.actions";
import { SeoSettingsClient } from "./SeoSettingsClient";

export const metadata: Metadata = {
  title: "SEO Settings | Admin",
  description: "Configure search engine optimization and social metadata.",
};

export const dynamic = "force-dynamic";

export default async function SeoSettingsPage() {
  const seoSettings = await getSeoSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search Engine Optimization</h1>
        <p className="mt-1 text-muted-foreground">
          Manage how your store appears on Google, social media platforms, and messaging previews.
        </p>
      </div>

      <SeoSettingsClient initialSettings={seoSettings} />
    </div>
  );
}
