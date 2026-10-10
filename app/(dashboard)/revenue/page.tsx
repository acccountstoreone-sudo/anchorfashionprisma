import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Revenue Dashboard | Anchor Fashion",
  description: "Enterprise Revenue Analytics",
};

export default function RevenueDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Revenue Analytics</h2>
      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
        <p className="text-muted-foreground">
          Detailed revenue metrics, MRR, ARR, and profitability margins will be
          displayed here.
        </p>
      </div>
    </div>
  );
}
