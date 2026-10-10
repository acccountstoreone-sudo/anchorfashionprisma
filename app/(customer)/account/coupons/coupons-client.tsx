"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket, Copy, CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";

export function CouponsClient({ coupons }: { coupons: any[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (code: string, id: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopiedId(id);
      toast.success(`Coupon code ${code} copied to clipboard!`);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      toast.error("Failed to copy code. Please copy manually: " + code);
    }
  };

  const available = coupons.filter(c => c.type === "Available" && !c.recommended);
  const recommended = coupons.filter(c => c.recommended);
  const used = coupons.filter(c => c.type === "Used");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1A1A1A]">Coupons & Offers</h1>
          <p className="mt-2 text-sm text-gray-500">
            View available discounts and personalized offers.
          </p>
        </div>
      </div>

      {recommended.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#1A1A1A] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#C9A86A]" /> Recommended For You
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            {recommended.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} copiedId={copiedId} onCopy={handleCopy} isPremium />
            ))}
          </div>
        </div>
      )}

      {available.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#1A1A1A]">Available Coupons</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {available.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} copiedId={copiedId} onCopy={handleCopy} />
            ))}
          </div>
        </div>
      )}

      {used.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-gray-100">
          <h3 className="text-lg font-medium text-gray-500">Past Offers</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {used.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} copiedId={copiedId} onCopy={handleCopy} isUsed />
            ))}
          </div>
        </div>
      )}
      
      {coupons.length === 0 && (
        <div className="py-12 text-center border-2 border-dashed rounded-lg border-gray-200">
          <Ticket className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No coupons available</h3>
          <p className="mt-1 text-sm text-gray-500">Check back later for new offers.</p>
        </div>
      )}
    </div>
  );
}

function CouponCard({ coupon, copiedId, onCopy, isPremium, isUsed }: any) {
  const isCopied = copiedId === coupon.id;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 bg-card border",
        isUsed
          ? "opacity-60 bg-muted/30 border-muted grayscale-[0.5]"
          : "border-border shadow-sm hover:shadow-md",
        isPremium ? "border-[#C9A86A]/40 bg-gradient-to-br from-card via-card to-[#C9A86A]/10" : ""
      )}
    >
      <div className="absolute top-0 left-0 bottom-0 w-2 bg-gradient-to-b from-[#1A1A1A] to-[#2D2D2D] opacity-20" />
      {isPremium && (
        <div className="absolute top-0 left-0 bottom-0 w-2 bg-gradient-to-b from-[#C9A86A] to-[#B08D55]" />
      )}

      <CardHeader className="pb-4 pl-6 border-b border-dashed border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle
              className={cn(
                "text-2xl font-light tracking-tight",
                isPremium ? "text-[#C9A86A] dark:text-[#E5CA92]" : "text-foreground"
              )}
            >
              {coupon.discount}
            </CardTitle>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {coupon.description}
            </p>
          </div>
          <div
            className={cn(
              "rounded-full p-2.5",
              isPremium ? "bg-[#C9A86A]/10 text-[#C9A86A]" : "bg-muted text-muted-foreground"
            )}
          >
            <Ticket className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 pt-4 pl-6 bg-muted/20">
        <div>
          <div className="inline-block bg-background px-3 py-1.5 rounded-md border border-border shadow-xs">
            <span className="font-mono font-bold tracking-widest text-sm text-foreground">
              {coupon.code}
            </span>
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
            {coupon.expiry}
          </p>
        </div>

        {!isUsed && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-10 px-4 shrink-0 font-semibold uppercase tracking-wider text-xs transition-all duration-200",
              isCopied
                ? "bg-[#C9A86A] text-white border-[#C9A86A] hover:bg-[#B08D55]"
                : "border-border text-foreground hover:bg-[#C9A86A]/10 hover:text-[#C9A86A] hover:border-[#C9A86A]/50"
            )}
            onClick={() => onCopy(coupon.code, coupon.id)}
          >
            {isCopied ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
