"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Gift, Sparkles, Loader2, CheckCircle2, Ticket, Copy, Wallet } from "lucide-react";
import { toast } from "sonner";
import { redeemLoyaltyPointsAction, fetchRewardCatalogAction } from "@/app/actions/customer.actions";
import Link from "next/link";

export function RedeemRewardsDialog({
  userPoints = 0,
  triggerClassName,
}: {
  userPoints?: number;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voucherResult, setVoucherResult] = useState<{
    code: string;
    walletCredited?: boolean;
    rewardTitle: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && options.length === 0) {
      setLoading(true);
      fetchRewardCatalogAction().then(res => {
        if (res.success && res.data) {
          setOptions(res.data);
          if (res.data.length > 0) {
            setSelectedOption(res.data[0]);
          }
        }
        setLoading(false);
      });
    }
  }, [open]);

  const handleRedeem = async () => {
    if (!selectedOption) return;
    
    if (userPoints < selectedOption.points_cost) {
      toast.error(
        `Insufficient points! You need ${selectedOption.points_cost.toLocaleString()} pts, but have ${userPoints.toLocaleString()} pts.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await redeemLoyaltyPointsAction({
        rewardId: selectedOption.id,
      });

      if (res.success && res.data) {
        setVoucherResult({
          code: res.data.voucherCode || "Active",
          walletCredited: selectedOption.credit_wallet,
          rewardTitle: selectedOption.title,
        });
        toast.success("Points successfully redeemed!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to redeem points");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Voucher code copied to clipboard!");
  };

  const handleReset = () => {
    setVoucherResult(null);
    setOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={
          triggerClassName ||
          "w-full bg-[#1A1A1A] hover:bg-black text-white font-semibold uppercase tracking-widest h-12"
        }
      >
        <Gift className="mr-2 h-4 w-4" /> Redeem Rewards
      </Button>

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setVoucherResult(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {voucherResult ? (
          <div className="py-6 space-y-5 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <DialogTitle className="text-xl">Reward Redeemed Successfully!</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {voucherResult.rewardTitle}
              </DialogDescription>
            </div>

            {voucherResult.walletCredited && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-center gap-2">
                <Wallet className="h-4 w-4" />
                <span>
                  Your customer wallet has been credited directly with store balance!
                </span>
              </div>
            )}

            <div className="p-4 bg-muted/60 border rounded-lg space-y-2">
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Your Reward Voucher Code
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-xl font-bold tracking-widest text-primary">
                  {voucherResult.code}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  onClick={() => handleCopy(voucherResult.code)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Apply this voucher code during checkout or view in your account.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" onClick={handleReset}>
                Done
              </Button>
              <Button asChild>
                <Link href="/account/coupons">
                  <Ticket className="mr-2 h-4 w-4" /> View Coupons
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-amber-500/10 text-amber-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Redeem Loyalty Points</DialogTitle>
                    <DialogDescription className="text-xs">
                      Exchange your points for store credit vouchers and gifts.
                    </DialogDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {userPoints.toLocaleString()} PTS Available
                </Badge>
              </div>
            </DialogHeader>

            <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-8 text-center flex flex-col items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs mt-2 text-muted-foreground">Loading rewards...</p>
                </div>
              ) : options.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No rewards available.</p>
              ) : options.map((opt) => {
                const canAfford = userPoints >= opt.points_cost;
                const isSelected = selectedOption?.id === opt.id;

                return (
                  <Card
                    key={opt.id}
                    onClick={() => setSelectedOption(opt)}
                    className={`p-3.5 cursor-pointer transition-all border ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm leading-tight">{opt.title}</h4>
                          {opt.credit_wallet && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 py-0"
                            >
                              Wallet Credit
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {opt.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-sm font-bold block ${
                            canAfford ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {opt.points_cost.toLocaleString()} PTS
                        </span>
                        <span
                          className={`text-[10px] uppercase font-semibold ${
                            canAfford ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                          }`}
                        >
                          {canAfford ? "Available" : "Need pts"}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleRedeem}
                disabled={isSubmitting || !selectedOption || userPoints < selectedOption.points_cost}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redeeming...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4" />
                    Redeem {selectedOption ? `for ${selectedOption.points_cost.toLocaleString()} PTS` : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  </>
);
}
