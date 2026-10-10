import React from "react";
import { Metadata } from "next";
import { PromotionRepository } from "@/lib/repositories/marketing/promotion.repository";
import { PromotionsClient } from "@/features/marketing/components/PromotionsClient";

export const metadata: Metadata = {
  title: "Promotions | Marketing | Anchor Fashion Enterprise",
  description: "Manage seasonal promotions, discount codes, and flash sales",
};

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  const promotions = await PromotionRepository.getPromotions();

  return <PromotionsClient initialPromotions={promotions} />;
}
