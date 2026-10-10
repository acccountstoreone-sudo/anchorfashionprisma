import { Metadata } from "next";
import { CourierListClient } from "@/features/admin/components/shipping/CourierListClient";
import { getCourierProvidersAction } from "@/actions/logistics.actions";

export const metadata: Metadata = {
  title: "Courier Providers & Integrations | Admin Dashboard",
  description: "Manage 3PL logistics partners, live API health, and COD settlements.",
};

export const dynamic = "force-dynamic";

export default async function ShippingCouriersPage() {
  const res = await getCourierProvidersAction();
  const initialCouriers = res.success && res.data ? res.data : [];

  return <CourierListClient initialCouriers={initialCouriers} />;
}
