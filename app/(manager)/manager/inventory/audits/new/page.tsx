"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getWarehousesAction, getZonesByWarehouseAction } from "@/app/actions/manager/warehouse.actions";
import { createAuditAction } from "@/app/actions/manager/inventory.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Warehouse, WarehouseZone } from "@/types/inventory.types";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const auditSchema = z.object({
  warehouse_id: z.string().min(1, "Please select a target warehouse"),
  zone_id: z.string().optional().default("all"),
  scheduled_date: z.string().min(1, "Scheduled date is required"),
});

type AuditFormValues = z.infer<typeof auditSchema>;

export default function ScheduleAuditPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<WarehouseZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AuditFormValues>({
    resolver: zodResolver(auditSchema),
    defaultValues: {
      warehouse_id: "",
      zone_id: "all",
      scheduled_date: new Date().toISOString().split("T")[0],
    },
  });

  const selectedWarehouseId = watch("warehouse_id");

  useEffect(() => {
    async function fetchWarehouses() {
      const res = await getWarehousesAction();
      if (res.success && res.data) setWarehouses(res.data);
    }
    fetchWarehouses();
  }, []);

  useEffect(() => {
    async function fetchZones() {
      if (!selectedWarehouseId) {
        setZones([]);
        return;
      }
      setLoadingZones(true);
      const res = await getZonesByWarehouseAction(selectedWarehouseId);
      setLoadingZones(false);
      if (res.success && res.data) setZones(res.data);
    }
    fetchZones();
  }, [selectedWarehouseId]);

  async function onSubmit(values: AuditFormValues) {
    try {
      const res = await createAuditAction({
        warehouse_id: values.warehouse_id,
        zone_id: values.zone_id && values.zone_id !== "all" ? values.zone_id : undefined,
        scheduled_date: values.scheduled_date || undefined,
        status: "PLANNED",
      });

      if (res.success) {
        toast.success("Audit scheduled successfully");
        router.push("/manager/inventory/audits");
      } else {
        toast.error(res.error || "Failed to schedule audit");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong scheduling audit");
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/manager/inventory/audits">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule Audit</h1>
          <p className="text-muted-foreground">Plan a new inventory count.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="warehouse_id">
                Target Warehouse <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="warehouse_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      setValue("zone_id", "all");
                    }}
                  >
                    <SelectTrigger className={errors.warehouse_id ? "border-destructive focus-visible:ring-destructive" : ""}>
                      <SelectValue placeholder="Select warehouse..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.warehouse_id && (
                <p className="text-xs text-destructive">{errors.warehouse_id.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zone_id">Specific Zone (Optional)</Label>
              <Controller
                name="zone_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedWarehouseId || loadingZones || zones.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Zones (or select specific zone)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Zones</SelectItem>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>
                          {z.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">Select a zone to limit the scope of the count.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_date">
                Scheduled Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="scheduled_date"
                type="date"
                {...register("scheduled_date")}
                className={errors.scheduled_date ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.scheduled_date && (
                <p className="text-xs text-destructive">{errors.scheduled_date.message}</p>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" type="button" asChild>
                <Link href="/manager/inventory/audits">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  "Schedule Audit"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
