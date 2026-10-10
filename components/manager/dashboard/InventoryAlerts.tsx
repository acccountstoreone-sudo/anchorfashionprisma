import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, PackageX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetchInventoryAction } from "@/app/actions/manager/inventory.actions";

export async function InventoryAlerts() {
  const result = await fetchInventoryAction(20);
  const allItems = result.data?.items || [];

  // Filter to only low-stock and out-of-stock items for the alerts panel
  const alerts = allItems
    .filter(
      (item: any) => item.status === "Low Stock" || item.status === "Out of Stock"
    )
    .slice(0, 5); // Show top 5 alerts

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Alerts</CardTitle>
          <CardDescription>All products are sufficiently stocked.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            ✅ No inventory alerts at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Alerts</CardTitle>
        <CardDescription>
          Products requiring immediate restocking.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {alerts.map((item: any) => {
          const isOut = item.status === "Out of Stock";
          return (
            <div
              key={item.id}
              className="flex items-center justify-between space-x-4"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`rounded-full p-2 ${isOut ? "bg-destructive/10 text-destructive" : "bg-orange-500/10 text-orange-500"}`}
                >
                  {isOut ? (
                    <PackageX className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.sku}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  variant={isOut ? "destructive" : "secondary"}
                  className={
                    !isOut ? "bg-orange-500 text-white hover:bg-orange-600" : ""
                  }
                >
                  {item.available} in stock
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
