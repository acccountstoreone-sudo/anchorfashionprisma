"use client";

import { useState, useEffect } from "react";
import { X, Gift, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromotionData {
  id: string;
  title: string;
  description?: string | null;
  code?: string | null;
  type?: string | null;
  value?: number | null;
  isActive?: boolean;
}

export function FloatingPromotion() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [promotion, setPromotion] = useState<PromotionData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/promotions/active")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.promotion && data.promotion.isActive !== false) {
          setPromotion(data.promotion);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Show popup after 6 seconds if not dismissed
    const timer = setTimeout(() => {
      if (!isDismissed) setIsVisible(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [isDismissed]);

  const handleCopyCode = () => {
    if (promotion?.code) {
      navigator.clipboard.writeText(promotion.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isVisible || isDismissed || !promotion) return null;

  return (
    <div className="fixed bottom-24 md:bottom-4 right-4 z-40 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="relative bg-white shadow-2xl rounded-xl border border-gray-100 p-4 pr-10 w-[300px]">
        <button
          onClick={() => {
            setIsVisible(false);
            setIsDismissed(true);
          }}
          aria-label="Dismiss promotion"
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="bg-amber-50 p-2.5 rounded-full text-amber-600 shrink-0 mt-0.5">
            <Gift className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#1A1A1A] leading-snug">
              {promotion.title}
            </h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {promotion.description || "Special offer exclusively for you."}
            </p>

            {promotion.code && (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50/80 hover:bg-amber-100 border border-amber-200/60 text-[11px] font-bold text-amber-900 transition-colors cursor-pointer"
                  title="Click to copy coupon code"
                >
                  <span>{promotion.code}</span>
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-amber-700" />
                  )}
                </button>
                {copied && (
                  <span className="text-[10px] text-emerald-600 font-semibold animate-in fade-in">
                    Copied!
                  </span>
                )}
              </div>
            )}

            <div className="mt-2.5 flex items-center justify-between">
              <a
                href="/account/loyalty"
                className="text-xs font-semibold uppercase tracking-wider text-[#C9A86A] hover:text-black transition-colors"
              >
                Claim Offer →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
