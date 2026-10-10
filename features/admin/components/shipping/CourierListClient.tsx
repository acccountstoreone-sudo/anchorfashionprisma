"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Truck,
  Activity,
  Settings,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { CourierProviderRecord } from "@/types/shipping.types";
import {
  updateCourierProviderAction,
  getCourierMetricsAction,
  testCourierConnectionAction,
  CourierMetrics,
} from "@/actions/logistics.actions";
import { toast } from "sonner";
import { CourierConfigModal } from "./CourierConfigModal";
import { CourierLogsModal } from "./CourierLogsModal";

interface Props {
  initialCouriers: CourierProviderRecord[];
}

export function CourierListClient({ initialCouriers }: Props) {
  const [couriers, setCouriers] = useState(initialCouriers);
  const [metrics, setMetrics] = useState<Record<string, CourierMetrics>>({});
  const [selectedCourier, setSelectedCourier] = useState<CourierProviderRecord | null>(null);
  const [logsCourier, setLogsCourier] = useState<CourierProviderRecord | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [healthMap, setHealthMap] = useState<Record<string, { status: string; latency?: number }>>({});

  const loadMetricsAndHealth = async (currentCouriers?: CourierProviderRecord[]) => {
    setSyncing(true);
    try {
      const res = await getCourierMetricsAction();
      if (res.success && res.data) {
        setMetrics(res.data);
      }

      const couriersToEvaluate = currentCouriers || couriers;

      // Check health for active couriers
      const newHealthMap: Record<string, { status: string; latency?: number }> = {};
      for (const courier of couriersToEvaluate) {
        if (!courier.is_active) {
          newHealthMap[courier.id] = { status: "offline" };
          continue;
        }

        const creds = courier.credentials || {};
        const hasCreds = Object.values(creds).some(
          (v) => typeof v === "string" && v.trim() !== ""
        );
        const isSandbox = courier.code === "sandbox";

        if (!hasCreds && !isSandbox) {
          newHealthMap[courier.id] = { status: "not_configured" };
          continue;
        }

        // Test connection asynchronously
        try {
          const healthRes = await testCourierConnectionAction(courier.id);
          if (healthRes.success && healthRes.data) {
            newHealthMap[courier.id] = {
              status: healthRes.data.status,
              latency: healthRes.data.responseTime,
            };
          } else {
            newHealthMap[courier.id] = { status: "unhealthy" };
          }
        } catch {
          newHealthMap[courier.id] = { status: "unhealthy" };
        }
      }
      setHealthMap(newHealthMap);
    } catch (err: any) {
      toast.error(err.message || "Failed to sync status");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadMetricsAndHealth();
  }, [couriers.length]);

  const handleToggle = async (id: string, checked: boolean) => {
    if (!checked) {
      const confirmed = window.confirm(
        "Are you sure you want to deactivate this courier? No new shipments can be routed through disabled providers."
      );
      if (!confirmed) return;
    }

    const nextCouriers = couriers.map((c) =>
      c.id === id ? { ...c, is_active: checked } : c
    );
    setCouriers(nextCouriers);

    try {
      const res = await updateCourierProviderAction(id, { is_active: checked });
      if (!res.success) throw new Error(res.error);
      toast.success(checked ? "Courier activated" : "Courier deactivated");
      loadMetricsAndHealth(nextCouriers);
    } catch (err: any) {
      toast.error(err.message);
      // Revert
      setCouriers(couriers);
    }
  };

  const renderHealthIndicator = (courier: CourierProviderRecord) => {
    if (!courier.is_active) {
      return (
        <span className="text-muted-foreground flex items-center text-xs">
          Integration Offline
        </span>
      );
    }

    const health = healthMap[courier.id];
    if (!health) {
      return (
        <span className="text-muted-foreground flex items-center text-xs">
          <Activity className="mr-1 h-3 w-3 animate-pulse" /> Checking Health...
        </span>
      );
    }

    if (health.status === "healthy") {
      return (
        <span className="flex items-center text-emerald-600 font-medium text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Connected ({health.latency ?? 0}ms)
        </span>
      );
    }

    if (health.status === "degraded") {
      return (
        <span className="flex items-center text-amber-600 font-medium text-xs">
          <AlertCircle className="mr-1 h-3 w-3" /> Degraded ({health.latency ?? 0}ms)
        </span>
      );
    }

    if (health.status === "not_configured") {
      return (
        <span className="flex items-center text-muted-foreground font-medium text-xs">
          Not Configured
        </span>
      );
    }

    return (
      <span className="flex items-center text-rose-600 font-medium text-xs">
        <AlertCircle className="mr-1 h-3 w-3" /> Connection Error
      </span>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Courier Integrations
            </h1>
            <p className="text-muted-foreground">
              Manage logistics partners, live API health, and COD settlements.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => loadMetricsAndHealth()}
              disabled={syncing}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync Status
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {couriers.length === 0 && (
            <div className="col-span-2 text-center text-muted-foreground py-12">
              No couriers configured in database.
            </div>
          )}
          {couriers.map((courier) => {
            const courierMetric = metrics[courier.id];
            const activeShipmentsCount = courierMetric ? courierMetric.activeShipments : 0;
            const pendingCODAmount = courierMetric ? courierMetric.pendingCOD : 0;

            return (
              <Card
                key={courier.id}
                className={!courier.is_active ? "opacity-75 bg-muted/20" : ""}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center space-x-4">
                    {courier.logo_url ? (
                      <img
                        src={courier.logo_url}
                        alt={courier.name}
                        className="h-12 w-12 object-contain rounded-md"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                        {courier.display_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-xl flex items-center">
                        {courier.display_name}
                        {courier.is_sandbox && (
                          <Badge variant="secondary" className="ml-2 text-[10px] font-mono">
                            SANDBOX
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {renderHealthIndicator(courier)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`status-${courier.id}`} className="sr-only">
                      Toggle {courier.name}
                    </Label>
                    <Switch
                      id={`status-${courier.id}`}
                      checked={courier.is_active}
                      onCheckedChange={(checked) =>
                        handleToggle(courier.id, checked)
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="my-4 grid grid-cols-2 gap-4">
                    <div className="flex flex-col rounded-md bg-muted/50 p-3">
                      <span className="mb-1 text-xs text-muted-foreground">
                        Active Shipments
                      </span>
                      <span className="flex items-center text-xl font-semibold">
                        <Truck className="mr-2 h-4 w-4 text-blue-500" />
                        {activeShipmentsCount}
                      </span>
                    </div>
                    <div className="flex flex-col rounded-md bg-muted/50 p-3">
                      <span className="mb-1 text-xs text-muted-foreground">
                        Pending COD
                      </span>
                      <span className="flex items-center text-xl font-semibold">
                        <span className="mr-1 font-bold text-amber-500">৳</span>
                        {pendingCODAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium">Supported Features:</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {courier.is_cod_supported && (
                        <Badge variant="secondary" className="font-normal">
                          COD
                        </Badge>
                      )}
                      <Badge variant="secondary" className="font-normal">
                        API Sync
                      </Badge>
                      <Badge variant="secondary" className="font-normal">
                        Live Tracking
                      </Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogsCourier(courier)}
                  >
                    <FileText className="mr-2 h-4 w-4" /> View API Logs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCourier(courier)}
                  >
                    <Settings className="mr-2 h-4 w-4" /> Configure Settings
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      <CourierConfigModal
        courier={selectedCourier}
        onClose={() => setSelectedCourier(null)}
        onSaved={(updated) => {
          const next = couriers.map((c) =>
            c.id === updated.id ? { ...c, ...updated } : c
          );
          setCouriers(next);
          setSelectedCourier(null);
          loadMetricsAndHealth(next);
        }}
      />

      <CourierLogsModal
        courier={logsCourier}
        onClose={() => setLogsCourier(null)}
      />
    </>
  );
}
