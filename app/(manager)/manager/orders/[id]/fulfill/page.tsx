import { Metadata } from "next";
import { getOrderDetailsAction } from "@/app/actions/oms/order.actions";
import { getCouriersAction } from "@/app/actions/manager/shipping.actions";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FulfillmentForm } from "@/features/orders/components/fulfillment-form";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Fulfill Order | Manager Dashboard",
};

export default async function FulfillOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const [orderRes, couriersRes] = await Promise.all([
    getOrderDetailsAction(id),
    getCouriersAction()
  ]);

  if (!orderRes.success || !orderRes.data) {
    notFound();
  }

  const order = orderRes.data;
  const couriers = couriersRes.data || [];

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/manager/orders/fulfillment">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Order {order.order_number}</h1>
            <Badge variant="outline">{order.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Fulfillment Dashboard
          </p>
        </div>
      </div>

      <FulfillmentForm order={order} couriers={couriers} />
    </div>
  );
}
