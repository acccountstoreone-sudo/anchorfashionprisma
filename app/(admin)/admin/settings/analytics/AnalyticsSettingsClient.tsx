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
import { AnalyticsSettingsConfig, updateAnalyticsSettings } from "@/lib/actions/settings.actions";
import { toast } from "sonner";
import { Loader2, Activity } from "lucide-react";

export function AnalyticsSettingsClient({ initialConfig }: { initialConfig: AnalyticsSettingsConfig }) {
  const [config, setConfig] = useState<AnalyticsSettingsConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateAnalyticsSettings(config);
      if (res.success) {
        toast.success("Analytics & tracking integration IDs saved successfully");
      } else {
        toast.error(res.error || "Failed to save analytics settings");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Tracking & Analytics Identifiers</CardTitle>
            <CardDescription>
              Configure Google Analytics 4, Tag Manager, and Meta (Facebook) Pixel identifiers.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ga-id">Google Analytics 4 Measurement ID</Label>
          <Input 
            id="ga-id" 
            placeholder="G-XXXXXXXXXX" 
            value={config.ga_id} 
            onChange={(e) => setConfig({ ...config, ga_id: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gtm-id">Google Tag Manager Container ID</Label>
          <Input 
            id="gtm-id" 
            placeholder="GTM-XXXXXXX" 
            value={config.gtm_id} 
            onChange={(e) => setConfig({ ...config, gtm_id: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fb-pixel">Facebook / Meta Pixel ID</Label>
          <Input 
            id="fb-pixel" 
            placeholder="e.g. 123456789012345" 
            value={config.fb_pixel} 
            onChange={(e) => setConfig({ ...config, fb_pixel: e.target.value })} 
          />
        </div>
      </CardContent>
      <CardFooter className="border-t border-border pt-4">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Integrations
        </Button>
      </CardFooter>
    </Card>
  );
}
