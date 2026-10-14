"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  ChevronDown,
  ChevronRight,
  X,
  Phone,
  Mail,
  LogIn,
  LayoutDashboard,
  ShieldCheck,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ADMIN_ROLES, MANAGER_ROLES } from "@/lib/constants/auth";
import { useCartStore } from "@/stores/use-cart-store";
import { useWishlistStore } from "@/stores/use-wishlist-store";
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

interface MegaMenuColumn {
  title: string;
  links: { label: string; href: string }[];
}

interface NavLinkItem {
  label: string;
  href: string;
  megaMenu?: {
    columns: MegaMenuColumn[];
    featuredImages?: { src: string; alt: string; href: string }[];
  };
}

function NavItem({ link, setActiveMenu }: { link: NavLinkItem, setActiveMenu: (label: string, isHovered: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!link.megaMenu) return;
    setActiveMenu(link.label, open);
  }, [open, link.label, link.megaMenu, setActiveMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasSub = Boolean(link.megaMenu && link.megaMenu.columns.length > 0);
  const isSingleCol = Boolean(
    link.megaMenu &&
      link.megaMenu.columns.length === 1 &&
      !link.megaMenu.featuredImages
  );
  const isMultiCol = Boolean(
    link.megaMenu &&
      link.megaMenu.columns.length > 1 &&
      link.megaMenu.columns.length <= 3 &&
      !link.megaMenu.featuredImages
  );

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={link.href}
        className={cn(
          "relative group flex items-center gap-1 py-3.5 text-[12px] lg:text-[12.5px] xl:text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200",
          open ? "text-[#1a1a1a]" : "text-[#1a1a1a]/85 hover:text-[#C9A86A]"
        )}
      >
        <span>{link.label}</span>
        {hasSub && (
          <ChevronDown
            className={cn(
              "h-3 w-3 text-gray-400 transition-transform duration-200",
              open && "rotate-180 text-black"
            )}
          />
        )}
        <span
          className={cn(
            "absolute bottom-0 left-0 h-[2px] transition-all duration-300 ease-out bg-[#1A1A1A]",
            open ? "w-full" : "w-0 group-hover:w-full"
          )}
        />
      </Link>

      {hasSub && link.megaMenu && (
        <div
          className={cn(
            "absolute top-full pt-1.5 transition-all duration-200 z-50",
            isSingleCol
              ? "left-0"
              : "left-1/2 -translate-x-1/2",
            open
              ? "translate-y-0 opacity-100 visible pointer-events-auto"
              : "-translate-y-1 opacity-0 invisible pointer-events-none"
          )}
        >
          {isSingleCol ? (
            /* Clean, elegant vertical dropdown list anchored directly beneath the parent category */
            <div className="min-w-[210px] w-max max-w-xs rounded-b-lg bg-white p-2 shadow-xl border border-gray-100">
              <div className="flex flex-col py-1">
                {link.megaMenu.columns[0].links.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className="flex items-center justify-between px-3.5 py-2 text-[12.5px] font-medium text-gray-700 hover:text-[#C9A86A] hover:bg-gray-50 rounded-md transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    <span>{subItem.label}</span>
                    <ChevronRight className="h-3 w-3 text-gray-300" />
                  </Link>
                ))}
              </div>
            </div>
          ) : isMultiCol ? (
            /* Compact multi-column dropdown */
            <div className="w-max min-w-[340px] max-w-2xl rounded-b-lg bg-white p-4 shadow-xl border border-gray-100">
              <div className="flex gap-6">
                {link.megaMenu.columns.map((col, idx) => (
                  <div key={idx} className="flex flex-col min-w-[140px]">
                    {col.title && (
                      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-1">
                        {col.title}
                      </h4>
                    )}
                    <div className="flex flex-col gap-1">
                      {col.links.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className="px-2.5 py-1.5 text-[12.5px] font-medium text-gray-700 hover:text-[#C9A86A] hover:bg-gray-50 rounded-md transition-colors"
                          onClick={() => setOpen(false)}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Rich mega-menu with featured images or 4+ columns */
            <div className="w-[720px] max-w-[90vw] rounded-b-xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="grid grid-cols-12 gap-6">
                <div
                  className={cn(
                    "gap-6 grid",
                    link.megaMenu.featuredImages ? "col-span-8 grid-cols-3" : "col-span-12 grid-cols-4"
                  )}
                >
                  {link.megaMenu.columns.map((col, idx) => (
                    <div key={idx} className="flex flex-col">
                      {col.title && (
                        <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-1">
                          {col.title}
                        </h4>
                      )}
                      <div className="flex flex-col gap-1.5">
                        {col.links.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className="px-2 py-1 text-[12.5px] font-medium text-gray-600 hover:text-[#C9A86A] hover:bg-gray-50 rounded transition-colors"
                            onClick={() => setOpen(false)}
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {link.megaMenu.featuredImages && (
                  <div className="col-span-4 flex gap-3">
                    {link.megaMenu.featuredImages.map((img, idx) => (
                      <Link
                        key={idx}
                        href={img.href}
                        onClick={() => setOpen(false)}
                        className="group/img relative block flex-1 aspect-[4/5] overflow-hidden rounded-md bg-gray-100 shadow-xs"
                      >
                        <img
                          src={img.src}
                          alt={img.alt}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover/img:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/10 transition-opacity group-hover/img:bg-transparent" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
  user,
}: {
  dbCategories?: Category[];
  contactPhone?: string;
  contactEmail?: string;
  announcementBar?: string;
  user?: any;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Shop"]);
  const [mounted, setMounted] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const isMenuHovered = hoveredMenu !== null;
  const lastScrollY = useRef(0);

  const handleMenuHover = useCallback((label: string, isHovered: boolean) => {
    setHoveredMenu(prev => {
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

  // Dynamically build navLinks from dbCategories
  const allNavLinks = useMemo(() => {
    // 1. Filter out inactive and sort root categories by display_order
    const topLevelCategories = dbCategories
      .filter((c) => !c.parent_id && c.is_active !== false)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const allLinks: NavLinkItem[] = [];

    topLevelCategories.forEach((topCat) => {
      const children = dbCategories.filter(
        (c) => c.parent_id === topCat.id && c.is_active !== false
      );
      let megaMenu;

      if (children.length > 0) {
        const columns: MegaMenuColumn[] = [];

        // Check for 3rd level categories
        let hasSubChildren = false;
        children.forEach((child) => {
          const grandChildren = dbCategories.filter(
            (c) => c.parent_id === child.id && c.is_active !== false
          );
          if (grandChildren.length > 0) {
            hasSubChildren = true;
            columns.push({
              title: child.name,
              links: grandChildren.map((gc) => ({
                label: gc.name,
                href: `/categories/${gc.slug}`,
              })),
            });
          }
        });

        // If no 3rd level, group subcategories cleanly
        if (!hasSubChildren) {
          const chunkSize =
            children.length <= 6
              ? children.length
              : Math.ceil(children.length / 2);
          for (let i = 0; i < children.length; i += chunkSize) {
            columns.push({
              title:
                children.length > 6
                  ? `${topCat.name} (Part ${Math.floor(i / chunkSize) + 1})`
                  : "",
              links: children.slice(i, i + chunkSize).map((c) => ({
                label: c.name,
                href: `/categories/${c.slug}`,
              })),
            });
          }
        }

        const featuredImages = [];
        if (topCat.image_url) {
          featuredImages.push({
            src: topCat.image_url,
            alt: topCat.name,
            href: `/categories/${topCat.slug}`,
          });
        }

        megaMenu = {
          columns,
          featuredImages: featuredImages.length > 0 ? featuredImages : undefined,
        };
      }

      allLinks.push({
        label: topCat.name.toUpperCase(),
        href: `/categories/${topCat.slug}`,
        megaMenu,
      });
    });

    return allLinks;
  }, [dbCategories]);


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      let url = `/search?q=${encodeURIComponent(query)}`;
      if (searchCategory && searchCategory !== "all") url += `&category=${searchCategory}`;
      router.push(url);
    }
  };

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
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
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-black focus:outline-none"
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="flex h-full w-[85vw] max-w-sm flex-col bg-white p-0">
                   {/* Mobile Menu Content Simplified */}
                   <SheetHeader className="border-b border-gray-100 p-4 text-left">
                    <AnchorFashionLogo noLink className="w-full max-w-[140px]" />
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <SheetDescription className="sr-only">Navigation</SheetDescription>
                  </SheetHeader>
                  <nav className="flex-1 overflow-y-auto px-4 py-2">
                    <div className="divide-y divide-gray-50">
                      {allNavLinks.map((link) => (
                        <div key={link.label} className="py-1">
                          {link.megaMenu ? (
                            <div>
                              <div className="flex items-center justify-between">
                                <Link
                                  href={link.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="flex-1 py-2.5 text-sm font-semibold uppercase tracking-wider text-gray-800"
                                >
                                  {link.label}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(link.label)}
                                  className="p-2 text-gray-400"
                                >
                                  <ChevronDown
                                    className={cn(
                                      "h-4 w-4 transition-transform",
                                      expandedItems.includes(link.label) && "rotate-180"
                                    )}
                                  />
                                </button>
                              </div>
                              {expandedItems.includes(link.label) && (
                                <div className="mb-2 space-y-4 rounded-md bg-gray-50 px-3 py-3">
                                  {link.megaMenu.columns.map((col, idx) => (
                                    <div key={idx}>
                                      <div 
                                        className="flex items-center justify-between cursor-pointer py-1"
                                        onClick={() => toggleExpand(`${link.label}-${col.title}`)}
                                      >
                                        <p className="text-xs font-bold uppercase text-gray-900">{col.title}</p>
                                        <ChevronDown
                                          className={cn(
                                            "h-3 w-3 transition-transform text-gray-500",
                                            expandedItems.includes(`${link.label}-${col.title}`) && "rotate-180"
                                          )}
                                        />
                                      </div>
                                      {expandedItems.includes(`${link.label}-${col.title}`) && (
                                        <div className="flex flex-col gap-3 pl-2 mt-2 mb-1">
                                          {col.links.map((sub) => (
                                            <Link
                                              key={sub.href}
                                              href={sub.href}
                                              onClick={() => setMobileMenuOpen(false)}
                                              className="text-xs font-medium text-gray-600 hover:text-[#C9A86A]"
                                            >
                                              {sub.label}
                                            </Link>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Link
                              href={link.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center py-2.5 text-sm font-semibold uppercase tracking-wider text-gray-800"
                            >
                              {link.label}
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
              <div className="mx-3 h-5 w-px bg-gray-200" />
              <Select value={searchCategory || "all"} onValueChange={(val) => setSearchCategory(val === "all" ? "" : (val || ""))}>
                <SelectTrigger className="w-[140px] border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 text-sm font-medium text-gray-600 hover:text-gray-900 p-0 h-auto justify-between gap-1">
                  <SelectValue placeholder="Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-gray-100">
                  <SelectItem value="all" className="cursor-pointer font-medium text-gray-600 focus:bg-gray-50 focus:text-gray-900">
                    All Categories
                  </SelectItem>
                  {dbCategories.filter(c => !c.parent_id).map(c => (
                    <SelectItem key={c.id} value={c.slug} className="cursor-pointer text-gray-600 focus:bg-gray-50 focus:text-gray-900">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button type="submit" className="ml-2 pl-2">
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
                  <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest leading-none mb-1">Call Us Now</span>
                  <span className="text-sm font-bold text-gray-900 leading-none tracking-wide">
                    {contactPhone}
                  </span>
                </div>
              </div>
            )}

            {/* Account */}
            <Link
              href={accountHref}
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
              className="relative text-gray-700 hover:text-[#C9A86A] transition-colors flex items-center gap-1.5"
            >
              <ShoppingCart className="h-[22px] w-[22px]" strokeWidth={1.5} />
              <span className="text-sm font-semibold hidden sm:inline-block tracking-wide">
                {mounted ? cartItemCount : 0}
              </span>
              {/* Mobile cart badge */}
              {mounted && cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 sm:hidden flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-black px-1 text-[9px] font-bold text-white">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Row: Desktop Navigation */}
        <div className="hidden lg:block border-t border-b border-gray-100 bg-white relative">
          <nav className="mx-auto flex max-w-7xl items-center justify-center gap-4 lg:gap-6 xl:gap-8 px-4 flex-wrap">
            {allNavLinks.map((link) => (
              <NavItem 
                key={link.label} 
                link={link} 
                setActiveMenu={handleMenuHover} 
              />
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}
