"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { upsertShippingRate, toggleShippingRate } from "@/lib/actions/shipping.actions";
import { Save, Truck, MapPin, PackageCheck, AlertCircle } from "lucide-react";

type ShippingRate = {
  id: string;
  name: string;
  base_rate: number;
  free_shipping_above?: number | null;
  cod_charge: number;
  is_active: boolean;
  is_cod_rate: boolean;
};

type DeliveryZone = {
  id: string;
  name: string;
  code: string;
  description?: string;
  districts: string[];
  estimated_days_min: number;
  estimated_days_max: number;
  shipping_rates?: ShippingRate[];
};

interface ShippingSettingsClientProps {
  zones: DeliveryZone[];
}

export function ShippingSettingsClient({ zones }: ShippingSettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [editingRate, setEditingRate] = useState<Partial<ShippingRate> & { zone_id?: string } | null>(null);

  const handleToggleRate = (rateId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const result = await toggleShippingRate(rateId, !currentStatus);
      if (result.success) {
        toast.success(`Rate ${!currentStatus ? "enabled" : "disabled"}`);
      } else {
        toast.error(result.error ?? "Failed to update rate");
      }
    });
  };

  const handleSaveRate = (zoneId: string) => {
    if (!editingRate) return;
    startTransition(async () => {
      const result = await upsertShippingRate({
        ...editingRate,
        zone_id: zoneId,
        name: editingRate.name ?? "Standard",
        base_rate: editingRate.base_rate ?? 0,
      });
      if (result.success) {
        toast.success("Shipping rate saved successfully!");
        setEditingRate(null);
      } else {
        toast.error(result.error ?? "Failed to save rate");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Shipping Zones & Rates</CardTitle>
              <CardDescription>
                Manage delivery zones, districts, and their respective shipping
                charges. These rates are used dynamically at checkout.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-muted-foreground gap-3">
              <AlertCircle className="h-8 w-8 opacity-40" />
              <p className="text-sm">
                No delivery zones found. Run the shipping fulfillment migration in Supabase first.
              </p>
            </div>
          ) : (
            zones.map((zone) => (
              <div key={zone.id} className="border rounded-lg overflow-hidden">
                {/* Zone Header */}
                <div className="bg-muted/50 px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold">{zone.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Code: <code className="bg-muted px-1 rounded">{zone.code}</code>{" "}
                        · Est. {zone.estimated_days_min}–{zone.estimated_days_max} days
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                    {zone.districts?.slice(0, 5).map((d) => (
                      <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                    ))}
                    {zone.districts?.length > 5 && (
                      <Badge variant="outline" className="text-xs">+{zone.districts.length - 5} more</Badge>
                    )}
                  </div>
                </div>

                {/* Rates Table */}
                <div className="px-6 py-4 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Rates
                  </p>
                  {zone.shipping_rates?.map((rate) => (
                    <div
                      key={rate.id}
                      className="flex items-center justify-between gap-4 py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <PackageCheck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{rate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Base: ৳{rate.base_rate.toLocaleString()}
                            {rate.free_shipping_above && (
                              <> · Free above ৳{rate.free_shipping_above.toLocaleString()}</>
                            )}
                            {rate.is_cod_rate && (
                              <> · COD Charge: ৳{rate.cod_charge}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={rate.is_active ? "default" : "outline"}>
                          {rate.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Switch
                          checked={rate.is_active}
                          disabled={isPending}
                          onCheckedChange={() => handleToggleRate(rate.id, rate.is_active)}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Inline Rate Editor */}
                  {editingRate?.zone_id === zone.id ? (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4">
                      <p className="font-medium text-sm">Edit / Add Rate</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label>Rate Name</Label>
                          <Input
                            value={editingRate.name ?? ""}
                            onChange={(e) => setEditingRate({ ...editingRate, name: e.target.value })}
                            placeholder="e.g. Standard"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Base Rate (৳)</Label>
                          <Input
                            type="number"
                            value={editingRate.base_rate ?? ""}
                            onChange={(e) =>
                              setEditingRate({ ...editingRate, base_rate: parseFloat(e.target.value) })
                            }
                            placeholder="100"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Free Shipping Above (৳)</Label>
                          <Input
                            type="number"
                            value={editingRate.free_shipping_above ?? ""}
                            onChange={(e) =>
                              setEditingRate({
                                ...editingRate,
                                free_shipping_above: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setEditingRate(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" disabled={isPending} onClick={() => handleSaveRate(zone.id)}>
                          <Save className="mr-2 h-3 w-3" />
                          {isPending ? "Saving..." : "Save Rate"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => setEditingRate({ zone_id: zone.id, name: "Standard", base_rate: 100 })}
                    >
                      + Add / Edit Rate for this Zone
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
