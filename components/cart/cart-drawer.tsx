"use client";

import { useCartStore } from "@/stores/use-cart-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CartItem } from "./cart-item";
import { useRouter } from "next/navigation";
import { ShoppingBag, Loader2, ArrowRight, Heart } from "lucide-react";
import Image from "next/image";
import { ProductCard } from "@/components/product/product-card";
import { usePersonalizationStore } from "@/stores/use-personalization-store";

export function CartDrawer() {
  const { cart, isSheetOpen, setSheetOpen, isLoading } = useCartStore();
  const router = useRouter();

  const handleCheckout = () => {
    setSheetOpen(false);
    router.push("/checkout");
  };

  const itemCount =
    cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const subtotal =
    cart?.items?.reduce((sum, item) => {
      const product = item.product as any;
      const price =
        item.variant?.sale_price ||
        item.variant?.price ||
        product?.sale_price ||
        product?.base_price ||
        product?.price ||
        0;
      return sum + price * item.quantity;
    }, 0) || 0;

  const FREE_SHIPPING_THRESHOLD = 999;
  const progress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const amountNeeded = FREE_SHIPPING_THRESHOLD - subtotal;
  
  const { recentlyViewed } = usePersonalizationStore();
  const upsells = recentlyViewed.filter(p => !cart?.items?.some(item => item.product_id === p.id)).slice(0, 2);

  return (
    <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Your Cart ({itemCount})
          </SheetTitle>
          <SheetDescription>
            Review your items and proceed to checkout.
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        <div className="mt-4 flex-1 overflow-hidden">
          {!cart || !cart.items || cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-6 text-center px-4 py-8">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-neutral-100/90 border border-neutral-200/80 shadow-sm">
                <ShoppingBag className="h-10 w-10 text-neutral-600 stroke-[1.5]" />
              </div>
              <div className="space-y-2 max-w-[280px]">
                <h3 className="text-xl font-medium tracking-tight text-neutral-900">
                  Your cart is empty
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Looks like you haven&apos;t added anything to your cart yet. Discover our latest arrivals and elevate your wardrobe.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 w-full max-w-[240px] pt-1">
                <Button
                  onClick={() => {
                    setSheetOpen(false);
                    router.push("/products");
                  }}
                  className="h-11 w-full bg-[#1A1A1A] text-xs font-bold uppercase tracking-widest text-white shadow-sm hover:bg-black transition-all"
                >
                  Start Shopping
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSheetOpen(false);
                    router.push("/account/wishlist");
                  }}
                  className="h-10 w-full text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-black border-neutral-200 hover:bg-neutral-50"
                >
                  <Heart className="mr-2 h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />
                  View Wishlist
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {/* Free Shipping Progress */}
              <div className="mb-4 bg-gray-50 p-4 rounded-lg">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-[#1A1A1A]">
                  <span>
                    {amountNeeded > 0 
                      ? `You're only ৳${amountNeeded.toLocaleString()} away from Free Shipping` 
                      : "🎉 You've unlocked Free Shipping!"}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div 
                    className="h-full bg-[#1A1A1A] transition-all duration-500 ease-out" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <CartItem key={item.id} item={item} />
                  ))}
                </div>
                
                {/* Upsells */}
                {upsells.length > 0 && (
                  <div className="mt-10 border-t border-gray-100 pt-6">
                    <h4 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#1A1A1A]">
                      Complete Your Look
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {upsells.map((upsell) => (
                        <div key={upsell.id} className="group relative flex flex-col gap-2">
                           <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                             <Image src={upsell.product_media?.[0]?.url || "/images/placeholder.webp"} alt={upsell.name} fill sizes="(max-width: 768px) 50vw, 200px" className="object-cover" />
                           </div>
                           <p className="truncate text-xs font-medium">{upsell.name}</p>
                           <p className="text-[10px] text-gray-500">৳{upsell.base_price}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        {cart && cart.items && cart.items.length > 0 && (
          <div className="mt-auto space-y-4 border-t pt-4 bg-white z-10 relative">
            <div className="flex items-center justify-between font-medium text-[#1A1A1A]">
              <span>Subtotal</span>
              <span>৳{subtotal.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500">
              Shipping & taxes calculated at checkout.
            </p>
            <div className="space-y-2">
              <Button className="w-full bg-[#1A1A1A] h-12 text-xs font-bold uppercase tracking-widest text-white hover:bg-black" onClick={handleCheckout}>
                Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-xs font-semibold uppercase tracking-widest text-gray-500 hover:text-black"
                onClick={() => {
                  setSheetOpen(false);
                  router.push("/cart");
                }}
              >
                View Cart
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
