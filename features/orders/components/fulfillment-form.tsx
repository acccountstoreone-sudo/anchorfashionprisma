"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrderStatusAction } from "@/app/actions/oms/order.actions";
import { toast } from "sonner";
import { Order } from "@/types/oms";
import { CourierProviderRecord } from "@/types/shipping.types";
import { dispatchOrderAction } from "@/app/actions/oms/shipping.actions";
import { CheckCircle2, Package, Truck } from "lucide-react";

export function FulfillmentForm({
  order,
  couriers
}: {
  order: Order;
  couriers: CourierProviderRecord[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<string>("");

  const steps = ["paid", "preparing", "picking", "packing", "ready_for_shipment", "shipped"];
  const currentStepIndex = steps.indexOf(order.status);

  async function handleAdvanceStatus(newStatus: string) {
    setLoading(true);
    const res = await updateOrderStatusAction({
      order_id: order.id,
      new_status: newStatus as any,
    });
    setLoading(false);

    if (res.success) {
      toast.success(`Order marked as ${newStatus.replace(/_/g, " ")}`);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update order status");
    }
  }

  async function handleCreateShipment() {
    if (!selectedCourier) {
      toast.error("Please select a courier");
      return;
    }
    
    setLoading(true);
    const res = await dispatchOrderAction(order.id, selectedCourier as any);
    setLoading(false);
    
    if (res.success) {
      toast.success("Shipment created successfully! Labels are ready.");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to create shipment");
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Fulfillment Progress</CardTitle>
          <CardDescription>Advance the order through the warehouse workflow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col space-y-4">
            
            {/* Preparing */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${currentStepIndex >= 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">1. Preparing</h4>
                  <p className="text-xs text-muted-foreground">Order verified and sent to floor</p>
                </div>
              </div>
              {order.status === "paid" && (
                <Button size="sm" onClick={() => handleAdvanceStatus("preparing")} disabled={loading}>
                  Start Preparing
                </Button>
              )}
            </div>
            
            {/* Picking */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${currentStepIndex >= 2 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">2. Picking</h4>
                  <p className="text-xs text-muted-foreground">Collecting items from bins</p>
                </div>
              </div>
              {order.status === "preparing" && (
                <Button size="sm" onClick={() => handleAdvanceStatus("picking")} disabled={loading}>
                  Start Picking
                </Button>
              )}
            </div>

            {/* Packing */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${currentStepIndex >= 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">3. Packing</h4>
                  <p className="text-xs text-muted-foreground">Boxing and securing items</p>
                </div>
              </div>
              {order.status === "picking" && (
                <Button size="sm" onClick={() => handleAdvanceStatus("packing")} disabled={loading}>
                  Start Packing
                </Button>
              )}
            </div>
            
            {/* Shipped */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${currentStepIndex >= 5 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">4. Handover to Courier</h4>
                  <p className="text-xs text-muted-foreground">Package left the warehouse</p>
                </div>
              </div>
              {order.status === "ready_for_shipment" && (
                <Button size="sm" onClick={() => handleAdvanceStatus("shipped")} disabled={loading}>
                  Mark Shipped
                </Button>
              )}
            </div>
            
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Shipping & Courier</CardTitle>
          <CardDescription>Generate labels and assign to delivery partner.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {order.status === "packing" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Courier</label>
                <Select value={selectedCourier} onValueChange={(val) => setSelectedCourier(val as string)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose delivery partner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {couriers.filter(c => c.is_active).map(c => (
                      <SelectItem key={c.id} value={c.code}>{c.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateShipment} disabled={loading || !selectedCourier} className="w-full">
                {loading ? "Generating..." : "Generate Label & Tracking"}
              </Button>
            </div>
          ) : currentStepIndex >= 4 ? (
             <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Shipment Ready</h3>
                  <p className="text-sm text-muted-foreground">Label has been generated and courier notified.</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">Print Label</Button>
                  <Button variant="outline" size="sm">Print Invoice</Button>
                </div>
             </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border border-dashed rounded-lg">
              <Package className="h-10 w-10 mb-2 opacity-20" />
              <p>Complete packing to generate shipping labels.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
