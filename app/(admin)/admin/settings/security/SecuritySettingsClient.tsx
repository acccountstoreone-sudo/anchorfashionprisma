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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SecuritySettingsConfig, updateSecuritySettings } from "@/lib/actions/settings.actions";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Lock } from "lucide-react";

export function SecuritySettingsClient({ initialConfig }: { initialConfig: SecuritySettingsConfig }) {
  const [config, setConfig] = useState<SecuritySettingsConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateSecuritySettings(config);
      if (res.success) {
        toast.success("Security policies saved and enforced");
      } else {
        toast.error(res.error || "Failed to update security policies");
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
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Authentication Policies</CardTitle>
            <CardDescription>
              Configure system authentication rules, session lifespans, and password policies.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Two-Factor Authentication (2FA)</Label>
            <p className="text-sm text-muted-foreground">
              Enforce two-factor authentication requirements for administrative personnel.
            </p>
          </div>
          <Switch 
            checked={config.two_factor_required} 
            onCheckedChange={(c) => setConfig({ ...config, two_factor_required: c })} 
          />
        </div>

        <div className="flex items-center justify-between border-b pb-4">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Strict Password Policy</Label>
            <p className="text-sm text-muted-foreground">
              Require minimum 8+ characters, alphanumeric, and symbol characters for staff accounts.
            </p>
          </div>
          <Switch 
            checked={config.strict_password_policy} 
            onCheckedChange={(c) => setConfig({ ...config, strict_password_policy: c })} 
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Auto Session Inactivity Timeout</Label>
            <p className="text-sm text-muted-foreground">
              Automatically invalidate staff sessions after 30 minutes of idle inactivity.
            </p>
          </div>
          <Switch 
            checked={config.auto_session_timeout} 
            onCheckedChange={(c) => setConfig({ ...config, auto_session_timeout: c })} 
          />
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
          Update Security Policies
        </Button>
      </CardFooter>
    </Card>
  );
}
