"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Warehouse, WarehouseZone, WarehouseBin } from "@/types/inventory.types";
import { toast } from "sonner";
import { 
  updateWarehouseAction, 
  createZoneAction, 
  deleteZoneAction,
  createBinAction,
  deleteBinAction
} from "@/app/actions/manager/warehouse.actions";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const warehouseDetailsSchema = z.object({
  name: z.string().trim().min(2, "Warehouse name must be at least 2 characters"),
  type: z.string().trim().min(1, "Warehouse type is required"),
});

const addZoneSchema = z.object({
  name: z.string().trim().min(2, "Zone name must be at least 2 characters"),
});

const addBinSchema = z.object({
  zone_id: z.string().min(1, "Please select a zone"),
  code: z.string().trim().min(2, "Bin code must be at least 2 characters"),
});

type WarehouseDetailsValues = z.infer<typeof warehouseDetailsSchema>;
type AddZoneValues = z.infer<typeof addZoneSchema>;
type AddBinValues = z.infer<typeof addBinSchema>;

export function WarehouseManager({
  warehouse,
  zones,
  bins,
}: {
  warehouse: Warehouse;
  zones: WarehouseZone[];
  bins: WarehouseBin[];
}) {
  const warehouseForm = useForm<WarehouseDetailsValues>({
    resolver: zodResolver(warehouseDetailsSchema),
    defaultValues: {
      name: warehouse.name || "",
      type: warehouse.type || "",
    },
  });

  const zoneForm = useForm<AddZoneValues>({
    resolver: zodResolver(addZoneSchema),
    defaultValues: {
      name: "",
    },
  });

  const binForm = useForm<AddBinValues>({
    resolver: zodResolver(addBinSchema),
    defaultValues: {
      zone_id: "",
      code: "",
    },
  });

  // General Update
  async function handleUpdateWarehouse(values: WarehouseDetailsValues) {
    const res = await updateWarehouseAction(warehouse.id, {
      name: values.name,
      type: values.type,
    });
    
    if (res.success) toast.success("Warehouse updated successfully");
    else toast.error(res.error || "Failed to update warehouse");
  }

  // Zones Update
  async function handleAddZone(values: AddZoneValues) {
    const res = await createZoneAction({
      warehouse_id: warehouse.id,
      name: values.name,
      type: "STORAGE",
      is_active: true,
    });
    
    if (res.success) {
      toast.success("Zone added successfully");
      zoneForm.reset();
    } else {
      toast.error(res.error || "Failed to add zone");
    }
  }

  async function handleDeleteZone(id: string) {
    if (!confirm("Are you sure?")) return;
    const res = await deleteZoneAction(id, warehouse.id);
    if (res.success) toast.success("Zone deleted");
    else toast.error(res.error || "Failed to delete zone");
  }

  // Bins Update
  async function handleAddBin(values: AddBinValues) {
    const res = await createBinAction({
      zone_id: values.zone_id,
      code: values.code,
      barcode: values.code,
      capacity_volume: 0,
      capacity_weight: 0,
    }, warehouse.id);
    
    if (res.success) {
      toast.success("Bin added successfully");
      binForm.reset();
    } else {
      toast.error(res.error || "Failed to add bin");
    }
  }

  async function handleDeleteBin(id: string) {
    if (!confirm("Are you sure?")) return;
    const res = await deleteBinAction(id, warehouse.id);
    if (res.success) toast.success("Bin deleted");
    else toast.error(res.error || "Failed to delete bin");
  }

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="zones">Zones</TabsTrigger>
        <TabsTrigger value="bins">Bins</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Warehouse Details</CardTitle>
            <CardDescription>Update the basic information of this warehouse.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={warehouseForm.handleSubmit(handleUpdateWarehouse)} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="warehouse_name">Warehouse Name</Label>
                <Input
                  id="warehouse_name"
                  {...warehouseForm.register("name")}
                  className={warehouseForm.formState.errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {warehouseForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{warehouseForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse_type">Warehouse Type</Label>
                <Input
                  id="warehouse_type"
                  {...warehouseForm.register("type")}
                  className={warehouseForm.formState.errors.type ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {warehouseForm.formState.errors.type && (
                  <p className="text-xs text-destructive">{warehouseForm.formState.errors.type.message}</p>
                )}
              </div>
              <Button type="submit" disabled={warehouseForm.formState.isSubmitting}>
                {warehouseForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="zones">
        <Card>
          <CardHeader>
            <CardTitle>Zones</CardTitle>
            <CardDescription>Zones represent distinct areas in a warehouse (e.g. Aisle A, Cold Storage).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {zones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-4 border rounded-md">
                  <div>
                    <h4 className="font-medium">{zone.name}</h4>
                    <p className="text-sm text-muted-foreground">{zone.type}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteZone(zone.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {zones.length === 0 && <p className="text-muted-foreground">No zones configured yet.</p>}
            </div>

            <form onSubmit={zoneForm.handleSubmit(handleAddZone)} className="border-t pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="space-y-2 flex-1 max-w-xs w-full">
                  <Label htmlFor="zone_name">New Zone Name</Label>
                  <Input
                    id="zone_name"
                    placeholder="e.g. Aisle A"
                    {...zoneForm.register("name")}
                    className={zoneForm.formState.errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {zoneForm.formState.errors.name && (
                    <p className="text-xs text-destructive">{zoneForm.formState.errors.name.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={zoneForm.formState.isSubmitting}>
                  {zoneForm.formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add Zone
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="bins">
        <Card>
          <CardHeader>
            <CardTitle>Bins</CardTitle>
            <CardDescription>Bins represent specific shelf locations within a zone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {bins.map((bin) => {
                const zone = zones.find(z => z.id === bin.zone_id);
                return (
                  <div key={bin.id} className="flex flex-col p-4 border rounded-md relative">
                    <h4 className="font-medium">{bin.code}</h4>
                    <p className="text-sm text-muted-foreground">Zone: {zone?.name || "Unknown"}</p>
                    <Button variant="ghost" size="icon" className="text-destructive absolute top-2 right-2" onClick={() => handleDeleteBin(bin.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {bins.length === 0 && <p className="text-muted-foreground">No bins configured yet.</p>}
            </div>

            <form onSubmit={binForm.handleSubmit(handleAddBin)} className="border-t pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="space-y-2 flex-1 max-w-xs w-full">
                  <Label htmlFor="bin_zone_id">Select Zone</Label>
                  <select
                    id="bin_zone_id"
                    {...binForm.register("zone_id")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a zone...</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                  {binForm.formState.errors.zone_id && (
                    <p className="text-xs text-destructive">{binForm.formState.errors.zone_id.message}</p>
                  )}
                </div>
                <div className="space-y-2 flex-1 max-w-xs w-full">
                  <Label htmlFor="bin_code">Bin Code</Label>
                  <Input
                    id="bin_code"
                    placeholder="e.g. A-12-3"
                    {...binForm.register("code")}
                    className={binForm.formState.errors.code ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {binForm.formState.errors.code && (
                    <p className="text-xs text-destructive">{binForm.formState.errors.code.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={binForm.formState.isSubmitting}>
                  {binForm.formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add Bin
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
