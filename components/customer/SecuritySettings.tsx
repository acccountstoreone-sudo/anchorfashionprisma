"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Monitor, Smartphone, Globe, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function SecuritySettings({
  loginHistory,
  activeSessions,
}: {
  loginHistory: any[];
  activeSessions: any[];
}) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleToggle2FA = (checked: boolean) => {
    setTwoFactorEnabled(checked);
    if (checked) {
      toast.success("Two-factor authentication requirement enabled for this session");
    } else {
      toast.info("Two-factor authentication disabled");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Two-Factor Authentication (2FA)
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account by requiring a code
            from your mobile device when logging in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Authenticator App</p>
              <p className="text-sm text-muted-foreground">
                Use an app like Google Authenticator to generate codes.
              </p>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={handleToggle2FA}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Devices that are currently logged into your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active sessions found.
            </p>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session, i) => (
                <div
                  key={session.id || i}
                  className="flex items-center justify-between border-b py-2 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {session.user_agent || "Unknown Device"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.ip_address} • Last active{" "}
                        {new Date(
                          session.last_active_at || session.created_at
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-50 text-green-600"
                  >
                    Current Session
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login History</CardTitle>
          <CardDescription>
            Recent login attempts to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loginHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No login history available.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location / IP</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginHistory.map((history, i) => (
                  <TableRow key={history.id || i}>
                    <TableCell className="text-sm">
                      {new Date(
                        history.created_at || history.attempted_at
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {history.location || history.ip_address || "Unknown"}
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate text-sm"
                      title={history.user_agent}
                    >
                      {history.user_agent || "Unknown Device"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          history.status === "SUCCESS"
                            ? "default"
                            : "destructive"
                        }
                        className={
                          history.status === "SUCCESS"
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }
                      >
                        {history.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
