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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, AlertCircle } from "lucide-react";

type GatewayCredentials = {
  store_id?: string;
  store_pass?: string;
  store_password?: string;
  store_passwd?: string;
  merchant_id?: string;
  app_key?: string;
  app_secret?: string;
  username?: string;
  password?: string;
  sandbox: string;
};

type GatewayConfig = {
  key: string;
  enabled: boolean;
  credentials: GatewayCredentials;
};

export function PaymentProvidersForm({
  initialBkash,
  initialSSL,
}: {
  initialBkash: GatewayConfig;
  initialSSL: GatewayConfig;
}) {
  const [bkash, setBkash] = useState(initialBkash);
  const [ssl, setSsl] = useState(initialSSL);
  const [isPending, startTransition] = useTransition();

  const saveGateway = (config: GatewayConfig) => {
    startTransition(async () => {
      let credentialsToSend = { ...config.credentials };
      if (config.key === "payment_sslcommerz") {
        const pass = (
          config.credentials.store_password ||
          config.credentials.store_pass ||
          config.credentials.store_passwd ||
          ""
        ).trim();
        credentialsToSend = {
          ...credentialsToSend,
          store_pass: pass,
          store_password: pass,
          store_passwd: pass,
        };
      }

      const res = await fetch("/api/admin/settings/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: config.key,
          value: { enabled: config.enabled, ...credentialsToSend },
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Payment gateway settings saved!");
      } else {
        toast.error(result.error ?? "Failed to save settings.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Providers</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your payment gateway credentials. These are stored securely
          in the database.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="text-sm text-amber-800">
          <strong>Security Note:</strong> These credentials are stored in the
          database settings table. Ensure your database policies restrict
          access to admin users only. Never expose secret keys in client-side
          code.
        </div>
      </div>

      {/* bKash */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl font-bold text-pink-600">b</span>Kash
                <Badge
                  variant={bkash.enabled ? "default" : "secondary"}
                  className="ml-1"
                >
                  {bkash.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Bangladesh mobile banking payment gateway
              </CardDescription>
            </div>
            <Switch
              checked={bkash.enabled}
              onCheckedChange={(checked) =>
                setBkash({ ...bkash, enabled: checked })
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="bkash-sandbox"
              checked={bkash.credentials.sandbox === "true"}
              onCheckedChange={(c) =>
                setBkash({
                  ...bkash,
                  credentials: {
                    ...bkash.credentials,
                    sandbox: c ? "true" : "false",
                  },
                })
              }
            />
            <Label htmlFor="bkash-sandbox">Use Sandbox (Test) Mode</Label>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Merchant ID</Label>
              <Input
                value={bkash.credentials.merchant_id ?? ""}
                onChange={(e) =>
                  setBkash({
                    ...bkash,
                    credentials: {
                      ...bkash.credentials,
                      merchant_id: e.target.value,
                    },
                  })
                }
                placeholder="Your bKash Merchant ID"
              />
            </div>
            <div className="space-y-2">
              <Label>App Key</Label>
              <Input
                value={bkash.credentials.app_key ?? ""}
                onChange={(e) =>
                  setBkash({
                    ...bkash,
                    credentials: {
                      ...bkash.credentials,
                      app_key: e.target.value,
                    },
                  })
                }
                placeholder="bKash App Key"
              />
            </div>
            <div className="space-y-2">
              <Label>App Secret</Label>
              <Input
                type="password"
                value={bkash.credentials.app_secret ?? ""}
                onChange={(e) =>
                  setBkash({
                    ...bkash,
                    credentials: {
                      ...bkash.credentials,
                      app_secret: e.target.value,
                    },
                  })
                }
                placeholder="bKash App Secret"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={bkash.credentials.username ?? ""}
                onChange={(e) =>
                  setBkash({
                    ...bkash,
                    credentials: {
                      ...bkash.credentials,
                      username: e.target.value,
                    },
                  })
                }
                placeholder="bKash Username"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={bkash.credentials.password ?? ""}
                onChange={(e) =>
                  setBkash({
                    ...bkash,
                    credentials: {
                      ...bkash.credentials,
                      password: e.target.value,
                    },
                  })
                }
                placeholder="bKash Password"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => saveGateway(bkash)} disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save bKash Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SSLCommerz */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                SSLCommerz
                <Badge
                  variant={ssl.enabled ? "default" : "secondary"}
                  className="ml-1"
                >
                  {ssl.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Cards, mobile banking, internet banking (Bangladesh)
              </CardDescription>
            </div>
            <Switch
              checked={ssl.enabled}
              onCheckedChange={(checked) =>
                setSsl({ ...ssl, enabled: checked })
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="ssl-sandbox"
              checked={ssl.credentials.sandbox === "true"}
              onCheckedChange={(c) =>
                setSsl({
                  ...ssl,
                  credentials: {
                    ...ssl.credentials,
                    sandbox: c ? "true" : "false",
                  },
                })
              }
            />
            <Label htmlFor="ssl-sandbox">Use Sandbox (Test) Mode</Label>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Store ID</Label>
              <Input
                value={ssl.credentials.store_id ?? ""}
                onChange={(e) =>
                  setSsl({
                    ...ssl,
                    credentials: {
                      ...ssl.credentials,
                      store_id: e.target.value,
                    },
                  })
                }
                placeholder="Your SSLCommerz Store ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Store Password</Label>
              <Input
                type="password"
                value={
                  ssl.credentials.store_pass ??
                  ssl.credentials.store_password ??
                  ssl.credentials.store_passwd ??
                  ""
                }
                onChange={(e) =>
                  setSsl({
                    ...ssl,
                    credentials: {
                      ...ssl.credentials,
                      store_pass: e.target.value,
                      store_password: e.target.value,
                      store_passwd: e.target.value,
                    },
                  })
                }
                placeholder="SSLCommerz Store Password"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => saveGateway(ssl)} disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save SSLCommerz Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
