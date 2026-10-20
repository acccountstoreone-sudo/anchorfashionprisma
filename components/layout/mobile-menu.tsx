"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Heart,
  Package,
  User as UserIcon,
  Phone,
  MessageCircle,
  MapPin,
  Ruler,
  LogOut,
  Crown,
  ShieldCheck,
  Truck,
  ArrowRight,
  ExternalLink,
  Flame,
  CheckCircle2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AnchorFashionLogo } from "@/components/shared/logo";
import { ADMIN_ROLES, MANAGER_ROLES } from "@/lib/constants/auth";
import { useCartStore } from "@/stores/use-cart-store";
import { useWishlistStore } from "@/stores/use-wishlist-store";
import { useSessionContext } from "@/providers/session-provider";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface MobileCategory {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  image_url?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface MobileNavLinkItem {
  label: string;
  href: string;
  megaMenu?: {
    leftCard?: {
      tag?: string;
      title: string;
      subtitle?: string;
      src: string;
      alt: string;
      href: string;
      ctaText?: string;
    };
    columns: Array<{
      title: string;
      links: Array<{ label: string; href: string }>;
    }>;
    rightCards?: Array<{
      tag?: string;
      title: string;
      src: string;
      alt: string;
      href: string;
      ctaText?: string;
    }>;
  };
}

export interface PremiumMobileMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  categories?: MobileCategory[];
  navLinks?: MobileNavLinkItem[];
  user?: any;
  cartItemCount?: number;
  wishlistItemCount?: number;
  contactPhone?: string;
  announcementBar?: string;
  triggerButton?: React.ReactNode;
}

// Curated luxury thumbnail fallbacks for categories if no image_url is uploaded
const CATEGORY_IMAGE_MAP: Record<string, string> = {
  panjabi: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&q=80",
  "kabli-set": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80",
  shirt: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&q=80",
  shirts: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&q=80",
  polo: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400&q=80",
  "t-shirt": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&q=80",
  bottom: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=80",
  trousers: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=80",
  denim: "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=400&q=80",
  outerwear: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80",
  blazer: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80",
  accessories: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400&q=80",
  men: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80",
  women: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80",
  kids: "https://images.unsplash.com/photo-1503944545259-babc49265b6e?w=400&q=80",
};

// Curated badge highlights for categories
const CATEGORY_BADGES: Record<string, { label: string; className: string }> = {
  panjabi: {
    label: "Festive Edit",
    className: "bg-amber-100 text-amber-900 border-amber-300 font-semibold",
  },
  "kabli-set": {
    label: "Royal Signature",
    className: "bg-amber-100 text-amber-900 border-amber-300 font-semibold",
  },
  shirt: {
    label: "Popular",
    className: "bg-slate-100 text-slate-800 border-slate-300",
  },
  polo: {
    label: "Best Seller",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  "t-shirt": {
    label: "Trending",
    className: "bg-blue-50 text-blue-800 border-blue-200",
  },
  outerwear: {
    label: "New Drop",
    className: "bg-purple-50 text-purple-800 border-purple-200",
  },
};

// Luxury curated editorial collections for Tab 2
const EDITORIAL_COLLECTIONS = [
  {
    title: "The Royal Festive Edit '26",
    subtitle: "Heritage Silks, Hand Embroidery & Zari Accents",
    tag: "FESTIVE SIGNATURE",
    href: "/categories/panjabi?occasion=festive",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80",
  },
  {
    title: "Executive Sartorial Shirts",
    subtitle: "100% Giza Cotton, Non-Iron Tech & Crisp Cuts",
    tag: "TAILORED LUXURY",
    href: "/categories/shirt?pattern=solid",
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80",
  },
  {
    title: "Heritage Afghan & Kabli Suits",
    subtitle: "Commanding Silhouettes for Celebrations",
    tag: "LIMITED EDITION",
    href: "/categories/kabli-set",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
  },
  {
    title: "Mercerized Knits & Luxury Polos",
    subtitle: "Understated Elegance for Modern Gentlemen",
    tag: "EVERYDAY REFINED",
    href: "/categories/polo",
    image: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&q=80",
  },
  {
    title: "Private Festive Sale",
    subtitle: "Up to 40% Off Select Handcrafted Garments",
    tag: "SPECIAL PRIVILEGE",
    href: "/products?sale=true",
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80",
  },
];

// Quick-tap trending search chips
const TRENDING_SEARCH_CHIPS = [
  "👑 Royal Panjabi",
  "👔 Executive Shirts",
  "✨ Silk Kabli",
  "🔥 Festive Drop",
  "🧥 Tailored Blazers",
  "⚡ New Arrivals",
];

export function PremiumMobileMenu({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  categories: propCategories,
  navLinks: propNavLinks,
  user: propUser,
  cartItemCount: propCartCount,
  wishlistItemCount: propWishlistCount,
  contactPhone = "+880 1812-998877",
  announcementBar,
  triggerButton,
}: PremiumMobileMenuProps) {
  const router = useRouter();

  // Internal open state fallback if not controlled
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (setControlledOpen) setControlledOpen(val);
    else setInternalOpen(val);
  };

  // State
  const [activeTab, setActiveTab] = useState<"categories" | "collections" | "account">("categories");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Context & Stores
  const { user: contextUser } = useSessionContext();
  const user = propUser !== undefined ? propUser : contextUser;

  const { cart } = useCartStore();
  const { wishlist } = useWishlistStore();
  const cartItemCount =
    propCartCount !== undefined
      ? propCartCount
      : cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const wishlistItemCount =
    propWishlistCount !== undefined
      ? propWishlistCount
      : wishlist?.items?.length || 0;

  // Roles
  const role = user?.user_metadata?.role || user?.app_metadata?.role || "CUSTOMER";
  const isAdmin = ADMIN_ROLES.includes(role);
  const isManager = MANAGER_ROLES.includes(role);

  const userInitials = (
    user?.user_metadata?.full_name ||
    user?.email ||
    "Guest"
  )
    .slice(0, 2)
    .toUpperCase();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Valued Patron";

  // Toggle Accordion expansion
  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Search submission
  const handleSearchSubmit = (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery !== undefined ? customQuery : searchQuery).trim();
    if (!query) return;

    setOpen(false);
    // Remove leading emoji if tapped from chips
    const cleanedQuery = query.replace(/^[\p{Emoji}\s]+/u, "").trim();
    router.push(`/search?q=${encodeURIComponent(cleanedQuery)}`);
  };

  // Logout handler
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      useCartStore.setState({ cart: null, error: null });
      try {
        await authClient.signOut();
      } catch (authErr) {
        console.warn("SignOut notice:", authErr);
      }
      try {
        localStorage.removeItem("anchor_user_password");
        document.cookie = "af_guest_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } catch {}
      toast.success("Signed out successfully");
      setOpen(false);
      window.location.href = "/auth/login";
    } catch {
      window.location.href = "/auth/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  const closeMenu = () => setOpen(false);

  // Fallback links if navLinks aren't passed
  const navLinks = propNavLinks || [
    { label: "PANJABI", href: "/categories/panjabi" },
    { label: "SHIRTS", href: "/categories/shirt" },
    { label: "POLOS", href: "/categories/polo" },
    { label: "T-SHIRTS", href: "/categories/t-shirt" },
    { label: "BOTTOMS", href: "/categories/bottom" },
    { label: "OUTERWEAR", href: "/categories/outerwear" },
    { label: "ACCESSORIES", href: "/categories/accessories" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {triggerButton && <SheetTrigger asChild>{triggerButton}</SheetTrigger>}

      <SheetContent
        side="left"
        className="flex h-full w-[92vw] max-w-[420px] flex-col bg-[#FCFCFD] p-0 shadow-2xl border-r border-[#C9A86A]/20 sm:max-w-md focus:outline-none"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Explore Anchor Fashion collections, categories and your account.</SheetDescription>
        </SheetHeader>

        {/* 1. LUXURY TOP BRAND BAR */}
        <div className="relative border-b border-gray-100/80 bg-white px-5 pt-4 pb-3.5 shadow-xs">
          <div className="flex items-center justify-between pr-8">
            <div className="flex flex-col">
              <AnchorFashionLogo noLink className="w-[130px] sm:w-[145px]" />
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C9A86A] animate-pulse" />
                <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-gray-500">
                  Haute Couture & Ready-to-Wear
                </span>
              </div>
            </div>
          </div>

          {/* Quick VIP Location & Support strip */}
          <div className="mt-3 flex items-center justify-between rounded-lg bg-gradient-to-r from-amber-50/70 via-[#FFF9F0] to-amber-50/40 px-3 py-1.5 text-[11px] border border-[#C9A86A]/25">
            <div className="flex items-center gap-1.5 text-gray-700 font-medium">
              <span>🇧🇩</span>
              <span className="font-semibold text-gray-900">BDT (৳)</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">Dhaka Express</span>
            </div>
            <a
              href={`tel:${contactPhone.replace(/\s+/g, "")}`}
              className="flex items-center gap-1 font-semibold text-[#8C6D32] hover:text-[#C9A86A] transition-colors"
            >
              <Phone className="h-3 w-3" />
              <span>{contactPhone}</span>
            </a>
          </div>
        </div>

        {/* 2. INSTANT SEARCH BAR WITH QUICK-TAP PILLS */}
        <div className="border-b border-gray-100 bg-white px-4 py-3">
          <form
            onSubmit={(e) => handleSearchSubmit(e)}
            className="group relative flex items-center overflow-hidden rounded-full border border-gray-200/90 bg-[#F8F9FA] px-3.5 py-2 transition-all focus-within:border-[#C9A86A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#C9A86A]/20"
          >
            <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#C9A86A] transition-colors flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search royal panjabi, shirts, blazers..."
              className="ml-2 w-full bg-transparent text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="ml-1 rounded-full bg-[#1A1A1A] px-3 py-1 text-[11px] font-semibold text-white uppercase tracking-wider hover:bg-[#C9A86A] transition-colors cursor-pointer"
            >
              Go
            </button>
          </form>

          {/* Quick-tap Trending Chips */}
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar text-[11px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex-shrink-0 mr-0.5">
              Trending:
            </span>
            {TRENDING_SEARCH_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSearchSubmit(undefined, chip)}
                className="flex-shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 shadow-2xs hover:border-[#C9A86A] hover:bg-amber-50/40 hover:text-[#8C6D32] transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* 3. SEGMENTED NAVIGATION TABS */}
        <div className="grid grid-cols-3 border-b border-gray-100 bg-[#F4F5F7]/80 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
              activeTab === "categories"
                ? "bg-white text-gray-900 shadow-xs border-b-2 border-[#C9A86A]"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <span>Categories</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("collections")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
              activeTab === "collections"
                ? "bg-white text-gray-900 shadow-xs border-b-2 border-[#C9A86A]"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#C9A86A]" />
            <span>Lookbook</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
              activeTab === "account"
                ? "bg-white text-gray-900 shadow-xs border-b-2 border-[#C9A86A]"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <span>Account</span>
            {user ? (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            ) : null}
          </button>
        </div>

        {/* 4. TAB CONTENTS (SCROLLABLE AREA) */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* TAB 1: CATEGORIES & SUBCATEGORIES */}
          {activeTab === "categories" && (
            <div className="space-y-2">
              {/* Highlight Announcement Pill */}
              <div className="mb-3 rounded-lg bg-gradient-to-r from-gray-900 via-[#1E2029] to-gray-900 p-3 text-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-[#DFBA73]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#DFBA73]">
                      Festive Collection 2026
                    </span>
                  </div>
                  <Link
                    href="/products?sort=newest"
                    onClick={closeMenu}
                    className="flex items-center gap-1 text-[11px] font-semibold text-gray-300 hover:text-white"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <p className="mt-1 text-[11px] text-gray-300 line-clamp-1">
                  {announcementBar || "Explore handcrafted royal silks, embroidery & executive wear."}
                </p>
              </div>

              {/* Dynamic or Fallback Category List */}
              <div className="divide-y divide-gray-100/90 rounded-xl border border-gray-100 bg-white shadow-2xs">
                {navLinks.map((link) => {
                  const slug = link.href.replace("/categories/", "").toLowerCase();
                  const fallbackImage =
                    CATEGORY_IMAGE_MAP[slug] ||
                    "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&q=80";
                  const badge = CATEGORY_BADGES[slug];
                  const isExpanded = expandedCategories.includes(link.label);
                  const hasSubmenu = link.megaMenu && link.megaMenu.columns.length > 0;

                  return (
                    <div key={link.label} className="transition-colors">
                      {/* Top Level Item Row */}
                      <div className="flex items-center justify-between p-3 hover:bg-gray-50/70">
                        <Link
                          href={link.href}
                          onClick={closeMenu}
                          className="flex flex-1 items-center gap-3"
                        >
                          {/* Miniature Lifestyle Thumbnail */}
                          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                            <Image
                              src={link.megaMenu?.leftCard?.src || fallbackImage}
                              alt={link.label}
                              fill
                              sizes="48px"
                              className="object-cover transition-transform duration-500 hover:scale-105"
                            />
                          </div>

                          {/* Label & Details */}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-900 hover:text-[#C9A86A] transition-colors">
                                {link.label}
                              </span>
                              {badge && (
                                <span
                                  className={cn(
                                    "rounded-full border px-1.5 py-0.2 text-[9px] uppercase tracking-wider",
                                    badge.className
                                  )}
                                >
                                  {badge.label}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 font-medium">
                              {link.megaMenu?.leftCard?.subtitle || "Explore styles & fabrics"}
                            </span>
                          </div>
                        </Link>

                        {/* Expand Trigger Button if submenu exists */}
                        {hasSubmenu ? (
                          <button
                            type="button"
                            onClick={() => toggleCategory(link.label)}
                            aria-label={`Toggle ${link.label} subcategories`}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                isExpanded && "rotate-180 text-[#C9A86A]"
                              )}
                            />
                          </button>
                        ) : (
                          <Link
                            href={link.href}
                            onClick={closeMenu}
                            className="flex h-9 w-9 items-center justify-center text-gray-300 hover:text-[#C9A86A]"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>

                      {/* Expandable Subcategory Accordion */}
                      {hasSubmenu && isExpanded && link.megaMenu && (
                        <div className="border-t border-gray-100/80 bg-gradient-to-b from-[#FAFAFA] to-white px-4 py-3.5 space-y-4">
                          {/* Direct "View All" Button for category */}
                          <Link
                            href={link.href}
                            onClick={closeMenu}
                            className="flex items-center justify-between rounded-lg bg-gray-100/80 px-3 py-2 text-xs font-bold text-gray-800 hover:bg-[#C9A86A] hover:text-white transition-all shadow-2xs"
                          >
                            <span>Browse All {link.label} Collection</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>

                          {/* Subcategory Columns */}
                          {link.megaMenu.columns.map((col, idx) => (
                            <div key={idx} className="space-y-2">
                              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#8C6D32] border-b border-amber-100/50 pb-1">
                                {col.title}
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                {col.links.map((subLink) => (
                                  <Link
                                    key={subLink.href}
                                    href={subLink.href}
                                    onClick={closeMenu}
                                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-white hover:text-[#C9A86A] hover:shadow-2xs transition-all"
                                  >
                                    <span className="h-1 w-1 rounded-full bg-gray-300" />
                                    <span className="truncate">{subLink.label}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}

                          {/* Featured Mini Card inside accordion */}
                          {link.megaMenu.leftCard && (
                            <div className="relative mt-2 overflow-hidden rounded-lg bg-gray-900 p-3 text-white">
                              <div className="relative z-10 flex items-center justify-between">
                                <div>
                                  <span className="text-[9px] uppercase tracking-widest text-[#DFBA73] font-bold">
                                    {link.megaMenu.leftCard.tag || "FEATURED EDIT"}
                                  </span>
                                  <p className="text-xs font-bold mt-0.5">
                                    {link.megaMenu.leftCard.title}
                                  </p>
                                </div>
                                <Link
                                  href={link.megaMenu.leftCard.href}
                                  onClick={closeMenu}
                                  className="rounded-full bg-[#DFBA73] px-3 py-1 text-[10px] font-bold text-black uppercase tracking-wider hover:bg-white transition-colors"
                                >
                                  {link.megaMenu.leftCard.ctaText || "Shop"}
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Essential Links Row */}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <Link
                  href="/products?sort=newest"
                  onClick={closeMenu}
                  className="flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white p-3 text-xs font-bold text-gray-800 shadow-2xs hover:border-[#C9A86A] hover:text-[#8C6D32] transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-[#C9A86A]" />
                  <span>New Arrivals</span>
                </Link>
                <Link
                  href="/products?sort=bestselling"
                  onClick={closeMenu}
                  className="flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white p-3 text-xs font-bold text-gray-800 shadow-2xs hover:border-[#C9A86A] hover:text-[#8C6D32] transition-colors"
                >
                  <Flame className="h-4 w-4 text-rose-500" />
                  <span>Best Sellers</span>
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: EDITORIAL COLLECTIONS / LOOKBOOK */}
          {activeTab === "collections" && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                Curated Fashion Edits
              </p>

              {EDITORIAL_COLLECTIONS.map((col, idx) => (
                <Link
                  key={idx}
                  href={col.href}
                  onClick={closeMenu}
                  className="group relative block overflow-hidden rounded-xl bg-gray-900 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="relative h-36 w-full">
                    <Image
                      src={col.image}
                      alt={col.title}
                      fill
                      sizes="380px"
                      className="object-cover opacity-75 transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute inset-0 p-4 flex flex-col justify-end">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#DFBA73] mb-1">
                        {col.tag}
                      </span>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#DFBA73] transition-colors">
                        {col.title}
                      </h3>
                      <p className="text-[11px] text-gray-300 line-clamp-1 mt-0.5">
                        {col.subtitle}
                      </p>
                    </div>
                    <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white group-hover:bg-[#C9A86A] transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* TAB 3: CUSTOMER ACCOUNT & SERVICES */}
          {activeTab === "account" && (
            <div className="space-y-4">
              {/* Authenticated Member Profile Card */}
              {user ? (
                <div className="rounded-xl border border-[#C9A86A]/30 bg-gradient-to-br from-gray-900 via-[#1C1F26] to-black p-4 text-white shadow-md">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-[#DFBA73] shadow-sm">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-amber-600 to-amber-800 text-sm font-bold text-white">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#DFBA73] uppercase tracking-wider">
                          {isAdmin ? "Administrator" : isManager ? "Store Manager" : "VIP Member"}
                        </span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#DFBA73]" />
                      </div>
                      <h3 className="text-sm font-bold truncate text-white">
                        {displayName}
                      </h3>
                      <p className="text-[11px] text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Staff Portal Link if Admin or Manager */}
                  {(isAdmin || isManager) && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <Link
                        href={isAdmin ? "/admin" : "/manager"}
                        onClick={closeMenu}
                        className="flex items-center justify-between rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-bold text-[#DFBA73] hover:bg-amber-500/30 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Crown className="h-3.5 w-3.5" />
                          <span>{isAdmin ? "Admin Control Panel" : "Manager Dashboard"}</span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                /* Guest Sign In / Register Privilege Card */
                <div className="rounded-xl border border-[#C9A86A]/30 bg-gradient-to-br from-[#12141C] via-[#1E2029] to-[#12141C] p-4 text-white shadow-md">
                  <div className="flex items-center gap-2 text-[#DFBA73]">
                    <Crown className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Anchor Fashion Circle
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-bold text-white">
                    Unlock VIP Member Privileges
                  </h3>
                  <p className="mt-1 text-[11px] text-gray-300">
                    Sign in to track orders, save bespoke wishlists, and receive private festival preview invites.
                  </p>
                  <div className="mt-3.5 grid grid-cols-2 gap-2">
                    <Link
                      href="/auth/login"
                      onClick={closeMenu}
                      className="flex items-center justify-center rounded-lg bg-gradient-to-r from-[#DFBA73] to-[#C9A86A] py-2 text-xs font-bold text-gray-950 uppercase tracking-wider hover:opacity-90 transition-opacity shadow-xs"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/register"
                      onClick={closeMenu}
                      className="flex items-center justify-center rounded-lg border border-[#DFBA73]/60 bg-white/5 py-2 text-xs font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors"
                    >
                      Register
                    </Link>
                  </div>
                </div>
              )}

              {/* Quick Customer Action Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/account/orders"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-xl border border-gray-200/90 bg-white p-3 text-xs font-semibold text-gray-800 shadow-2xs hover:border-[#C9A86A] transition-colors"
                >
                  <Package className="h-4 w-4 text-gray-500" />
                  <div className="flex flex-col">
                    <span>My Orders</span>
                    <span className="text-[10px] text-gray-400 font-normal">Track & History</span>
                  </div>
                </Link>

                <Link
                  href="/account/wishlist"
                  onClick={closeMenu}
                  className="flex items-center justify-between rounded-xl border border-gray-200/90 bg-white p-3 text-xs font-semibold text-gray-800 shadow-2xs hover:border-[#C9A86A] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="h-4 w-4 text-rose-500" />
                    <div className="flex flex-col">
                      <span>Wishlist</span>
                      <span className="text-[10px] text-gray-400 font-normal">Saved Styles</span>
                    </div>
                  </div>
                  {wishlistItemCount > 0 && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {wishlistItemCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/cart"
                  onClick={closeMenu}
                  className="flex items-center justify-between rounded-xl border border-gray-200/90 bg-white p-3 text-xs font-semibold text-gray-800 shadow-2xs hover:border-[#C9A86A] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-4 w-4 text-gray-600" />
                    <div className="flex flex-col">
                      <span>Bag / Cart</span>
                      <span className="text-[10px] text-gray-400 font-normal">Checkout</span>
                    </div>
                  </div>
                  {cartItemCount > 0 && (
                    <span className="rounded-full bg-black px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {cartItemCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/account/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-xl border border-gray-200/90 bg-white p-3 text-xs font-semibold text-gray-800 shadow-2xs hover:border-[#C9A86A] transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-gray-500" />
                  <div className="flex flex-col">
                    <span>Profile Info</span>
                    <span className="text-[10px] text-gray-400 font-normal">Settings</span>
                  </div>
                </Link>
              </div>

              {/* Concierge & Client Assistance Services */}
              <div className="rounded-xl border border-gray-100 bg-white p-3.5 space-y-2.5 shadow-2xs">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Concierge & Client Care
                </h4>

                <a
                  href={`https://wa.me/8801812998877?text=${encodeURIComponent(
                    "Hello Anchor Fashion Concierge, I would like bespoke assistance with clothing and styling."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg bg-emerald-50/70 p-2.5 text-xs font-semibold text-emerald-900 border border-emerald-200/60 hover:bg-emerald-100/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    <span>WhatsApp Fashion Stylist</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                </a>

                <Link
                  href="/track"
                  onClick={closeMenu}
                  className="flex items-center justify-between rounded-lg p-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Truck className="h-4 w-4 text-gray-500" />
                    <span>Live Shipment Tracker</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                </Link>

                <Link
                  href="/size-guide"
                  onClick={closeMenu}
                  className="flex items-center justify-between rounded-lg p-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Ruler className="h-4 w-4 text-gray-500" />
                    <span>Panjabi & Shirt Size Guide</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                </Link>

                <Link
                  href="/contact"
                  onClick={closeMenu}
                  className="flex items-center justify-between rounded-lg p-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>Flagship Boutique Outlets</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                </Link>
              </div>

              {/* Logout Button if signed in */}
              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100/70 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isLoggingOut ? "Signing out..." : "Sign Out of Account"}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 5. LUXURY DRAWER FOOTER & TRUST RIBBON */}
        <div className="border-t border-gray-100 bg-[#FAFAFA] p-4 text-gray-500">
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold text-gray-600">
            <div className="flex flex-col items-center gap-1">
              <Truck className="h-3.5 w-3.5 text-[#C9A86A]" />
              <span>Dhaka 24-48h</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#C9A86A]" />
              <span>100% Authentic</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Package className="h-3.5 w-3.5 text-[#C9A86A]" />
              <span>Easy Exchange</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-gray-400">
            <span>© 2026 Anchor Fashion</span>
            <div className="flex items-center gap-3 font-medium text-gray-600">
              <Link href="/privacy" onClick={closeMenu} className="hover:text-black">Privacy</Link>
              <span>•</span>
              <Link href="/terms" onClick={closeMenu} className="hover:text-black">Terms</Link>
              <span>•</span>
              <Link href="/contact" onClick={closeMenu} className="hover:text-black">Support</Link>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Backwards compatibility default export
export default PremiumMobileMenu;
export { PremiumMobileMenu as MobileMenu };
