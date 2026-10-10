"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, RefreshCw, AlertCircle, Clock } from "lucide-react";

interface CodOtpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maskedTarget: string;
  targetType?: "email" | "phone";
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  isVerifying: boolean;
  isResending: boolean;
  initialCooldown?: number;
  errorMessage?: string | null;
}

export function CodOtpDialog({
  open,
  onOpenChange,
  maskedTarget,
  targetType = "email",
  onVerify,
  onResend,
  isVerifying,
  isResending,
  initialCooldown = 60,
  errorMessage,
}: CodOtpDialogProps) {
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 minutes

  // Handle resend cooldown countdown
  useEffect(() => {
    if (!open) return;
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [open, cooldown]);

  // Handle overall 10-minute expiry countdown
  useEffect(() => {
    if (!open) return;
    if (expirySeconds <= 0) return;

    const timer = setInterval(() => {
      setExpirySeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [open, expirySeconds]);

  // Format mm:ss
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6 && !isVerifying) {
      await onVerify(otp);
    }
  };

  const handleResendClick = async () => {
    if (cooldown > 0 || isResending) return;
    await onResend();
    setCooldown(60);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="text-center sm:text-left space-y-2">
          <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Verify Cash on Delivery Order
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            To prevent fraudulent or duplicate orders, please enter the 6-digit verification code sent to{" "}
            <span className="font-semibold text-foreground">{maskedTarget}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="h-3.5 w-3.5" />
                Code expires in:
              </span>
              <span className={`font-mono font-semibold ${expirySeconds < 120 ? "text-destructive" : "text-foreground"}`}>
                {formatTime(expirySeconds)}
              </span>
            </div>

            <Input
              id="cod-otp-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={handleOtpChange}
              autoFocus
              className="text-center font-mono text-3xl tracking-[12px] h-14 font-bold border-2 focus-visible:ring-amber-500"
            />

            {errorMessage && (
              <div className="flex items-start gap-2 text-xs text-destructive mt-1.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted-foreground">Didn&apos;t receive the code?</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={cooldown > 0 || isResending}
              onClick={handleResendClick}
              className="h-8 px-2 text-xs font-medium text-primary hover:text-primary/80"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={otp.length !== 6 || isVerifying || expirySeconds <= 0}
              className="min-w-[140px]"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Confirm"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
