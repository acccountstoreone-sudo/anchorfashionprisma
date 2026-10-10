"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, User, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ADMIN_ROLES, MANAGER_ROLES } from "@/lib/constants/auth";
import { useCartStore } from "@/stores/use-cart-store";
import { useWishlistStore } from "@/stores/use-wishlist-store";
import { useState, useEffect } from "react";

export function MobileBottomNav({ user }: { user: any }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { cart } = useCartStore();
  const { wishlist } = useWishlistStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartItemCount =
    cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const wishlistItemCount = wishlist?.items?.length || 0;

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return "U";
  };

  const role = user?.user_metadata?.role || user?.app_metadata?.role || "CUSTOMER";
  const accountHref = !user
    ? "/auth/login"
    : ADMIN_ROLES.includes(role)
      ? "/admin"
      : MANAGER_ROLES.includes(role)
        ? "/manager"
        : "/account/profile";

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Search", href: "/search", icon: Search },
    { label: "Wishlist", href: ADMIN_ROLES.includes(role) ? "/admin" : "/account/wishlist", icon: Heart },
    { label: "Cart", href: "/cart", icon: ShoppingCart },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 h-[72px] w-full border-t border-gray-100 bg-white/90 backdrop-blur-md pb-safe md:hidden">
      <div className="mx-auto grid h-full max-w-lg grid-cols-5 font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isCart = item.label === "Cart";
          const isWishlist = item.label === "Wishlist";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group inline-flex flex-col items-center justify-center px-2 py-1 transition-colors ${
                isActive ? "text-[#1A1A1A]" : "text-gray-400 hover:text-[#1A1A1A]"
              }`}
            >
              <div className="relative">
                <item.icon
                  className={`mb-1.5 h-6 w-6 transition-transform duration-300 ${
                    isActive ? "text-[#1A1A1A] scale-110" : ""
                  } ${isWishlist && mounted && wishlistItemCount > 0 ? "text-red-600 fill-red-600" : ""}`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {isCart && mounted && cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black text-[8px] font-bold text-white">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
                {isWishlist && mounted && wishlistItemCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white">
                    {wishlistItemCount > 99 ? "99+" : wishlistItemCount}
                  </span>
                )}
              </div>
              <span className={`text-[9px] uppercase tracking-widest transition-colors ${isActive ? 'font-bold text-[#1A1A1A]' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Profile Tab */}
        <Link
          href={accountHref}
          className={`group inline-flex flex-col items-center justify-center px-2 py-1 transition-colors ${
            pathname.includes("/account") || pathname === "/auth/login" || pathname.startsWith("/admin") || pathname.startsWith("/manager")
              ? "text-[#1A1A1A]"
              : "text-gray-400 hover:text-[#1A1A1A]"
          }`}
        >
          {user ? (
            <Avatar className={`mb-1.5 h-6 w-6 border-2 transition-transform duration-300 ${pathname.includes("/account") ? "border-[#1A1A1A] scale-110" : "border-transparent"}`}>
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                {getInitials(user.user_metadata?.full_name, user.email)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <User
              className={`mb-1.5 h-6 w-6 transition-transform duration-300 ${
                pathname === "/auth/login" ? "text-[#1A1A1A] scale-110" : ""
              }`}
              strokeWidth={pathname === "/auth/login" ? 2 : 1.5}
            />
          )}
          <span className={`text-[9px] uppercase tracking-widest transition-colors ${pathname.includes("/account") || pathname === "/auth/login" ? 'font-bold text-[#1A1A1A]' : 'font-medium'}`}>
            {user ? "Profile" : "Login"}
          </span>
        </Link>
      </div>
    </div>
  );
}
