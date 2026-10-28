"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  Phone,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnchorFashionLogo } from "@/components/shared/logo";
import { PremiumMobileMenu } from "@/components/layout/mobile-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ADMIN_ROLES, MANAGER_ROLES } from "@/lib/constants/auth";
import { useCartStore } from "@/stores/use-cart-store";
import { useWishlistStore } from "@/stores/use-wishlist-store";
import { useSessionContext } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  image_url?: string | null;
  display_order?: number;
  is_active?: boolean;
}

interface MegaMenuCard {
  tag?: string;
  title: string;
  subtitle?: string;
  src: string;
  alt: string;
  href: string;
  ctaText?: string;
}

interface MegaMenuColumn {
  title: string;
  links: { label: string; href: string }[];
}

interface NavLinkItem {
  label: string;
  href: string;
  megaMenu?: {
    leftCard?: MegaMenuCard;
    columns: MegaMenuColumn[];
    rightCards?: MegaMenuCard[];
  };
}

const CATEGORY_EDITORIAL_CONFIG: Record<
  string,
  {
    leftCard: Omit<MegaMenuCard, "href"> & { href?: string };
    rightCards: Array<Omit<MegaMenuCard, "href"> & { href?: string }>;
    curatedColumns?: MegaMenuColumn[];
  }
> = {
  panjabi: {
    leftCard: {
      tag: "FEATURED",
      title: "Festive Panjabi",
      subtitle: "Royal Silks & Dobby",
      src: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000&q=80",
      alt: "Festive Panjabi Collection",
      ctaText: "Shop Collection",
    },
    curatedColumns: [
      {
        title: "OCCASION & STYLE",
        links: [
          { label: "Festive & Eid Edit", href: "/categories/panjabi?occasion=festive" },
          { label: "Royal Wedding Special", href: "/categories/panjabi?occasion=wedding" },
          { label: "Casual Ethnic Wear", href: "/categories/panjabi?occasion=casual" },
          { label: "Handcrafted Embroidery", href: "/categories/panjabi?style=embroidered" },
          { label: "Father & Son Combo", href: "/categories/panjabi?collection=combo" },
        ],
      },
      {
        title: "FABRICS & WEAVES",
        links: [
          { label: "100% Luxury Cotton", href: "/categories/panjabi?fabric=cotton" },
          { label: "Pure Silk & Jacquard", href: "/categories/panjabi?fabric=silk" },
          { label: "Festive Linen Panjabi", href: "/categories/panjabi?fabric=linen" },
          { label: "Viscose & Modal Touch", href: "/categories/panjabi?fabric=modal" },
          { label: "Dobby & Texture Weave", href: "/categories/panjabi?fabric=dobby" },
        ],
      },
      {
        title: "DISCOVER MORE",
        links: [
          { label: "New Arrivals", href: "/categories/panjabi?sort=newest" },
          { label: "Best Sellers", href: "/categories/panjabi?sort=bestselling" },
          { label: "Matching Pajamas", href: "/categories/bottom" },
          { label: "Festive Waistcoats", href: "/categories/outerwear" },
          { label: "Panjabi Size Guide", href: "/size-guide" },
        ],
      },
    ],
    rightCards: [
      {
        tag: "SIGNATURE",
        title: "Royal Silk & Jacquard",
        src: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80",
        alt: "Royal Silk Panjabi",
        href: "/categories/premium-panjabi",
        ctaText: "Explore",
      },
      {
        tag: "HANDCRAFTED",
        title: "Premium Kabli Suits",
        src: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&q=80",
        alt: "Premium Kabli Suit",
        href: "/categories/kabli-set",
        ctaText: "View All",
      },
    ],
  },
  shirt: {
    leftCard: {
      tag: "EDITORIAL",
      title: "Executive Shirts",
      subtitle: "Sharp Tailoring & Comfort",
      src: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1000&q=80",
      alt: "Executive Shirts",
      ctaText: "Shop Shirts",
    },
    curatedColumns: [
      {
        title: "PATTERNS & STYLES",
        links: [
          { label: "Classic Solid Colors", href: "/categories/shirt?pattern=solid" },
          { label: "Business Oxford Stripes", href: "/categories/shirt?pattern=stripe" },
          { label: "Smart Windowpane Checks", href: "/categories/shirt?pattern=check" },
          { label: "Resort Cuban Collar", href: "/categories/shirt?style=cuban" },
          { label: "Micro Print Casual", href: "/categories/shirt?pattern=micro-print" },
        ],
      },
      {
        title: "FABRICS & TECH",
        links: [
          { label: "Non-Iron Wrinkle Free", href: "/categories/shirt?tech=non-iron" },
          { label: "Pure French Linen", href: "/categories/shirt?fabric=linen" },
          { label: "100% Giza Cotton", href: "/categories/shirt?fabric=cotton" },
          { label: "Stretch Performance", href: "/categories/shirt?tech=stretch" },
          { label: "Poplin & Twill Weave", href: "/categories/shirt?fabric=twill" },
        ],
      },
      {
        title: "FITS & HIGHLIGHTS",
        links: [
          { label: "Tailored Slim Fit", href: "/categories/shirt?fit=slim" },
          { label: "Classic Regular Fit", href: "/categories/shirt?fit=regular" },
          { label: "New Season Drop", href: "/categories/shirt?sort=newest" },
          { label: "Best Selling Shirts", href: "/categories/shirt?sort=bestselling" },
          { label: "Shirt Size Guide", href: "/size-guide" },
        ],
      },
    ],
    rightCards: [
      {
        tag: "NEW SEASON",
        title: "Pure French Linen",
        src: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1000&q=80",
        alt: "French Linen Shirt",
        href: "/categories/linen-shirt",
        ctaText: "Discover",
      },
      {
        tag: "WORKWEAR",
        title: "Non-Iron Business Fit",
        src: "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=1000&q=80",
        alt: "Formal Business Shirt",
        href: "/categories/formal-shirt",
        ctaText: "View All",
      },
    ],
  },
  polo: {
    leftCard: {
      tag: "BEST SELLER",
      title: "Premium Polo",
      subtitle: "Sporty Luxury Everyday",
      src: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1000&q=80",
      alt: "Premium Polo Collection",
      ctaText: "Shop Polos",
    },
    curatedColumns: [
      {
        title: "COLLARS & FITS",
        links: [
          { label: "Classic Rib Collar", href: "/categories/polo?collar=rib" },
          { label: "Mandarin & Zipper Polo", href: "/categories/polo?collar=zipper" },
          { label: "Tipped Contrast Collar", href: "/categories/polo?collar=tipped" },
          { label: "Drop Shoulder Loose Fit", href: "/categories/drop-shoulder-polo" },
          { label: "Tailored Slim Fit", href: "/categories/polo?fit=slim" },
        ],
      },
      {
        title: "FABRICS & TEXTURES",
        links: [
          { label: "Mercerized Cotton Knit", href: "/categories/polo?fabric=mercerized" },
          { label: "Honeycomb Piqué Knit", href: "/categories/polo?fabric=pique" },
          { label: "Textured Waffle Polo", href: "/categories/polo?fabric=waffle" },
          { label: "Breathable Cotton Blend", href: "/categories/polo?fabric=blend" },
        ],
      },
      {
        title: "CURATED PICKS",
        links: [
          { label: "New Arrivals", href: "/categories/polo?sort=newest" },
          { label: "Iconic Best Sellers", href: "/categories/polo?sort=bestselling" },
          { label: "Solid Color Essentials", href: "/categories/polo?pattern=solid" },
          { label: "Polo Size Guide", href: "/size-guide" },
        ],
      },
    ],
    rightCards: [
      {
        tag: "TRENDING",
        title: "Drop Shoulder Street Polo",
        src: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1000&q=80",
        alt: "Drop Shoulder Polo",
        href: "/categories/drop-shoulder-polo",
        ctaText: "Explore",
      },
      {
        tag: "LUXURY KNIT",
        title: "Mercerized Luxury Knits",
        src: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1000&q=80",
        alt: "Mercerized Polo",
        href: "/categories/premium-polo",
        ctaText: "View All",
      },
    ],
  },
  "t-shirt": {
    leftCard: {
      tag: "ESSENTIAL",
      title: "Heavyweight Tees",
      subtitle: "Pure Minimalist Comfort",
      src: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&q=80",
      alt: "T-Shirt Collection",
      ctaText: "Shop T-Shirts",
    },
    curatedColumns: [
      {
        title: "SILHOUETTES & CUTS",
        links: [
          { label: "Oversized Boxy Cut", href: "/categories/oversized-t-shirt" },
          { label: "Classic Crew Neck", href: "/categories/t-shirt?neck=crew" },
          { label: "Modern V-Neck", href: "/categories/t-shirt?neck=vneck" },
          { label: "Full Sleeve T-Shirts", href: "/categories/t-shirt?sleeve=full" },
          { label: "Pocket Tee Editions", href: "/categories/t-shirt?style=pocket" },
        ],
      },
      {
        title: "FABRICS & WEIGHTS",
        links: [
          { label: "Heavyweight 240+ GSM", href: "/categories/t-shirt?gsm=heavy" },
          { label: "100% Organic Combed Cotton", href: "/categories/t-shirt?fabric=organic" },
          { label: "Ultra-Soft Supima", href: "/categories/t-shirt?fabric=supima" },
          { label: "Summer Featherweight", href: "/categories/t-shirt?gsm=light" },
        ],
      },
      {
        title: "DISCOVER",
        links: [
          { label: "Graphic Print Drops", href: "/categories/printed-t-shirt" },
          { label: "Minimalist Solid Packs", href: "/categories/basic-t-shirt" },
          { label: "New In T-Shirts", href: "/categories/t-shirt?sort=newest" },
          { label: "Best Sellers", href: "/categories/t-shirt?sort=bestselling" },
          { label: "T-Shirt Size Guide", href: "/size-guide" },
        ],
      },
    ],
    rightCards: [
      {
        tag: "STREETWEAR",
        title: "Oversized & Graphic Drops",
        src: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1000&q=80",
        alt: "Oversized Graphic T-Shirt",
        href: "/categories/oversized-t-shirt",
        ctaText: "Explore",
      },
      {
        tag: "DAILY ESSENTIAL",
        title: "240 GSM Heavyweights",
        src: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1000&q=80",
        alt: "Heavyweight Cotton T-Shirt",
        href: "/categories/premium-t-shirt",
        ctaText: "View All",
      },
    ],
  },
  bottom: {
    leftCard: {
      tag: "TAILORED",
      title: "Denim & Trousers",
      subtitle: "Perfect Fit & Motion",
      src: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=1000&q=80",
      alt: "Bottoms Collection",
      ctaText: "Shop Bottoms",
    },
    curatedColumns: [
      {
        title: "DENIM FITS & WASHES",
        links: [
          { label: "Slim Tapered Denim", href: "/categories/denim?fit=slim" },
          { label: "Classic Straight Leg", href: "/categories/denim?fit=straight" },
          { label: "Raw Deep Indigo", href: "/categories/denim?wash=indigo" },
          { label: "Vintage Blue Wash", href: "/categories/denim?wash=vintage" },
          { label: "Stretch Motion Denim", href: "/categories/denim?tech=stretch" },
        ],
      },
      {
        title: "CHINOS & TROUSERS",
        links: [
          { label: "4-Way Stretch Chinos", href: "/categories/chino?tech=stretch" },
          { label: "Pleated Dress Trousers", href: "/categories/formal-trouser?style=pleated" },
          { label: "Easy Care Office Pants", href: "/categories/formal-trouser?tech=easycare" },
          { label: "Multi-Pocket Utility Cargo", href: "/categories/cargo" },
          { label: "Casual Cotton Drawstring", href: "/categories/casual-trouser" },
        ],
      },
      {
        title: "HIGHLIGHTS",
        links: [
          { label: "New Arrivals", href: "/categories/bottom?sort=newest" },
          { label: "Top Rated Trousers", href: "/categories/bottom?sort=bestselling" },
          { label: "Trouser Size & Fit Guide", href: "/size-guide" },
        ],
      },
    ],
    rightCards: [
      {
        tag: "DENIM LAB",
        title: "Japanese Selvedge Denim",
        src: "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=1000&q=80",
        alt: "Premium Denim Jeans",
        href: "/categories/denim",
        ctaText: "Explore",
      },
      {
        tag: "COMFORT TECH",
        title: "4-Way Stretch Chinos",
        src: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=1000&q=80",
        alt: "Stretch Chino Pants",
        href: "/categories/chino",
        ctaText: "View All",
      },
    ],
  },
  outerwear: {
    leftCard: {
      tag: "SIGNATURE",
      title: "Jackets & Blazers",
      subtitle: "Refined Layering Pieces",
      src: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1000&q=80",
      alt: "Outerwear Collection",
      ctaText: "Shop Outerwear",
    },
    curatedColumns: [
      {
        title: "MATERIALS & FABRICS",
        links: [
          { label: "Heavy Cotton Twill", href: "/categories/outerwear?material=twill" },
          { label: "Denim Trucker Jackets", href: "/categories/outerwear?material=denim" },
          { label: "Suede Touch Overshirts", href: "/categories/outerwear?material=suede" },
          { label: "Weather-Resistant Shell", href: "/categories/lightweight-jacket" },
          { label: "Raw Silk Waistcoats", href: "/categories/waistcoat" },
        ],
      },
      {
        title: "OCCASIONS",
        links: [
          { label: "Smart Casual Layering", href: "/categories/outerwear?style=smart-casual" },
          { label: "Festive Wedding Waistcoat", href: "/categories/waistcoat" },
          { label: "Weekend Windbreakers", href: "/categories/lightweight-jacket" },
          { label: "Casual Tailored Blazer", href: "/categories/casual-blazer" },
        ],
      },
      {
        title: "CURATED PICKS",
        links: [
          { label: "New In Outerwear", href: "/categories/outerwear?sort=newest" },
          { label: "Best Selling Jackets", href: "/categories/outerwear?sort=bestselling" },
          { label: "Outerwear Size Guide", href: "/size-guide" },
        ],
      },
    ],
    rightCards: [
      {
        tag: "MODERN LAYER",
        title: "Utilitarian Overshirts",
        src: "https://images.unsplash.com/photo-1544441893-675973e31985?w=1000&q=80",
        alt: "Utilitarian Overshirt",
        href: "/categories/overshirt",
        ctaText: "Explore",
      },
      {
        tag: "TRADITIONAL",
        title: "Festive Waistcoats",
        src: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1000&q=80",
        alt: "Embroidered Waistcoat",
        href: "/categories/waistcoat",
        ctaText: "View All",
      },
    ],
  },
};

function NavItem({
  link,
  setActiveMenu,
}: {
  link: NavLinkItem;
  setActiveMenu: (label: string, isHovered: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!link.megaMenu) return;
    setActiveMenu(link.label, open);
  }, [open, link.label, link.megaMenu, setActiveMenu]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div
      ref={ref}
      className="static"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={link.href}
        className={cn(
          "relative flex items-center py-4 text-[13px] font-bold uppercase tracking-[0.12em] transition-colors duration-200",
          open ? "text-[#C9A86A]" : "text-gray-700 hover:text-[#C9A86A]"
        )}
      >
        {link.label}
        {link.megaMenu && (
          <span
            className={cn(
              "absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#C9A86A] transition-all duration-300 ease-out rounded-full",
              open ? "w-full opacity-100" : "w-0 opacity-0"
            )}
          />
        )}
      </Link>

      {link.megaMenu && (
        <div
          className={cn(
            "absolute left-0 right-0 top-full w-full bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] transition-all duration-300 ease-out z-50 border-t border-gray-100",
            open
              ? "translate-y-0 opacity-100 visible pointer-events-auto"
              : "-translate-y-2 opacity-0 invisible pointer-events-none"
          )}
        >
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-8 px-6 py-8 lg:px-8">
            {/* 1. Left Lifestyle Editorial Card */}
            {link.megaMenu.leftCard && (
              <Link
                href={link.megaMenu.leftCard.href}
                onClick={() => setOpen(false)}
                className="group/left relative block w-[190px] xl:w-[210px] shrink-0 aspect-[3/4] overflow-hidden rounded-md border border-gray-200/80 bg-gray-100 shadow-sm transition-all duration-300 hover:shadow-md"
              >
                <img
                  src={link.megaMenu.leftCard.src}
                  alt={link.megaMenu.leftCard.alt}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover/left:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity group-hover/left:from-black/90" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-4">
                  {link.megaMenu.leftCard.tag && (
                    <span className="mb-1.5 inline-block rounded bg-[#C9A86A] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-black">
                      {link.megaMenu.leftCard.tag}
                    </span>
                  )}
                  <p className="text-xs font-bold uppercase tracking-wider text-white leading-tight">
                    {link.megaMenu.leftCard.title}
                  </p>
                  {link.megaMenu.leftCard.subtitle && (
                    <p className="mt-1 text-[11px] font-medium text-gray-300 line-clamp-1">
                      {link.megaMenu.leftCard.subtitle}
                    </p>
                  )}
                  <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#E6C687] group-hover/left:translate-x-1 transition-transform">
                    {link.megaMenu.leftCard.ctaText || "Shop Now"} →
                  </span>
                </div>
              </Link>
            )}

            {/* 2. Center Category Columns */}
            <div
              className={cn(
                "flex-1 grid gap-6 xl:gap-8 px-2",
                link.megaMenu.columns.length <= 2
                  ? "grid-cols-2"
                  : link.megaMenu.columns.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
              )}
            >
              {link.megaMenu.columns.map((col, idx) => (
                <div key={idx} className="flex flex-col">
                  {col.title && (
                    <h3 className="mb-3.5 pb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-gray-900 border-b border-gray-100 flex items-center justify-between">
                      <span>{col.title}</span>
                    </h3>
                  )}
                  <div className="flex flex-col gap-2.5">
                    {col.links.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className="group/link flex items-center text-[12px] font-medium uppercase tracking-wide text-gray-600 transition-all duration-200 hover:text-[#C9A86A] hover:translate-x-1"
                        onClick={() => setOpen(false)}
                      >
                        <span className="transition-colors">{subItem.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 3. Right Dual Campaign Lifestyle Cards */}
            {link.megaMenu.rightCards && link.megaMenu.rightCards.length > 0 && (
              <div className="w-[300px] xl:w-[340px] shrink-0 grid grid-cols-2 gap-3">
                {link.megaMenu.rightCards.map((card, idx) => (
                  <Link
                    key={idx}
                    href={card.href}
                    onClick={() => setOpen(false)}
                    className="group/card relative block aspect-[3/4] overflow-hidden rounded-md border border-gray-200/80 bg-gray-100 shadow-sm transition-all duration-300 hover:shadow-md"
                  >
                    <img
                      src={card.src}
                      alt={card.alt}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity group-hover/card:from-black/90" />
                    <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-3">
                      {card.tag && (
                        <span className="mb-1 inline-block text-[9px] font-bold uppercase tracking-widest text-[#E6C687]">
                          {card.tag}
                        </span>
                      )}
                      <p className="text-[11px] font-bold uppercase tracking-wide text-white leading-tight line-clamp-2">
                        {card.title}
                      </p>
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 group-hover/card:text-[#E6C687] group-hover/card:translate-x-1 transition-all">
                        {card.ctaText || "Explore"} →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function StoreHeader({
  dbCategories = [],
  contactPhone,
  contactEmail,
  announcementBar,
  user: propUser,
}: {
  dbCategories?: Category[];
  contactPhone?: string;
  contactEmail?: string;
  announcementBar?: string;
  user?: any;
}) {
  const router = useRouter();
  const { user: contextUser } = useSessionContext();
  const user = propUser || contextUser;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const isMenuHovered = hoveredMenu !== null;
  const lastScrollY = useRef(0);

  const handleMenuHover = useCallback((label: string, isHovered: boolean) => {
    setHoveredMenu((prev) => {
      if (isHovered) return label;
      if (prev === label) return null;
      return prev;
    });
  }, []);

  const { cart, fetchCart, setSheetOpen } = useCartStore();
  const { wishlist, fetchWishlist } = useWishlistStore();
  const cartItemCount =
    cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const wishlistItemCount = wishlist?.items?.length || 0;

  useEffect(() => {
    fetchCart();
    fetchWishlist();
  }, [fetchCart, fetchWishlist]);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 120) {
        setIsScrollingDown(true);
      } else {
        setIsScrollingDown(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const role =
    user?.user_metadata?.role || user?.app_metadata?.role || "CUSTOMER";
  const isAdmin = ADMIN_ROLES.includes(role);
  const isManager = MANAGER_ROLES.includes(role);

  const accountHref = !user
    ? "/auth/login"
    : isAdmin
      ? "/admin"
      : isManager
        ? "/manager"
        : "/account/profile";

  const userInitials = (
    user?.user_metadata?.full_name ||
    user?.email ||
    "U"
  )
    .slice(0, 2)
    .toUpperCase();

  // Maintain categories state with automatic fallback for pages that don't pass dbCategories
  const [categories, setCategories] = useState<Category[]>(dbCategories);

  useEffect(() => {
    if (dbCategories && dbCategories.length > 0) {
      setCategories(dbCategories);
    } else {
      fetch("/api/categories")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setCategories(data);
          }
        })
        .catch(() => {});
    }
  }, [dbCategories]);

  // Dynamically build navLinks from categories configured in Admin Dashboard
  const navLinks: NavLinkItem[] = useMemo(() => {
    // Filter root categories that are active, ordered by display_order set in Admin
    const topLevelCategories = categories
      .filter(
        (c) =>
          !c.parent_id &&
          c.is_active !== false &&
          !c.slug.toLowerCase().includes("qa") &&
          !c.name.toLowerCase().startsWith("qa")
      )
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    // Fallback if no categories are configured yet
    if (topLevelCategories.length === 0) {
      return [
        { label: "NEW ARRIVALS", href: "/products?sort=newest" },
        { label: "MEN", href: "/categories/men" },
        { label: "WOMEN", href: "/categories/women" },
        { label: "KIDS", href: "/categories/kids" },
        { label: "ACCESSORIES", href: "/categories/accessories" },
      ];
    }

    const links: NavLinkItem[] = [];

    topLevelCategories.forEach((topCat) => {
      const slugKey = topCat.slug.toLowerCase();
      const editorial = CATEGORY_EDITORIAL_CONFIG[slugKey];
      const children = categories.filter(
        (c) => c.parent_id === topCat.id && c.is_active !== false
      );

      // Build category columns
      const columns: MegaMenuColumn[] = [];

      // Check for 3rd level categories first
      let hasSubChildren = false;
      const directLeaves: Category[] = [];

      children.forEach((child) => {
        const grandChildren = categories.filter(
          (c) => c.parent_id === child.id && c.is_active !== false
        );
        if (grandChildren.length > 0) {
          hasSubChildren = true;
          columns.push({
            title: child.name.toUpperCase(),
            links: [
              { label: `All ${child.name}`, href: `/categories/${child.slug}` },
              ...grandChildren.map((gc) => ({
                label: gc.name,
                href: `/categories/${gc.slug}`,
              })),
            ],
          });
        } else {
          directLeaves.push(child);
        }
      });

      if (hasSubChildren && directLeaves.length > 0) {
        columns.unshift({
          title: `ALL ${topCat.name.toUpperCase()}`,
          links: directLeaves.map((c) => ({
            label: c.name,
            href: `/categories/${c.slug}`,
          })),
        });
      } else if (!hasSubChildren && children.length > 0) {
        // Main categories with child types
        columns.push({
          title: `ALL ${topCat.name.toUpperCase()}`,
          links: [
            { label: `View All ${topCat.name}`, href: `/categories/${topCat.slug}` },
            ...children.map((c) => ({
              label: c.name,
              href: `/categories/${c.slug}`,
            })),
          ],
        });
      } else if (children.length === 0) {
        columns.push({
          title: `EXPLORE ${topCat.name.toUpperCase()}`,
          links: [
            { label: `All ${topCat.name}`, href: `/categories/${topCat.slug}` },
            { label: "New In", href: `/categories/${topCat.slug}?sort=newest` },
            { label: "Best Sellers", href: `/categories/${topCat.slug}?sort=bestselling` },
          ],
        });
      }

      // Add curated editorial columns (Occasions, Fabrics, Styling, etc.)
      if (editorial?.curatedColumns) {
        editorial.curatedColumns.forEach((cCol) => {
          columns.push(cCol);
        });
      }

      // Construct left and right lifestyle cards
      const leftCard: MegaMenuCard = {
        tag: editorial?.leftCard?.tag || "FEATURED",
        title: editorial?.leftCard?.title || topCat.name,
        subtitle: editorial?.leftCard?.subtitle || "Premium Collection",
        src:
          editorial?.leftCard?.src ||
          topCat.image_url ||
          "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1000&q=80",
        alt: editorial?.leftCard?.alt || topCat.name,
        href: editorial?.leftCard?.href || `/categories/${topCat.slug}`,
        ctaText: editorial?.leftCard?.ctaText || "Shop Collection",
      };

      const rightCards: MegaMenuCard[] = editorial?.rightCards
        ? editorial.rightCards.map((rc) => ({
            tag: rc.tag,
            title: rc.title,
            src: rc.src,
            alt: rc.alt,
            href: rc.href || `/categories/${topCat.slug}`,
            ctaText: rc.ctaText,
          }))
        : [
            {
              tag: "TRENDING",
              title: `New Season ${topCat.name}`,
              src:
                topCat.image_url ||
                "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1000&q=80",
              alt: topCat.name,
              href: `/categories/${topCat.slug}?sort=newest`,
              ctaText: "Explore",
            },
            {
              tag: "LOOKBOOK",
              title: `Signature ${topCat.name}`,
              src:
                topCat.image_url ||
                "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1000&q=80",
              alt: topCat.name,
              href: `/categories/${topCat.slug}?sort=bestselling`,
              ctaText: "View All",
            },
          ];

      links.push({
        label: topCat.name.toUpperCase(),
        href: `/categories/${topCat.slug}`,
        megaMenu: {
          leftCard,
          columns,
          rightCards,
        },
      });
    });

    return links;
  }, [categories]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      let url = `/search?q=${encodeURIComponent(query)}`;
      if (searchCategory && searchCategory !== "all")
        url += `&category=${searchCategory}`;
      router.push(url);
    }
  };

  return (
    <>
      {/* Announcement Bar */}
      <div className="w-full bg-[#1e2029] px-3 py-2 text-center text-[10px] sm:text-xs font-semibold tracking-widest text-white sm:py-2.5 uppercase">
        <div className="mx-auto max-w-7xl truncate">
          {announcementBar ?? "Step Into The Festive Season With Anchor Fashion"}
        </div>
      </div>

      {/* Sticky Main Header */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full bg-white transition-all duration-300",
          isScrollingDown ? "-translate-y-full" : "translate-y-0",
          isMenuHovered ? "border-b-transparent shadow-none" : "border-b border-gray-100 shadow-sm"
        )}
      >
        {/* Top Row: Logo, Search, Action Icons */}
        <div className="mx-auto flex h-[88px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            {mounted ? (
              <PremiumMobileMenu
                open={mobileMenuOpen}
                onOpenChange={setMobileMenuOpen}
                categories={categories}
                navLinks={navLinks}
                user={user}
                cartItemCount={cartItemCount}
                wishlistItemCount={wishlistItemCount}
                contactPhone={contactPhone}
                announcementBar={announcementBar}
                triggerButton={
                  <button
                    type="button"
                    aria-label="Open navigation menu"
                    className="inline-flex items-center justify-center rounded-lg p-2 text-gray-800 transition-colors hover:bg-gray-100 hover:text-black focus:outline-none cursor-pointer"
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                }
              />
            ) : (
              <div className="inline-flex items-center justify-center p-2 text-gray-700">
                <Menu className="h-6 w-6" />
              </div>
            )}
          </div>

          {/* Logo */}
          <div className="flex items-center justify-center lg:justify-start">
            <AnchorFashionLogo className="w-[120px] sm:w-[150px] lg:w-[170px]" />
          </div>

          {/* Search Bar - Desktop Only */}
          <div className="hidden lg:flex flex-1 items-center justify-center px-8 xl:px-12">
            <form
              onSubmit={handleSearchSubmit}
              className="flex w-full max-w-2xl items-center rounded-full bg-[#f8f9fa] border border-gray-200 px-5 py-2.5 transition-all focus-within:ring-1 focus-within:ring-gray-300 focus-within:border-gray-300 shadow-sm hover:shadow-md"
            >
              <input
                type="text"
                placeholder="Search"
                aria-label="Search catalog"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
              <div className="mx-3 h-5 w-px bg-gray-200" />
              <Select
                value={searchCategory || "all"}
                onValueChange={(val) => setSearchCategory(val === "all" ? "" : (val || ""))}
                items={[
                  { value: "all", label: "All Categories" },
                  ...categories
                    .filter(
                      (c) =>
                        !c.parent_id &&
                        c.is_active !== false &&
                        !c.slug.toLowerCase().includes("qa") &&
                        !c.name.toLowerCase().startsWith("qa")
                    )
                    .map((c) => ({ value: c.slug, label: c.name })),
                ]}
              >
                <SelectTrigger className="w-[140px] border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 text-sm font-medium text-gray-600 hover:text-gray-900 p-0 h-auto justify-between gap-1">
                  <SelectValue placeholder="Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-gray-100">
                  <SelectItem value="all" className="cursor-pointer font-medium text-gray-600 focus:bg-gray-50 focus:text-gray-900">
                    All Categories
                  </SelectItem>
                  {categories
                    .filter(
                      (c) =>
                        !c.parent_id &&
                        c.is_active !== false &&
                        !c.slug.toLowerCase().includes("qa") &&
                        !c.name.toLowerCase().startsWith("qa")
                    )
                    .map((c) => (
                      <SelectItem key={c.id} value={c.slug} className="cursor-pointer text-gray-600 focus:bg-gray-50 focus:text-gray-900">
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <button type="submit" aria-label="Submit search" className="ml-2 pl-2 cursor-pointer">
                <Search className="h-5 w-5 text-gray-500 hover:text-gray-900 transition-colors" />
              </button>
            </form>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            {/* Call Us - Desktop Only */}
            {contactPhone && (
              <div className="hidden xl:flex items-center gap-3 group cursor-pointer">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#f8f9fa] group-hover:bg-gray-200 transition-colors">
                  <Phone className="h-4 w-4 text-gray-700" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest leading-none mb-1">
                    Call Us Now
                  </span>
                  <span className="text-sm font-bold text-gray-900 leading-none tracking-wide">
                    {contactPhone}
                  </span>
                </div>
              </div>
            )}

            {/* Account */}
            <Link
              href={accountHref}
              aria-label={user ? "My Account" : "Sign In"}
              className="hidden sm:block text-gray-700 hover:text-[#C9A86A] transition-colors"
            >
              {user ? (
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gray-900 text-[10px] font-bold text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User className="h-[22px] w-[22px]" strokeWidth={1.5} />
              )}
            </Link>

            {/* Wishlist */}
            <Link
              href="/account/wishlist"
              aria-label="Wishlist"
              className="relative text-gray-700 hover:text-[#C9A86A] transition-colors flex items-center gap-1.5"
            >
              <Heart className="h-[22px] w-[22px]" strokeWidth={1.5} />
              <span className="text-sm font-semibold hidden sm:inline-block tracking-wide">
                {mounted ? wishlistItemCount : 0}
              </span>
            </Link>

            {/* Cart */}
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Shopping Cart"
              className="relative text-gray-700 hover:text-[#C9A86A] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="h-[22px] w-[22px]" strokeWidth={1.5} />
              <span className="text-sm font-semibold hidden sm:inline-block tracking-wide">
                {mounted ? cartItemCount : 0}
              </span>
              {mounted && cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 sm:hidden flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-black px-1 text-[9px] font-bold text-white">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Row: Desktop Navigation (Sailor Clothing Mega Menu Style) */}
        <div className="hidden lg:block border-t border-gray-100 relative">
          <nav className="mx-auto flex max-w-7xl items-center justify-center gap-8 xl:gap-10">
            {navLinks.map((link) => (
              <NavItem
                key={link.label}
                link={link}
                setActiveMenu={handleMenuHover}
              />
            ))}
          </nav>
        </div>
      </header>

      {/* Dimmed Page Backdrop when Mega Menu is Open */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 bg-black/25 backdrop-blur-[1.5px] z-30 transition-opacity duration-300 pointer-events-none",
          isMenuHovered ? "opacity-100" : "opacity-0"
        )}
      />
    </>
  );
}
