import { Metadata } from "next";
import { getStoreInfo, getSocialLinks } from "@/lib/actions/settings.actions";
import { GeneralSettingsForm } from "./GeneralSettingsForm";

export const metadata: Metadata = {
  title: "General Settings | Admin",
};

export const revalidate = 0;

export default async function GeneralSettingsPage() {
  const [storeInfo, socialLinks] = await Promise.all([
    getStoreInfo(),
    getSocialLinks(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">General Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your store&apos;s contact information, branding, and social
          media presence.
        </p>
      </div>
      <GeneralSettingsForm
        initialStoreInfo={storeInfo}
        initialSocialLinks={socialLinks}
      />
    </div>
  );
}
