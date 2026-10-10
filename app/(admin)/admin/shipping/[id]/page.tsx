"use client";

import { use, useState } from "react";
import {
  useShipmentDetail,
  useAssignCourier,
  useCancelShipment,
  useGenerateLabel,
  useSyncTracking,
} from "@/hooks/shipping/use-shipments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  Truck,
  Tag,
  AlertTriangle,
  RefreshCcw,
  Printer,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ShipmentStatus, CourierProviderCode } from "@/types/shipping.types";
import { toast } from "sonner";

const COURIERS: { label: string; value: CourierProviderCode }[] = [
  { label: "Steadfast", value: "steadfast" },
  { label: "Pathao", value: "pathao" },
  { label: "RedX", value: "redx" },
  { label: "Paperfly", value: "paperfly" },
  { label: "Sundarban", value: "sundarban" },
  { label: "eCourier", value: "ecourier" },
  { label: "DHL", value: "dhl" },
  { label: "FedEx", value: "fedex" },
  { label: "UPS", value: "ups" },
  { label: "Sandbox (Test)", value: "sandbox" },
];

const STATUS_BADGE: Record<ShipmentStatus, { label: string; color: string }> = {
  created: { label: "Created", color: "secondary" },
  pickup_requested: { label: "Pickup Requested", color: "secondary" },
  pickup_confirmed: { label: "Pickup Confirmed", color: "secondary" },
  picked_up: { label: "Picked Up", color: "default" },
  in_transit: { label: "In Transit", color: "default" },
  hub_received: { label: "Hub Received", color: "default" },
  out_for_delivery: { label: "Out for Delivery", color: "default" },
  delivered: { label: "Delivered", color: "default" },
  delivery_failed: { label: "Delivery Failed", color: "destructive" },
  returned_to_origin: { label: "Returned to Origin", color: "destructive" },
  cancelled: { label: "Cancelled", color: "secondary" },
};

export default function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: shipment, isLoading, error } = useShipmentDetail(id);
  const [selectedCourier, setSelectedCourier] =
    useState<CourierProviderCode>("steadfast");

  const assignCourier = useAssignCourier();
  const cancelShipment = useCancelShipment();
  const generateLabel = useGenerateLabel();
  const syncTracking = useSyncTracking();

  if (isLoading)
    return <div className="p-8 text-muted-foreground">Loading shipment…</div>;
  if (error || !shipment)
    return <div className="p-8 text-red-500">Shipment not found.</div>;

  const statusInfo = STATUS_BADGE[shipment.status as ShipmentStatus] ?? {
    label: shipment.status,
    color: "secondary",
  };
  const isTerminal = ["delivered", "cancelled", "returned_to_origin"].includes(
    shipment.status
  );

  const handleAssign = async () => {
    try {
      await assignCourier.mutateAsync({
        shipmentId: id,
        courierProviderCode: selectedCourier,
        autoSubmit: true,
      });
      toast.success("Courier assigned and consignment submitted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this shipment?")) return;
    try {
      await cancelShipment.mutateAsync({
        shipmentId: id,
        reason: "Cancelled by admin",
      });
      toast.success("Shipment cancelled");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleGenerateLabel = async () => {
    try {
      const result = await generateLabel.mutateAsync(id);
      if (result?.labelUrl) window.open(result.labelUrl, "_blank");
      toast.success("Label generated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSyncTracking = async () => {
    try {
      await syncTracking.mutateAsync(id);
      toast.success("Tracking synced");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{shipment.shipment_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Order:{" "}
            <span className="font-medium">
              {shipment.order_number ?? shipment.order_id}
            </span>
          </p>
        </div>
        <Badge variant={statusInfo.color as any} className="px-3 py-1 text-sm">
          {statusInfo.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Recipient Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" /> Recipient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium">{shipment.recipient_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Phone:</span>{" "}
              {shipment.recipient_phone}
            </div>
            <div>
              <span className="text-muted-foreground">Address:</span>{" "}
              {shipment.recipient_address}
            </div>
            <div>
              <span className="text-muted-foreground">City / District:</span>{" "}
              {[shipment.recipient_city, shipment.recipient_district]
                .filter(Boolean)
                .join(", ") || "—"}
            </div>
            {shipment.special_instructions && (
              <div>
                <span className="text-muted-foreground">Instructions:</span>{" "}
                {shipment.special_instructions}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" /> Shipment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Courier:</span>{" "}
              <span className="font-medium">
                {shipment.courier_provider_code ?? "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Tracking #:</span>{" "}
              <span className="font-mono">
                {shipment.tracking_number ?? "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">COD:</span>{" "}
              {shipment.is_cod
                ? `৳${shipment.cod_amount?.toLocaleString()}`
                : "No"}
            </div>
            <div>
              <span className="text-muted-foreground">Charge:</span> ৳
              {shipment.shipping_charge}
            </div>
            <div>
              <span className="text-muted-foreground">Weight:</span>{" "}
              {shipment.weight_kg ?? "—"} kg
            </div>
            <div>
              <span className="text-muted-foreground">Est. Delivery:</span>{" "}
              {shipment.estimated_delivery_date ?? "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {!isTerminal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              {/* Assign Courier */}
              <div className="flex items-center gap-2">
                <select
                  className="rounded-md border px-3 py-2 text-sm"
                  value={selectedCourier}
                  onChange={(e) =>
                    setSelectedCourier(e.target.value as CourierProviderCode)
                  }
                >
                  {COURIERS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  onClick={handleAssign}
                  disabled={assignCourier.isPending}
                  className="flex items-center gap-1"
                >
                  <Truck className="h-4 w-4" />
                  {shipment.courier_provider_code
                    ? "Reassign Courier"
                    : "Assign Courier"}
                </Button>
              </div>

              <Separator orientation="vertical" className="h-8" />

              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateLabel}
                disabled={!shipment.consignment_id || generateLabel.isPending}
                className="flex items-center gap-1"
              >
                <Printer className="h-4 w-4" /> Print Label
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncTracking}
                disabled={!shipment.tracking_number || syncTracking.isPending}
                className="flex items-center gap-1"
              >
                <RefreshCcw className="h-4 w-4" /> Sync Tracking
              </Button>

              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelShipment.isPending}
                className="flex items-center gap-1"
              >
                <XCircle className="h-4 w-4" /> Cancel Shipment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracking Timeline */}
      {shipment.tracking_events && shipment.tracking_events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4" /> Tracking Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shipment.tracking_events.map((event: any) => (
                <div key={event.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  <div>
                    <div className="font-medium">
                      {event.status_description || event.status}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.location && `${event.location} · `}
                      {new Date(event.event_time).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      {shipment.items && shipment.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" /> Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {shipment.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b pb-2 text-sm last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      {item.product_name}
                      {item.variant_name && ` — ${item.variant_name}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      SKU: {item.sku}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>× {item.quantity}</div>
                    <div className="text-xs text-muted-foreground">
                      ৳{item.unit_price}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
