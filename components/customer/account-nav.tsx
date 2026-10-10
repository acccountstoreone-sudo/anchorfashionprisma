"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Shield,
  ShoppingBag,
  Heart,
  Award,
  Ticket,
  Star,
  Bell,
  RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/account", icon: User, exact: true },
  { label: "Profile Management", href: "/account/profile", icon: User },
  { label: "Account Security", href: "/account/security", icon: Shield },
  { label: "Order History", href: "/account/orders", icon: ShoppingBag },
  { label: "Returns & Exchanges", href: "/account/returns", icon: RefreshCcw },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Loyalty Program", href: "/account/loyalty", icon: Award },
  { label: "Coupons & Offers", href: "/account/coupons", icon: Ticket },
  { label: "Reviews & Ratings", href: "/account/reviews", icon: Star },
  { label: "Notifications", href: "/account/notifications", icon: Bell },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col space-y-1">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname?.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-[#C9A86A]/15 text-[#C9A86A] dark:text-[#E5CA92] font-semibold border-l-4 border-[#C9A86A] shadow-sm pl-3"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon
              className={cn(
                "h-5 w-5 shrink-0 transition-colors",
                isActive ? "text-[#C9A86A] dark:text-[#E5CA92]" : "text-muted-foreground"
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
