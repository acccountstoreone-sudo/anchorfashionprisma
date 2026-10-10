"use client";

import { useEffect, useState } from "react";
import { CourierProviderRecord } from "@/types/shipping.types";
import { getCourierLogsAction } from "@/actions/logistics.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface Props {
  courier: CourierProviderRecord | null;
  onClose: () => void;
}

export function CourierLogsModal({ courier, onClose }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    if (!courier) return;
    setLoading(true);
    try {
      const res = await getCourierLogsAction(courier.code);
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courier) {
      fetchLogs();
    } else {
      setLogs([]);
    }
  }, [courier]);

  if (!courier) return null;

  return (
    <Dialog open={!!courier} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div>
            <DialogTitle className="text-xl">
              API Logs — {courier.display_name}
            </DialogTitle>
            <DialogDescription className="mt-1">
              Recent outbound API requests, latency, and response status codes.
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="h-8 mr-8"
          >
            <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading && logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 animate-spin text-primary" />
              Loading API logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No API requests recorded for this courier yet.
            </div>
          ) : (
            logs.map((log) => {
              const isSuccess = log.success && log.status_code >= 200 && log.status_code < 300;
              const dateStr = new Date(log.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <div
                  key={log.id}
                  className="rounded-lg border bg-card p-3.5 text-card-foreground shadow-sm space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-muted-foreground">{dateStr}</span>
                      <Badge variant="outline" className="font-semibold px-1.5 py-0 text-[10px]">
                        {log.method}
                      </Badge>
                      <span className="font-medium text-foreground">{log.endpoint}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono">
                        {log.response_time_ms}ms
                      </span>
                      {isSuccess ? (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 font-mono">
                          <CheckCircle className="h-3 w-3" />
                          {log.status_code}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 font-mono">
                          <AlertCircle className="h-3 w-3" />
                          {log.status_code || "ERR"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {log.error_message && (
                    <div className="rounded bg-destructive/10 p-2 text-destructive font-mono text-[11px] break-all">
                      {log.error_message}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
