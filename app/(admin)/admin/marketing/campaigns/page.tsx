import React from "react";
import { Metadata } from "next";
import { CampaignBuilderClient } from "@/features/marketing/components/CampaignBuilderClient";

export const metadata: Metadata = {
  title: "Campaign Builder | Marketing | Anchor Fashion Enterprise",
  description: "Create, schedule, and send targeted marketing campaigns via Resend Email and Push channels.",
};

export const dynamic = "force-dynamic";

export default function CampaignBuilderPage() {
  return <CampaignBuilderClient backHref="/admin/marketing" />;
}
