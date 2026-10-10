import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Dashboard | Anchor Fashion",
  description: "Enterprise Inventory Analytics",
};

export default function InventoryDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Inventory Analytics</h2>
      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
        <p className="text-muted-foreground">
          Real-time inventory levels, stockout risks, and warehouse distribution
          metrics.
        </p>
      </div>
    </div>
  );
}
