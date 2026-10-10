"use client";

import { useEffect, useRef } from "react";
import { useCheckoutStore } from "@/stores/use-checkout-store";

import { CheckoutSession } from "@/types/checkout.types";

export function CheckoutStoreInitializer({
  cartId,
  initialSession,
}: {
  cartId: string;
  initialSession?: CheckoutSession | null;
}) {
  const initialized = useRef(false);
  const { fetchSession, setSession } = useCheckoutStore();

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (initialSession) {
        setSession(initialSession);
      } else {
        fetchSession(cartId);
      }
    }
  }, [cartId, initialSession, fetchSession, setSession]);

  return null;
}
