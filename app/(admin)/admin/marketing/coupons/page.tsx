import React from "react";
import { Metadata } from "next";
import { CouponRepository } from "@/lib/repositories/marketing/coupon.repository";
import { CouponsClient } from "@/features/marketing/components/CouponsClient";

export const metadata: Metadata = {
  title: "Coupon Management | Marketing | Anchor Fashion Enterprise",
  description: "Create and track promotional codes and discount vouchers",
};

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await CouponRepository.getCoupons();

  return <CouponsClient initialCoupons={coupons} />;
}
