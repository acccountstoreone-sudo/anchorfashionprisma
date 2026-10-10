import { Metadata } from "next";
import { OperationsAnalyticsClient } from "@/features/operations/components/OperationsAnalyticsClient";

export const metadata: Metadata = {
  title: "Operations Analytics | Anchor Fashion",
  description: "Real-time supply chain velocity, inventory turnover, and fulfillment intelligence.",
};

export const dynamic = "force-dynamic";

export default function OperationsAnalyticsPage() {
  return (
    <div className="p-6">
      <OperationsAnalyticsClient />
    </div>
  );
}
