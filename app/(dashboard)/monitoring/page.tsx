import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monitoring Dashboard | Anchor Fashion",
  description: "Enterprise System Monitoring",
};

export default function MonitoringDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">
        Monitoring & Observability
      </h2>
      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
        <p className="text-muted-foreground">
          Detailed application performance monitoring, tracing, and
          infrastructure health metrics.
        </p>
      </div>
    </div>
  );
}
