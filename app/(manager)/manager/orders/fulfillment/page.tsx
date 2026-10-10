import { Metadata } from "next";
import { fetchOrdersForFulfillmentAction } from "@/app/actions/oms/order.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Package } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Order } from "@/types/oms";

export const metadata: Metadata = {
  title: "Fulfillment Board | Manager Dashboard",
};

export default async function FulfillmentBoardPage() {
  const { data: orders } = await fetchOrdersForFulfillmentAction();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-emerald-500/10 text-emerald-500";
      case "preparing": return "bg-blue-500/10 text-blue-500";
      case "picking": return "bg-yellow-500/10 text-yellow-500";
      case "packing": return "bg-orange-500/10 text-orange-500";
      case "ready_for_shipment": return "bg-purple-500/10 text-purple-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fulfillment Board</h1>
        <p className="mt-1 text-muted-foreground">
          Manage orders from payment received to ready for shipment.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Kanban style columns */}
        {["paid", "preparing", "picking", "packing"].map((statusCategory) => {
          const columnOrders = (orders || []).filter(o => o.status === statusCategory);
          
          return (
            <Card key={statusCategory} className="bg-muted/50 border-none shadow-none h-full min-h-[500px]">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-semibold capitalize flex items-center justify-between">
                  {statusCategory.replace("_", " ")}
                  <Badge variant="secondary" className="font-mono">{columnOrders.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-3">
                {columnOrders.map((order: Order) => (
                  <Card key={order.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold">{order.order_number}</span>
                        <Badge className={getStatusColor(order.status)} variant="outline">
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {/* @ts-ignore */}
                        {order.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0} items
                      </div>
                      <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                        <span>{order.created_at ? format(new Date(order.created_at), "MMM d, HH:mm") : "-"}</span>
                        <Link href={`/manager/orders/${order.id}`} className="text-primary font-medium hover:underline flex items-center gap-1">
                          Manage <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {columnOrders.length === 0 && (
                  <div className="text-center p-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                    No orders
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
