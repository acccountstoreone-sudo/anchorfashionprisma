"use client";

import { useState, useEffect } from "react";
import { X, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingPromotion() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Show after 5 seconds
    const timer = setTimeout(() => {
      if (!isDismissed) setIsVisible(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isDismissed]);

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-24 md:bottom-4 right-4 z-40 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="relative bg-white shadow-2xl rounded-xl border border-gray-100 p-4 pr-10 w-[280px]">
        <button 
          onClick={() => {
            setIsVisible(false);
            setIsDismissed(true);
          }}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="bg-amber-50 p-2 rounded-full text-amber-600">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#1A1A1A]">Join Anchor VIP</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Get 15% off your first order when you sign up for our loyalty program.
            </p>
            <a href="/account/loyalty" className="inline-block mt-2 text-xs font-semibold uppercase tracking-widest text-[#C9A86A] hover:text-black transition-colors">
              Claim Offer
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
