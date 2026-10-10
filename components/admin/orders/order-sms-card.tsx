"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  getOrderSmsLogsAction,
  resendOrderConfirmationSmsAction,
} from "@/app/actions/admin/sms.actions";
import { SmsLog } from "@/types/sms.types";

interface OrderSmsCardProps {
  orderId: string;
  orderStatus: string;
  customerPhone?: string | null;
}

export function OrderSmsCard({
  orderId,
  orderStatus,
  customerPhone,
}: OrderSmsCardProps) {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getOrderSmsLogsAction(orderId);
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const isConfirmed = orderStatus.toLowerCase() === "confirmed";
  const latestLog = logs[0] || null;

  const handleResendSms = async () => {
    if (!isConfirmed) {
      toast.error("SMS can only be sent for orders with 'CONFIRMED' status.");
      return;
    }

    setIsResending(true);
    try {
      const res = await resendOrderConfirmationSmsAction(orderId);
      if (res.success) {
        toast.success(
          `Confirmation SMS dispatched successfully! ${
            res.requestId ? `(Request ID: ${res.requestId})` : ""
          }`
        );
        await fetchLogs();
      } else {
        toast.error(res.error || "Failed to dispatch SMS.");
        await fetchLogs();
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            SMS Notification (Alpha SMS)
          </CardTitle>
          {latestLog ? (
            latestLog.status === "SENT" ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Sent
              </Badge>
            ) : latestLog.status === "FAILED" ? (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> Failed
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                <Clock className="h-3 w-3" /> Pending
              </Badge>
            )
          ) : (
            <Badge variant="secondary" className="text-xs">
              Not Sent
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Automated customer SMS dispatch via Alpha SMS REST API
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading SMS status...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs py-1 border-b">
              <span className="text-muted-foreground">Provider:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                {latestLog?.provider || "Alpha SMS (api.sms.net.bd)"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b">
              <span className="text-muted-foreground">Recipient Mobile:</span>
              <span className="font-mono font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                <Phone className="h-3 w-3 text-muted-foreground" />
                {latestLog?.phone || customerPhone || "N/A"}
              </span>
            </div>

            {latestLog?.request_id && (
              <div className="flex items-center justify-between text-xs py-1 border-b">
                <span className="text-muted-foreground">Request ID:</span>
                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {latestLog.request_id}
                </span>
              </div>
            )}

            {latestLog?.created_at && (
              <div className="flex items-center justify-between text-xs py-1 border-b">
                <span className="text-muted-foreground">Dispatched At:</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {new Date(latestLog.created_at).toLocaleString()}
                </span>
              </div>
            )}

            {/* If Failed, show error reason */}
            {latestLog?.status === "FAILED" && latestLog.error_message && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Delivery Failure:</p>
                  <p className="text-[11px] leading-relaxed">{latestLog.error_message}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <Button
                variant={latestLog?.status === "FAILED" ? "default" : "outline"}
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={handleResendSms}
                disabled={isResending || !isConfirmed}
              >
                {isResending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {latestLog?.status === "SENT"
                  ? "Resend Confirmation SMS"
                  : "Send Confirmation SMS"}
              </Button>

              {!isConfirmed && (
                <p className="text-[11px] text-amber-600 text-center">
                  * SMS can only be dispatched after order is confirmed.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
