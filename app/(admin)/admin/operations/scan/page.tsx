import { Metadata } from "next";
import { ScanStationClient } from "@/features/operations/components/ScanStationClient";

export const metadata: Metadata = {
  title: "Scan Station | Operations | Anchor Fashion",
  description: "Barcode and QR scanning station for rapid inventory auditing, stock reception, and dispatch.",
};

export const dynamic = "force-dynamic";

export default function ScanStationPage() {
  return (
    <div className="p-6">
      <ScanStationClient />
    </div>
  );
}
