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
  Layers,
  Compass,
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

// Curated high-fashion imagery for categories
const CATEGORY_IMAGE_MAP: Record<string, string> = {
  panjabi: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=85",
  "kabli-set": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=85",
  shirt: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=85",
  shirts: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=85",
  polo: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=600&q=85",
  "t-shirt": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=85",
  bottom: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=85",
  trousers: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=85",
  denim: "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=600&q=85",
  outerwear: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=85",
  blazer: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=85",
  accessories: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&q=85",
  men: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=85",
  women: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=85",
  kids: "https://images.unsplash.com/photo-1503944545259-babc49265b6e?w=600&q=85",
};

// Curated badge highlights for categories
const CATEGORY_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  panjabi: {
    label: "SIGNATURE",
    bg: "bg-amber-400/20 border-amber-400/40",
    text: "text-amber-300",
  },
  "kabli-set": {
    label: "ROYAL FIT",
    bg: "bg-amber-400/20 border-amber-400/40",
    text: "text-amber-300",
  },
  polo: {
    label: "BEST SELLER",
    bg: "bg-sky-400/20 border-sky-400/40",
    text: "text-sky-300",
  },
  shirt: {
    label: "LUXURY COTTON",
    bg: "bg-emerald-400/20 border-emerald-400/40",
    text: "text-emerald-300",
  },
  outerwear: {
    label: "HAUTE COUTURE",
    bg: "bg-purple-400/20 border-purple-400/40",
    text: "text-purple-300",
  },
  denim: {
    label: "JAPANESE SELVEDGE",
    bg: "bg-indigo-400/20 border-indigo-400/40",
    text: "text-indigo-300",
  },
  accessories: {
    label: "HANDCRAFTED",
    bg: "bg-rose-400/20 border-rose-400/40",
    text: "text-rose-300",
  },
};

// Trending search chips
const TRENDING_SEARCH_CHIPS = [
  "Silk Panjabi",
  "Piqué Polo",
  "Mandarin Shirt",
  "Drop Shoulder",
  "Slim Chinos",
  "Wedding Kabli",
  "Italian Blazer",
];

// Curated editorial lookbook stories
const EDITORIAL_COLLECTIONS = [
  {
    tag: "FESTIVE EDIT 2026",
    title: "The Royal Heritage Panjabi",
    subtitle: "Pure dupion silk, hand-embroidered collars and heirloom silhouettes.",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80",
    href: "/categories/panjabi?collection=heritage",
    accent: "from-amber-900/80 to-black/90",
  },
  {
    tag: "EXECUTIVE LUXURY",
    title: "The Sartorial Suiting & Blazers",
    subtitle: "Precision Italian cut wools tailored for high-stakes distinction.",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80",
    href: "/categories/outerwear?type=blazer",
    accent: "from-slate-900/80 to-black/90",
  },
  {
    tag: "LEISURE LUXE",
    title: "Mercerized Knitwear & Polos",
    subtitle: "Silk-feel premium Egyptian cotton engineered for Dhaka warmth.",
    image: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&q=80",
    href: "/categories/polo?fabric=mercerized",
    accent: "from-blue-950/80 to-black/90",
  },
  {
    tag: "CEREMONIAL",
    title: "Imperial Kabli Collection",
    subtitle: "Modern regal cuts with tonal threadwork and signature buttons.",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
    href: "/categories/kabli-set",
    accent: "from-emerald-950/80 to-black/90",
  },
];

export function PremiumMobileMenu({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  categories = [],
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
    "Patron"
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
        className="flex h-full w-[94vw] max-w-[420px] flex-col bg-[#0B0D13] text-slate-100 p-0 shadow-[0_0_50px_rgba(0,0,0,0.8)] border-r border-[#C9A86A]/25 sm:max-w-md focus:outline-none"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Anchor Fashion Bespoke Menu</SheetTitle>
          <SheetDescription>Explore haute couture collections, categories, and account privileges.</SheetDescription>
        </SheetHeader>

        {/* 1. HAUTE COUTURE GOLD-CAPPED HEADER */}
        <div className="relative border-b border-[#C9A86A]/20 bg-gradient-to-b from-[#141722] via-[#0E1018] to-[#0A0C12] px-5 pt-5 pb-4">
          {/* Subtle Golden Glow Gradient Arc */}
          <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-24 w-64 rounded-full bg-[#DFBA73]/15 blur-2xl" />

          <div className="relative flex items-center justify-between pr-8">
            <div className="flex flex-col">
              <AnchorFashionLogo noLink className="w-[135px] sm:w-[150px] filter brightness-125" />
              <div className="flex items-center gap-2 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#DFBA73] animate-pulse shadow-[0_0_8px_#DFBA73]" />
                <span className="text-[9.5px] uppercase tracking-[0.25em] font-semibold text-[#DFBA73]/90">
                  Haute Couture & Heritage
                </span>
              </div>
            </div>
          </div>

          {/* Luxury Concierge Bar */}
          <div className="mt-3.5 flex items-center justify-between rounded-xl bg-white/[0.04] backdrop-blur-md px-3.5 py-2 text-[11px] border border-[#DFBA73]/25 shadow-inner">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <span className="text-sm">🇧🇩</span>
              <span className="font-bold text-white tracking-wider">BDT (৳)</span>
              <span className="text-white/20">|</span>
              <span className="text-slate-400">Express Delivery</span>
            </div>
            <a
              href={`tel:${contactPhone.replace(/\s+/g, "")}`}
              className="flex items-center gap-1.5 font-bold text-[#DFBA73] hover:text-white transition-colors"
            >
              <Phone className="h-3 w-3" />
              <span className="tracking-wide">{contactPhone}</span>
            </a>
          </div>
        </div>

        {/* 2. SEARCH BAR WITH LUXURY OBSIDIAN FINISH */}
        <div className="border-b border-white/5 bg-[#0e1018]/90 px-4 py-3">
          <form
            onSubmit={(e) => handleSearchSubmit(e)}
            className="group relative flex items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-md px-3.5 py-2 transition-all focus-within:border-[#DFBA73] focus-within:bg-white/[0.08] focus-within:ring-2 focus-within:ring-[#DFBA73]/20"
          >
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-[#DFBA73] transition-colors flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search panjabi, shirts, silk, blazers..."
              className="ml-2.5 w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="ml-1 rounded-full bg-gradient-to-r from-[#DFBA73] to-[#C9A86A] px-3.5 py-1 text-[10.5px] font-bold text-black uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              Go
            </button>
          </form>

          {/* Quick-tap Trending Chips */}
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar text-[11px]">
            <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#DFBA73]/80 flex-shrink-0 mr-0.5 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Hot:
            </span>
            {TRENDING_SEARCH_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSearchSubmit(undefined, chip)}
                className="flex-shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-medium text-slate-300 hover:border-[#DFBA73] hover:bg-[#DFBA73]/15 hover:text-[#DFBA73] transition-all cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* 3. SEGMENTED NAVIGATION TABS */}
        <div className="p-2 border-b border-white/5 bg-[#0A0C12]">
          <div className="grid grid-cols-3 rounded-xl bg-white/[0.04] p-1 border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab("categories")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                activeTab === "categories"
                  ? "bg-gradient-to-r from-[#DFBA73] to-[#C9A86A] text-black shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Catalog</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("collections")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                activeTab === "collections"
                  ? "bg-gradient-to-r from-[#DFBA73] to-[#C9A86A] text-black shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Lookbook</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer relative",
                activeTab === "account"
                  ? "bg-gradient-to-r from-[#DFBA73] to-[#C9A86A] text-black shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Account</span>
              {user ? (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              ) : null}
            </button>
          </div>
        </div>

        {/* 4. TAB CONTENTS (SCROLLABLE AREA) */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 overscroll-contain">
          {/* TAB 1: CATEGORIES & HIGH FASHION TILES */}
          {activeTab === "categories" && (
            <div className="space-y-3">
              {/* Highlight Announcement Banner */}
              <div className="relative overflow-hidden rounded-2xl border border-[#DFBA73]/30 bg-gradient-to-r from-[#1E170A] via-[#2A2012] to-[#141722] p-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-[#DFBA73] animate-bounce" />
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#DFBA73]">
                      Festive Collection 2026
                    </span>
                  </div>
                  <Link
                    href="/products?sort=newest"
                    onClick={closeMenu}
                    className="flex items-center gap-1 text-[10.5px] font-bold text-amber-200 hover:text-white"
                  >
                    <span>All Products</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <p className="mt-1 text-[11px] text-amber-100/80 line-clamp-1">
                  {announcementBar || "Handcrafted heritage silks, tailored blazers & luxury polos."}
                </p>
              </div>

              {/* Category Cards List */}
              <div className="space-y-2">
                {navLinks.map((link) => {
                  const slug = link.href.replace("/categories/", "").toLowerCase();
                  const fallbackImage =
                    CATEGORY_IMAGE_MAP[slug] ||
                    "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&q=80";
                  const badge = CATEGORY_BADGES[slug];
                  const isExpanded = expandedCategories.includes(link.label);
                  const hasSubmenu = link.megaMenu && link.megaMenu.columns.length > 0;

                  return (
                    <div
                      key={link.label}
                      className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] transition-all hover:border-[#DFBA73]/30 hover:bg-white/[0.05]"
                    >
                      {/* Top Level Item Row */}
                      <div className="flex items-center justify-between p-2.5">
                        <Link
                          href={link.href}
                          onClick={closeMenu}
                          className="flex flex-1 items-center gap-3 group"
                        >
                          {/* Miniature High-Fashion Thumbnail */}
                          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-md">
                            <Image
                              src={link.megaMenu?.leftCard?.src || fallbackImage}
                              alt={link.label}
                              fill
                              sizes="48px"
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          </div>

                          {/* Label & Details */}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white group-hover:text-[#DFBA73] transition-colors">
                                {link.label}
                              </span>
                              {badge && (
                                <span
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-widest",
                                    badge.bg,
                                    badge.text
                                  )}
                                >
                                  {badge.label}
                                </span>
                              )}
                            </div>
                            <span className="text-[10.5px] text-slate-400 font-medium">
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
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform duration-300",
                                isExpanded && "rotate-180 text-[#DFBA73]"
                              )}
                            />
                          </button>
                        ) : (
                          <Link
                            href={link.href}
                            onClick={closeMenu}
                            className="flex h-9 w-9 items-center justify-center text-slate-500 hover:text-[#DFBA73]"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>

                      {/* Expandable Subcategory Accordion */}
                      {hasSubmenu && isExpanded && link.megaMenu && (
                        <div className="border-t border-white/5 bg-black/40 px-3.5 py-3 space-y-3.5">
                          {/* Direct "Browse All" Button */}
                          <Link
                            href={link.href}
                            onClick={closeMenu}
                            className="flex items-center justify-between rounded-lg bg-gradient-to-r from-[#DFBA73]/20 via-[#DFBA73]/10 to-transparent border border-[#DFBA73]/30 px-3 py-2 text-xs font-bold text-[#DFBA73] hover:bg-[#DFBA73] hover:text-black transition-all shadow-sm"
                          >
                            <span>Browse All {link.label} Collection</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>

                          {/* Subcategory Columns */}
                          {link.megaMenu.columns.map((col, idx) => (
                            <div key={idx} className="space-y-1.5">
                              <h4 className="text-[9.5px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1">
                                {col.title}
                              </h4>
                              <div className="grid grid-cols-2 gap-1.5">
                                {col.links.map((subLink) => (
                                  <Link
                                    key={subLink.href}
                                    href={subLink.href}
                                    onClick={closeMenu}
                                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-[#DFBA73] transition-colors"
                                  >
                                    <span className="h-1 w-1 rounded-full bg-[#DFBA73]" />
                                    <span className="truncate">{subLink.label}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}

                          {/* Editorial Lifestyle Highlight Card */}
                          {link.megaMenu.leftCard && (
                            <div className="relative mt-2 overflow-hidden rounded-xl border border-white/10 bg-slate-900 p-3 text-white">
                              <div className="relative z-10 flex items-center justify-between">
                                <div>
                                  <span className="text-[8.5px] uppercase tracking-widest text-[#DFBA73] font-extrabold">
                                    {link.megaMenu.leftCard.tag || "FEATURED EDIT"}
                                  </span>
                                  <p className="text-xs font-bold mt-0.5 text-white">
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

              {/* Quick High-Impact Curated Links */}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <Link
                  href="/products?sort=newest"
                  onClick={closeMenu}
                  className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs font-bold text-white hover:border-[#DFBA73]/40 hover:bg-white/[0.06] transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-[#DFBA73]" />
                  <span>New Arrivals</span>
                </Link>
                <Link
                  href="/products?sort=bestselling"
                  onClick={closeMenu}
                  className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs font-bold text-white hover:border-rose-500/40 hover:bg-white/[0.06] transition-colors"
                >
                  <Flame className="h-4 w-4 text-rose-400" />
                  <span>Best Sellers</span>
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: EDITORIAL COLLECTIONS / LOOKBOOK */}
          {activeTab === "collections" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#DFBA73]">
                  Anchor Editorial Stories
                </span>
                <span className="text-[10px] text-slate-400">Curated Haute Couture</span>
              </div>

              {EDITORIAL_COLLECTIONS.map((col, idx) => (
                <Link
                  key={idx}
                  href={col.href}
                  onClick={closeMenu}
                  className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-xl transition-all hover:border-[#DFBA73]/50 hover:shadow-2xl"
                >
                  <div className="relative h-40 w-full">
                    <Image
                      src={col.image}
                      alt={col.title}
                      fill
                      sizes="400px"
                      className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="absolute inset-0 p-4 flex flex-col justify-end">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#DFBA73] mb-1">
                        {col.tag}
                      </span>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#DFBA73] transition-colors">
                        {col.title}
                      </h3>
                      <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                        {col.subtitle}
                      </p>
                    </div>
                    <div className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white group-hover:bg-[#DFBA73] group-hover:text-black transition-colors">
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
                <div className="relative overflow-hidden rounded-2xl border border-[#DFBA73]/40 bg-gradient-to-br from-[#1C1F2B] via-[#141722] to-[#0D0F16] p-4 text-white shadow-xl">
                  {/* Subtle Gold Shimmer Accent */}
                  <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[#DFBA73]/10 blur-xl" />

                  <div className="flex items-center gap-3.5">
                    <Avatar className="h-12 w-12 border-2 border-[#DFBA73] shadow-md">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-[#DFBA73] to-amber-700 text-sm font-black text-black">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold text-[#DFBA73] uppercase tracking-wider">
                          {isAdmin ? "Super Administrator" : isManager ? "Store Manager" : "VIP Circle Member"}
                        </span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#DFBA73]" />
                      </div>
                      <h3 className="text-sm font-bold truncate text-white">
                        {displayName}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Staff Portal Shortcut */}
                  {(isAdmin || isManager) && (
                    <div className="mt-3.5 pt-3 border-t border-white/10">
                      <Link
                        href={isAdmin ? "/admin" : "/manager"}
                        onClick={closeMenu}
                        className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#DFBA73]/20 to-amber-500/10 border border-[#DFBA73]/30 px-3.5 py-2.5 text-xs font-bold text-[#DFBA73] hover:bg-[#DFBA73] hover:text-black transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Crown className="h-4 w-4" />
                          <span>{isAdmin ? "Admin Executive Portal" : "Manager Command Center"}</span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                /* Guest Sign In / Register Card */
                <div className="relative overflow-hidden rounded-2xl border border-[#DFBA73]/30 bg-gradient-to-br from-[#1A1610] via-[#171A24] to-[#0D0F16] p-4 text-white shadow-xl">
                  <div className="flex items-center gap-2 text-[#DFBA73]">
                    <Crown className="h-4 w-4" />
                    <span className="text-[11px] font-extrabold uppercase tracking-widest">
                      Anchor Fashion Circle
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-bold text-white">
                    Unlock Bespoke VIP Privileges
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">
                    Sign in to track orders, save curated wishlists, and receive private festive invitations.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <Link
                      href="/auth/login"
                      onClick={closeMenu}
                      className="flex items-center justify-center rounded-xl bg-gradient-to-r from-[#DFBA73] to-[#C9A86A] py-2.5 text-xs font-extrabold text-black uppercase tracking-wider hover:opacity-95 transition-opacity shadow-md"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/register"
                      onClick={closeMenu}
                      className="flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.05] py-2.5 text-xs font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors"
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
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs font-semibold text-white hover:border-[#DFBA73]/40 hover:bg-white/[0.06] transition-colors"
                >
                  <Package className="h-4 w-4 text-[#DFBA73]" />
                  <div className="flex flex-col">
                    <span>My Orders</span>
                    <span className="text-[10px] text-slate-400 font-normal">Track & History</span>
                  </div>
                </Link>

                <Link
                  href="/account/wishlist"
                  onClick={closeMenu}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs font-semibold text-white hover:border-rose-500/40 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="h-4 w-4 text-rose-400" />
                    <div className="flex flex-col">
                      <span>Wishlist</span>
                      <span className="text-[10px] text-slate-400 font-normal">Saved Styles</span>
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
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs font-semibold text-white hover:border-[#DFBA73]/40 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-4 w-4 text-[#DFBA73]" />
                    <div className="flex flex-col">
                      <span>Bag / Cart</span>
                      <span className="text-[10px] text-slate-400 font-normal">Checkout</span>
                    </div>
                  </div>
                  {cartItemCount > 0 && (
                    <span className="rounded-full bg-[#DFBA73] text-black px-1.5 py-0.5 text-[10px] font-extrabold">
                      {cartItemCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/account/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs font-semibold text-white hover:border-[#DFBA73]/40 hover:bg-white/[0.06] transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-[#DFBA73]" />
                  <div className="flex flex-col">
                    <span>Profile Info</span>
                    <span className="text-[10px] text-slate-400 font-normal">Account & Address</span>
                  </div>
                </Link>
              </div>

              {/* Concierge & Client Assistance Services */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 space-y-2.5">
                <h4 className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#DFBA73]">
                  Concierge & Client Care
                </h4>

                <a
                  href={`https://wa.me/8801812998877?text=${encodeURIComponent(
                    "Hello Anchor Fashion Concierge, I would like bespoke assistance with clothing and styling."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    <span>WhatsApp VIP Stylist</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
                </a>

                <Link
                  href="/track"
                  onClick={closeMenu}
                  className="flex items-center justify-between rounded-xl p-2 text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Truck className="h-4 w-4 text-slate-400" />
                    <span>Live Shipment Tracker</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                </Link>

                <Link
                  href="/size-guide"
                  onClick={closeMenu}
                  className="flex items-center justify-between rounded-xl p-2 text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Ruler className="h-4 w-4 text-slate-400" />
                    <span>Panjabi & Shirt Size Guide</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                </Link>

                <Link
                  href="/contact"
                  onClick={closeMenu}
                  className="flex items-center justify-between rounded-xl p-2 text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>Flagship Boutique Outlets</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                </Link>
              </div>

              {/* Logout Button if signed in */}
              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isLoggingOut ? "Signing out..." : "Sign Out of Account"}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 5. LUXURY DRAWER FOOTER & TRUST RIBBON */}
        <div className="border-t border-white/5 bg-[#08090E] p-4 text-slate-400">
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold text-slate-300">
            <div className="flex flex-col items-center gap-1">
              <Truck className="h-3.5 w-3.5 text-[#DFBA73]" />
              <span>Dhaka 24-48h</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#DFBA73]" />
              <span>100% Authentic</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Package className="h-3.5 w-3.5 text-[#DFBA73]" />
              <span>Easy Exchange</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
            <span>© 2026 Anchor Fashion</span>
            <div className="flex items-center gap-3 font-medium text-slate-400">
              <Link href="/privacy" onClick={closeMenu} className="hover:text-[#DFBA73]">Privacy</Link>
              <span>•</span>
              <Link href="/terms" onClick={closeMenu} className="hover:text-[#DFBA73]">Terms</Link>
              <span>•</span>
              <Link href="/contact" onClick={closeMenu} className="hover:text-[#DFBA73]">Support</Link>
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
