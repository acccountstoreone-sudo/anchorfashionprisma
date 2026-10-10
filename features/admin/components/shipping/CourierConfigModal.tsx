"use client";

import { useEffect, useState } from "react";
import { CourierProviderRecord } from "@/types/shipping.types";
import {
  updateCourierProviderAction,
  testCourierConnectionAction,
} from "@/actions/logistics.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Activity, CheckCircle, AlertCircle, RefreshCcw, Trash2 } from "lucide-react";
import { HealthCheckResult } from "@/lib/couriers/types";

interface Props {
  courier: CourierProviderRecord | null;
  onClose: () => void;
  onSaved: (updated: CourierProviderRecord) => void;
}

export function CourierConfigModal({ courier, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<HealthCheckResult | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isSandbox, setIsSandbox] = useState(false);

  useEffect(() => {
    if (courier) {
      setCredentials(courier.credentials || {});
      setIsSandbox(courier.is_sandbox);
      setTestResult(null);
    }
  }, [courier]);

  if (!courier) return null;

  const hasCredentials =
    (courier.credentials &&
      Object.values(courier.credentials).some(
        (v) => typeof v === "string" && v.trim() !== ""
      )) ||
    Object.values(credentials).some(
      (v) => typeof v === "string" && v.trim() !== ""
    );

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await testCourierConnectionAction(courier.id, credentials, isSandbox);
      if (res.success && res.data) {
        setTestResult(res.data);
        if (res.data.status === "healthy") {
          toast.success(`Connected ✓ Response time: ${res.data.responseTime}ms`);
        } else if (res.data.status === "not_configured") {
          toast.info("Courier is not configured. Please fill in credentials first.");
        } else {
          toast.error(`Connection failed: ${res.data.message}`);
        }
      } else {
        toast.error("Failed to run health check");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to test connection");
    } finally {
      setTesting(false);
    }
  };

  const handleRemoveCredentials = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to remove all API credentials for ${courier.display_name}? This will disconnect the courier.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await updateCourierProviderAction(courier.id, {
        credentials: {},
        is_active: false,
      });

      if (!res.success) throw new Error(res.error);

      setCredentials({});
      setTestResult({
        status: "not_configured",
        responseTime: 0,
        lastCheckedAt: new Date().toISOString(),
        message: "Credentials removed. Courier is not configured.",
      });

      toast.success(`${courier.display_name} credentials removed.`);
      onSaved({ ...courier, credentials: {}, is_active: false });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const isAllEmpty = Object.values(credentials).every(
        (v) => !v || (typeof v === "string" && v.trim() === "")
      );
      const payloadCreds = isAllEmpty ? {} : credentials;

      const res = await updateCourierProviderAction(courier.id, {
        credentials: payloadCreds,
        is_sandbox: isSandbox,
      });

      if (!res.success) throw new Error(res.error);

      toast.success(`${courier.display_name} configuration saved.`);
      onSaved({ ...courier, credentials: payloadCreds, is_sandbox: isSandbox });
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const renderFields = () => {
    switch (courier.code) {
      case "steadfast":
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                value={credentials.apiKey || ""}
                onChange={(e) => handleChange("apiKey", e.target.value)}
                placeholder="Enter Steadfast API Key"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                value={credentials.secretKey || ""}
                onChange={(e) => handleChange("secretKey", e.target.value)}
                placeholder="Enter Steadfast Secret Key"
              />
            </div>
          </>
        );
      case "pathao":
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                value={credentials.clientId || ""}
                onChange={(e) => handleChange("clientId", e.target.value)}
                placeholder="Pathao OAuth Client ID"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                value={credentials.clientSecret || ""}
                onChange={(e) => handleChange("clientSecret", e.target.value)}
                placeholder="Pathao Client Secret"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Pathao Email / Username</Label>
              <Input
                id="username"
                value={credentials.username || ""}
                onChange={(e) => handleChange("username", e.target.value)}
                placeholder="Merchant login email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Pathao Password</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password || ""}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Merchant password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="storeId">Store ID (Optional)</Label>
              <Input
                id="storeId"
                value={credentials.storeId || ""}
                onChange={(e) => handleChange("storeId", e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
          </>
        );
      case "sandbox":
        return (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2 font-medium text-sm text-primary">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Sandbox / Mock Logistics Provider</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              This provider provides local simulated consignment booking, live tracking lifecycle simulation, and automated webhook delivery without calling third-party APIs or incurring shipping costs.
            </p>
            <div className="grid gap-2 pt-2">
              <Label htmlFor="mockNote" className="text-xs">
                Sandbox Notes / Profile Name (Optional)
              </Label>
              <Input
                id="mockNote"
                value={credentials.mockNote || ""}
                onChange={(e) => handleChange("mockNote", e.target.value)}
                placeholder="e.g. Local development & staging simulator"
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key / Token</Label>
            <Input
              id="apiKey"
              type="password"
              value={credentials.apiKey || credentials.token || ""}
              onChange={(e) => handleChange("apiKey", e.target.value)}
              placeholder="Enter provider API key"
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={!!courier} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Configure {courier.display_name}</DialogTitle>
            {testResult && (
              <div>
                {testResult.status === "healthy" ? (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-xs">
                    <CheckCircle className="h-3.5 w-3.5" /> Connected ✓ ({testResult.responseTime}ms)
                  </Badge>
                ) : testResult.status === "not_configured" ? (
                  <Badge variant="outline" className="text-muted-foreground text-xs">
                    Not Configured
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 text-xs">
                    <AlertCircle className="h-3.5 w-3.5" /> Failed ✗
                  </Badge>
                )}
              </div>
            )}
          </div>
          <DialogDescription>
            Update API credentials and environment settings. Passwords and keys are encrypted at rest with AES-256-GCM.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="sandbox-mode" className="text-sm font-medium">Sandbox Mode (Test Environment)</Label>
              <p className="text-xs text-muted-foreground">
                Toggle between official sandbox and live production endpoints.
              </p>
            </div>
            <Switch
              id="sandbox-mode"
              checked={isSandbox}
              onCheckedChange={setIsSandbox}
            />
          </div>

          {renderFields()}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || loading}
            >
              <Activity className={`mr-2 h-4 w-4 ${testing ? "animate-spin" : ""}`} />
              {testing ? "Testing Connection..." : "Test Connection"}
            </Button>

            {hasCredentials && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRemoveCredentials}
                disabled={testing || loading}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Credentials
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
