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
  { label: "Profile", href: "/account/profile", icon: User },
  { label: "Orders", href: "/account/orders", icon: ShoppingBag },
  { label: "Returns", href: "/account/returns", icon: RefreshCcw },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Loyalty", href: "/account/loyalty", icon: Award },
  { label: "Coupons", href: "/account/coupons", icon: Ticket },
  { label: "Reviews", href: "/account/reviews", icon: Star },
  { label: "Security", href: "/account/security", icon: Shield },
  { label: "Alerts", href: "/account/notifications", icon: Bell },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Mobile Horizontal Pill Capsule Bar (Responsive Mobile View) ── */}
      <div className="md:hidden w-full overflow-x-auto pb-2 scrollbar-none no-scrollbar">
        <div className="flex items-center gap-2 min-w-max p-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-2xs whitespace-nowrap",
                  isActive
                    ? "bg-gradient-to-r from-[#DFBA73] to-[#C9A86A] text-black shadow-sm font-extrabold"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-colors",
                    isActive ? "text-black" : "text-muted-foreground"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Desktop Vertical Navigation Sidebar (MD & Above) ── */}
      <nav className="hidden md:flex flex-col space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-[#C9A86A]/15 text-[#C9A86A] dark:text-[#E5CA92] font-semibold border-l-4 border-[#C9A86A] shadow-xs pl-3.5"
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
    </>
  );
}
