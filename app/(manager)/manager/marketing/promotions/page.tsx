import React from "react";
import { Metadata } from "next";
import { PromotionRepository } from "@/lib/repositories/marketing/promotion.repository";
import { PromotionsClient } from "@/features/marketing/components/PromotionsClient";

export const metadata: Metadata = {
  title: "Flash Sales & Promotions | Manager Dashboard",
  description: "Manage seasonal promotions, discount campaigns, and flash sales.",
};

export const dynamic = "force-dynamic";

export default async function ManagerPromotionsPage() {
  const promotions = await PromotionRepository.getPromotions();

  return <PromotionsClient initialPromotions={promotions} />;
}
