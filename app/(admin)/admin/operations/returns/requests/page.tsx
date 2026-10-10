import { Metadata } from "next";
import { OperationsReturnsClient } from "@/features/returns/components/OperationsReturnsClient";

export const metadata: Metadata = {
  title: "Return Requests | Operations | Anchor Fashion",
  description: "Enterprise reverse logistics, inspection, and refund management.",
};

export const dynamic = "force-dynamic";

export default function OperationsReturnsPage() {
  return (
    <div className="p-6">
      <OperationsReturnsClient />
    </div>
  );
}
