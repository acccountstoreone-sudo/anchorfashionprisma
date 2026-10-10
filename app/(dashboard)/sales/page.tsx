import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales Dashboard | Anchor Fashion",
  description: "Enterprise Sales Analytics",
};

export default function SalesDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Sales Analytics</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
          <h3 className="mb-2 text-sm font-medium tracking-tight">
            Today's Sales
          </h3>
          <div className="text-2xl font-bold">$12,450</div>
          <p className="text-xs text-green-600">+14% vs yesterday</p>
        </div>
        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
          <h3 className="mb-2 text-sm font-medium tracking-tight">
            Conversion Rate
          </h3>
          <div className="text-2xl font-bold">3.2%</div>
          <p className="text-xs text-muted-foreground">Average: 2.8%</p>
        </div>
        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
          <h3 className="mb-2 text-sm font-medium tracking-tight">
            Average Order Value
          </h3>
          <div className="text-2xl font-bold">$145.20</div>
          <p className="text-xs text-green-600">+2.4% vs last week</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border bg-card p-6 text-card-foreground shadow">
        <h3 className="mb-4 text-lg font-semibold">Live Orders Stream</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  Order #ORD-{9000 + i}
                </span>
                <span className="text-xs text-muted-foreground">Just now</span>
              </div>
              <div className="text-sm font-medium text-green-600">
                ${(Math.random() * 200 + 50).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
