import { Metadata } from "next";
import { fetchCartAction } from "@/lib/actions/cart.actions";
import { CartClient } from "@/components/cart/cart-client";

export const metadata: Metadata = {
  title: "Your Cart | Anchor Fashion",
  description: "Review your cart items before checkout.",
};

export default async function CartPage() {
  const { cart, success } = await fetchCartAction();

  return <CartClient initialCart={success && cart ? cart : null} />;
}
