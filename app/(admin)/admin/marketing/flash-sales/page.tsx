import React from "react";
import { Metadata } from "next";
import { FlashSaleService } from "@/lib/services/marketing/flash-sale.service";
import { FlashSalesClient } from "./FlashSalesClient";

export const metadata: Metadata = {
  title: "Flash Sales | Marketing | Anchor Fashion Enterprise",
  description: "Manage flash deals and countdown sales",
};

export const dynamic = "force-dynamic";

export default async function AdminFlashSalesPage() {
  const flashSales = await FlashSaleService.getAllFlashSales();

  return <FlashSalesClient initialFlashSales={flashSales} />;
}
