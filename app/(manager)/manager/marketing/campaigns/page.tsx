import React from "react";
import { Metadata } from "next";
import { CampaignBuilderClient } from "@/features/marketing/components/CampaignBuilderClient";

export const metadata: Metadata = {
  title: "Campaign Builder | Marketing | Manager Dashboard",
  description: "Create and dispatch targeted campaigns to your store audiences.",
};

export const dynamic = "force-dynamic";

export default function ManagerCampaignsPage() {
  return <CampaignBuilderClient backHref="/manager/marketing" />;
}
