import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operations Center | Anchor Fashion",
  description: "Enterprise Operations, Monitoring, and SRE",
};

export default function OperationsDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Operations Center</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-green-500/20 bg-card bg-green-50/5 p-6 text-card-foreground shadow">
          <h3 className="mb-2 text-sm font-medium tracking-tight">
            System Status
          </h3>
          <div className="text-2xl font-bold text-green-600">
            All Systems Operational
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Uptime: 99.99%</p>
        </div>
        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
          <h3 className="mb-2 text-sm font-medium tracking-tight">
            Active Jobs
          </h3>
          <div className="text-2xl font-bold">14</div>
          <p className="mt-1 text-xs text-muted-foreground">
            2 Failed, 12 Running
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
          <h3 className="mb-2 text-sm font-medium tracking-tight">
            API Latency
          </h3>
          <div className="text-2xl font-bold">45ms</div>
          <p className="mt-1 text-xs text-muted-foreground">p95: 120ms</p>
        </div>
        <div className="rounded-xl border border-orange-500/20 bg-card p-6 text-card-foreground shadow">
          <h3 className="mb-2 text-sm font-medium tracking-tight">
            Open Alerts
          </h3>
          <div className="text-2xl font-bold text-orange-600">3</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Requires attention
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
          <h3 className="mb-4 text-lg font-semibold">Service Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">PostgreSQL Database</span>
              <span className="flex items-center gap-1 text-sm font-bold text-green-600">
                <span className="inline-block h-2 w-2 rounded-full bg-green-600"></span>{" "}
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Redis Cache</span>
              <span className="flex items-center gap-1 text-sm font-bold text-green-600">
                <span className="inline-block h-2 w-2 rounded-full bg-green-600"></span>{" "}
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Payment Gateway API</span>
              <span className="flex items-center gap-1 text-sm font-bold text-green-600">
                <span className="inline-block h-2 w-2 rounded-full bg-green-600"></span>{" "}
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Inventory Sync Worker</span>
              <span className="flex items-center gap-1 text-sm font-bold text-orange-500">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-orange-500"></span>{" "}
                Degraded
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
          <h3 className="mb-4 text-lg font-semibold">Recent System Logs</h3>
          <div className="h-[200px] space-y-2 overflow-y-auto rounded-md bg-muted/30 p-4 font-mono text-xs">
            <div className="text-gray-500">
              [2026-07-27 12:40:01] <span className="text-blue-500">INFO</span>{" "}
              - Backup job started
            </div>
            <div className="text-gray-500">
              [2026-07-27 12:41:22]{" "}
              <span className="text-green-500">SUCCESS</span> - Backup job
              completed
            </div>
            <div className="text-gray-500">
              [2026-07-27 12:42:05]{" "}
              <span className="text-yellow-500">WARN</span> - High memory usage
              on instance i-0a8b9c
            </div>
            <div className="text-gray-500">
              [2026-07-27 12:43:10] <span className="text-red-500">ERROR</span>{" "}
              - Failed to sync inventory for SKU WC-890
            </div>
            <div className="text-gray-500">
              [2026-07-27 12:43:15] <span className="text-blue-500">INFO</span>{" "}
              - Retrying inventory sync (1/3)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
