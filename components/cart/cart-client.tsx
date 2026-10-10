"use client";

import { useEffect } from "react";
import { CartItem as CartItemComponent } from "@/components/cart/cart-item";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShoppingBag, ArrowRight, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { useCartStore } from "@/stores/use-cart-store";
import { Cart } from "@/types/checkout.types";
import { formatCurrency } from "@/lib/utils";
import { jost } from "@/lib/fonts";

interface CartClientProps {
  initialCart: Cart | null;
}

const FREE_SHIPPING_THRESHOLD = 999;

export function CartClient({ initialCart }: CartClientProps) {
  const { cart, fetchCart } = useCartStore();

  // Use store cart if available, otherwise use initial server-fetched cart
  const currentCart = cart || initialCart;
  const items = currentCart?.items || [];

  // Fetch cart on mount to sync any cross-tab changes
  useEffect(() => {
    if (!cart) {
      fetchCart();
    }
  }, [cart, fetchCart]);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce((sum, item) => {
    const product = item.product as any;
    const price =
      item.variant?.sale_price ||
      item.variant?.price ||
      product?.sale_price ||
      product?.base_price ||
      product?.price ||
      0;
    return sum + price * item.quantity;
  }, 0);

  const progress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const amountNeeded = FREE_SHIPPING_THRESHOLD - subtotal;

  if (items.length === 0) {
    return (
      <div className={`${jost.className} container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center`}>
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <ShoppingBag className="h-10 w-10" strokeWidth={1.5} />
        </div>
        <h1 className="mb-2 text-2xl sm:text-3xl font-light tracking-tight text-gray-900">
          Your shopping cart is empty
        </h1>
        <p className="mb-8 max-w-md text-sm text-gray-500">
          Explore our signature collections, new arrivals, and luxury essentials to find your perfect fit.
        </p>
        <Button size="lg" className="rounded-full bg-black px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[#C9A86A]" asChild>
          <Link href="/products">
            Start Shopping
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={`${jost.className} container mx-auto px-4 py-8 md:py-12`}>
      <div className="mb-8 flex items-baseline justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-gray-900">
            Shopping Cart
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            {totalQuantity} {totalQuantity === 1 ? "item" : "items"} selected
          </p>
        </div>
        <Link
          href="/products"
          className="text-xs font-semibold uppercase tracking-wider text-[#C9A86A] hover:text-black transition-colors"
        >
          Continue Shopping &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Cart Items List */}
        <div className="lg:col-span-8">
          {/* Free Shipping Meter */}
          <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-900">
              <span className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-[#C9A86A]" />
                {amountNeeded > 0
                  ? `Add ${formatCurrency(amountNeeded)} more for FREE Home Delivery`
                  : "🎉 You've unlocked FREE Home Delivery!"}
              </span>
              <span className="text-[11px] text-gray-500">
                Threshold: {formatCurrency(FREE_SHIPPING_THRESHOLD)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-black transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
            {items.map((item) => (
              <CartItemComponent key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-3">
              Order Summary
            </h2>

            <div className="mt-4 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({totalQuantity} items)</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>
                  {amountNeeded <= 0 ? (
                    <span className="font-semibold text-emerald-600">FREE</span>
                  ) : (
                    "Calculated at checkout"
                  )}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Taxes & Duties</span>
                <span className="text-gray-400">Included</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm sm:text-base font-bold text-gray-900">
              <span>Estimated Total</span>
              <span className="text-lg">{formatCurrency(subtotal)}</span>
            </div>

            <Button
              size="lg"
              className="mt-6 w-full rounded-full bg-black py-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#C9A86A] shadow-md"
              asChild
            >
              <Link href="/checkout" className="flex items-center justify-center gap-2">
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            {/* Trust Features */}
            <div className="mt-6 space-y-2.5 border-t border-gray-100 pt-4 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#C9A86A] shrink-0" />
                <span>100% Encrypted & Secure Checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#C9A86A] shrink-0" />
                <span>Fast Nationwide Courier Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-[#C9A86A] shrink-0" />
                <span>7-Day Hassle-Free Return Policy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
