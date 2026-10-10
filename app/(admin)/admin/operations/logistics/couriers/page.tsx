import { Metadata } from "next";
import { CourierListClient } from "@/features/admin/components/shipping/CourierListClient";
import { getCourierProvidersAction } from "@/actions/logistics.actions";

export const metadata: Metadata = {
  title: "Courier Integration | Anchor Fashion Enterprise",
  description: "Manage 3PL Logistics Providers and Delivery APIs",
};

export const dynamic = "force-dynamic";

export default async function CouriersPage() {
  const res = await getCourierProvidersAction();
  const initialCouriers = res.success && res.data ? res.data : [];

  return <CourierListClient initialCouriers={initialCouriers} />;
}
