"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StoreConfig, updateStoreConfig } from "@/lib/actions/settings.actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function StoreSettingsClient({ initialConfig }: { initialConfig: StoreConfig }) {
  const [config, setConfig] = useState<StoreConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateStoreConfig(config);
      if (res.success) {
        toast.success("Store configuration saved successfully");
      } else {
        toast.error(res.error || "Failed to save configuration");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Details</CardTitle>
        <CardDescription>
          The official name and currency of your store.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="store-name">Store Name</Label>
          <Input 
            id="store-name" 
            value={config.store_name} 
            onChange={(e) => setConfig({ ...config, store_name: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input 
            id="currency" 
            value={config.currency} 
            onChange={(e) => setConfig({ ...config, currency: e.target.value })} 
            placeholder="e.g. BDT (৳)"
          />
          <div className="flex gap-2 pt-1">
            {["BDT (৳)", "USD ($)", "EUR (€)", "GBP (£)"].map((cur) => (
              <Button
                key={cur}
                type="button"
                variant={config.currency === cur ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setConfig({ ...config, currency: cur })}
              >
                {cur}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            This currency applies globally across prices, checkout, invoice generation, and financial reports.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input 
            id="timezone" 
            value={config.timezone} 
            onChange={(e) => setConfig({ ...config, timezone: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight-unit">Default Weight Unit</Label>
          <Input 
            id="weight-unit" 
            value={config.weight_unit} 
            onChange={(e) => setConfig({ ...config, weight_unit: e.target.value })} 
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}
