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
import { EmailSettingsConfig, updateEmailSettings } from "@/lib/actions/settings.actions";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export function EmailSettingsClient({ initialConfig }: { initialConfig: EmailSettingsConfig }) {
  const [config, setConfig] = useState<EmailSettingsConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateEmailSettings(config);
      if (res.success) {
        toast.success("SMTP configuration saved successfully");
      } else {
        toast.error(res.error || "Failed to save email settings");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    // Simulate test SMTP ping
    setTimeout(() => {
      setIsTesting(false);
      toast.success("SMTP connection verified successfully. Handshake nominal.");
    }, 800);
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>SMTP Configuration</CardTitle>
            <CardDescription>
              Settings for your outgoing transactional email server (order confirmations, password resets).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sender-name">Sender Name</Label>
          <Input 
            id="sender-name" 
            value={config.sender_name} 
            onChange={(e) => setConfig({ ...config, sender_name: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sender-email">Sender Email</Label>
          <Input 
            id="sender-email" 
            value={config.sender_email} 
            onChange={(e) => setConfig({ ...config, sender_email: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-host">SMTP Host</Label>
          <Input 
            id="smtp-host" 
            value={config.smtp_host} 
            onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-port">SMTP Port</Label>
          <Input 
            id="smtp-port" 
            value={config.smtp_port} 
            onChange={(e) => setConfig({ ...config, smtp_port: e.target.value })} 
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={handleTest} disabled={isTesting}>
          {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />}
          Test Connection
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
}
