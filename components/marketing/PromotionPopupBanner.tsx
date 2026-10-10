"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Sparkles, Tag, ArrowRight } from "lucide-react";
import { PromotionRecord } from "@/lib/repositories/marketing/promotion.repository";
import { getActivePromotionAction } from "@/actions/marketing.actions";

interface PromotionPopupBannerProps {
  initialPromotion?: PromotionRecord | null;
}

export function PromotionPopupBanner({ initialPromotion }: PromotionPopupBannerProps) {
  const [promo, setPromo] = useState<PromotionRecord | null>(initialPromotion || null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadActivePromotion() {
      if (!initialPromotion) {
        try {
          const res = await getActivePromotionAction();
          if (res.success && res.data && isMounted) {
            setPromo(res.data);
          }
        } catch (err) {
          console.warn("[PromotionPopupBanner] Failed to load promotion:", err);
        }
      }
    }

    loadActivePromotion();
    return () => {
      isMounted = false;
    };
  }, [initialPromotion]);

  useEffect(() => {
    if (!promo || !promo.is_active || promo.show_popup === false) return;

    // Check if user already dismissed or interacted with this promotion in this session
    const storageKey = `seen_promo_popup_${promo.id}`;
    if (typeof window !== "undefined") {
      const alreadySeen = sessionStorage.getItem(storageKey);
      if (alreadySeen) return;
    }

    const delaySeconds = promo.popup_delay && promo.popup_delay > 0 ? promo.popup_delay : 5;
    const timer = setTimeout(() => {
      if (!hasInteracted) {
        setIsOpen(true);
      }
    }, delaySeconds * 1000);

    return () => clearTimeout(timer);
  }, [promo, hasInteracted]);

  const handleClose = () => {
    setIsOpen(false);
    setHasInteracted(true);
    if (promo?.id && typeof window !== "undefined") {
      sessionStorage.setItem(`seen_promo_popup_${promo.id}`, "true");
    }
  };

  const handleBannerClick = () => {
    setIsOpen(false);
    setHasInteracted(true);
    if (promo?.id && typeof window !== "undefined") {
      sessionStorage.setItem(`seen_promo_popup_${promo.id}`, "true");
    }
  };

  if (!isOpen || !promo || !promo.banner_url) return null;

  const targetLink = promo.banner_link && promo.banner_link.trim() !== "" ? promo.banner_link : "/products";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-xl shadow-2xl animate-in zoom-in-95 duration-300 bg-transparent"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-banner-title"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black transition-colors"
          aria-label="Close promotion banner"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Promo Image */}
        {promo.banner_url && (
          <Link
            href={targetLink}
            onClick={handleBannerClick}
            className="relative block w-full aspect-[4/3] sm:aspect-[16/9] overflow-hidden bg-zinc-900 group cursor-pointer"
          >
            <Image
              src={promo.banner_url}
              alt={promo.name || "Promotion"}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 800px"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </Link>
        )}
      </div>
    </div>
  );
}
