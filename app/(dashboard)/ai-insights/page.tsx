import { Metadata } from "next";
import { getSystemAlerts } from "@/actions/ops.actions";

export const metadata: Metadata = {
  title: "AI Insights | Anchor Fashion",
  description: "Enterprise AI Operations and Predictions",
};

export default async function AIOpsDashboardPage() {
  const { data: alerts } = await getSystemAlerts(5);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          AI Insights Center
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <div className="rounded-xl border border-blue-500/20 bg-blue-50/5 bg-card p-6 text-card-foreground shadow dark:bg-blue-900/10">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-medium tracking-tight">
            ✨ Demand Forecasting
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Based on historical data and current market trends, we predict a 24%
            surge in demand for 'Summer Collection' in the next 14 days.
          </p>
          <div className="text-sm font-medium text-blue-600">
            Action: Increase warehouse staffing by 10%
          </div>
        </div>

        <div className="rounded-xl border border-purple-500/20 bg-card bg-purple-50/5 p-6 text-card-foreground shadow dark:bg-purple-900/10">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-medium tracking-tight">
            ✨ Inventory Optimization
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            AI analysis shows that 'Winter Coats (SKU: WC-890)' are at risk of
            overstock. Recommend applying a 15% discount to clear inventory
            before season end.
          </p>
          <div className="text-sm font-medium text-purple-600">
            Action: Generate promotional campaign
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-2 rounded-xl border bg-card p-6 text-card-foreground shadow">
          <h3 className="mb-4 text-lg font-semibold">
            Customer Lifetime Value (CLV) Predictions
          </h3>
          <div className="flex h-[250px] items-center justify-center rounded-md border border-dashed bg-muted/20">
            <span className="text-muted-foreground">
              CLV Distribution Chart
            </span>
          </div>
        </div>
        <div className="col-span-1 rounded-xl border bg-card p-6 text-card-foreground shadow">
          <h3 className="mb-4 text-lg font-semibold">
            System Alerts (AI Detected)
          </h3>
          <div className="space-y-4">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert, i) => (
                <div key={i} className="flex flex-col space-y-1">
                  <span
                    className={`text-sm font-medium ${alert.severity === "CRITICAL" ? "text-red-500" : "text-orange-500"}`}
                  >
                    {alert.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {alert.description || "Automated anomaly detection"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No active AI alerts.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
