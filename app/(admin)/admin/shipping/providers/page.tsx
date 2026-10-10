"use client";

import { useCourierProviders } from "@/hooks/shipping/use-courier-providers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, CheckCircle2, XCircle, TestTube, Globe } from "lucide-react";
import Link from "next/link";

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  steadfast: "Bangladesh domestic courier — COD specialist",
  pathao: "Bangladesh domestic — OAuth2 API, wide coverage",
  redx: "Bangladesh domestic — API-first carrier",
  paperfly: "Bangladesh domestic — parcel network",
  sundarban: "Bangladesh — established courier network",
  ecourier: "Bangladesh domestic — e-commerce focused",
  dhl: "International express carrier (DHL API v2)",
  fedex: "International express carrier (FedEx 2024 API)",
  ups: "International parcel carrier (UPS OAuth2 API)",
  sandbox: "Mock carrier for development & testing",
};

export default function AdminCourierProvidersPage() {
  const { data: providers, isLoading } = useCourierProviders();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Courier Providers
          </h1>
          <p className="mt-1 text-muted-foreground">
            Configure and manage courier API integrations
          </p>
        </div>
        <Link href="/admin/shipping">
          <Button variant="outline" size="sm">
            ← Shipping
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Registered Providers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">
              Loading providers…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>COD</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!providers || providers.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No providers loaded. Ensure DB seed data has run.
                    </TableCell>
                  </TableRow>
                )}
                {(providers ?? []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {p.code === "sandbox" ? (
                          <TestTube className="h-4 w-4 text-slate-400" />
                        ) : ["dhl", "fedex", "ups"].includes(p.code) ? (
                          <Globe className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Truck className="h-4 w-4 text-slate-400" />
                        )}
                        <span className="font-medium">
                          {p.display_name || p.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
                        {p.code}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      {PROVIDER_DESCRIPTIONS[p.code] ?? "—"}
                    </TableCell>
                    <TableCell>
                      {p.is_cod_supported ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </TableCell>
                    <TableCell>{p.priority ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={p.is_sandbox ? "secondary" : "default"}
                        className="text-xs"
                      >
                        {p.is_sandbox ? "Sandbox" : "Production"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.is_active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="mb-3 text-muted-foreground">
              Configure the following URLs in each courier provider's portal:
            </p>
            {[
              "steadfast",
              "pathao",
              "redx",
              "paperfly",
              "dhl",
              "fedex",
              "ups",
            ].map((code) => (
              <div
                key={code}
                className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3"
              >
                <span className="w-20 shrink-0 font-medium capitalize">
                  {code}
                </span>
                <code className="flex-1 break-all text-xs text-slate-600">
                  {`https://your-domain.com/api/webhooks/courier/${code}`}
                </code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
