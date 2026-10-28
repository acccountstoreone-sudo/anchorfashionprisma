"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Bell,
  CircleUser,
  Search,
  Menu,
  Sparkles,
  Sun,
  Moon,
  MessageSquare,
  User,
  LogOut,
  Settings,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Megaphone,
  LayoutTemplate,
  LifeBuoy,
  BarChart3,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";



export function ManagerHeader({ user }: { user?: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleLogout() {
    try {
      await authClient.signOut();
    } catch (e) {
      console.warn("Logout notice:", e);
    }
    toast.success("Logged out successfully.");
    window.location.href = "/auth/login";
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/manager/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  return (
    <header className="shrink-0 sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-muted/40 dark:bg-background/80 dark:border-border px-4 backdrop-blur-md lg:h-[60px] lg:px-6">
      {/* Mobile Drawer Navigation */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden border-border/80 hover:bg-muted">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-[300px] sm:w-[340px] flex-col p-0 bg-slate-950 text-slate-100 border-r border-slate-800 shadow-2xl">
          {/* Executive Header Banner */}
          <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-black shadow-md">
                <Package className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tracking-wide text-white">
                    ANCHOR MANAGER
                  </span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <span className="text-[10px] font-semibold tracking-wider text-amber-400/90 uppercase">
                  Operations Command
                </span>
              </div>
            </div>

            {/* Manager Profile Snippet */}
            <div className="mt-3.5 flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/5 p-2.5">
              <Avatar className="h-8 w-8 border border-amber-400/30">
                <AvatarFallback className="bg-amber-600/30 text-amber-300 text-xs font-bold">
                  {(user?.user_metadata?.full_name || user?.email || "M").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-white truncate">
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Store Manager"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.email || "manager@anchorfashion.com"}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links Scrollable Area */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 overscroll-contain">
            {/* Quick Action: Live Storefront */}
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Visit Live Storefront</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-amber-400/70 font-semibold">Store ↗</span>
            </Link>

            {/* Section 1: Core Operations */}
            <div className="space-y-1">
              <span className="px-2 text-[9.5px] font-extrabold uppercase tracking-widest text-slate-500">
                Store Operations
              </span>
              {[
                { title: "Dashboard", href: "/manager", icon: LayoutDashboard },
                { title: "Orders Management", href: "/manager/orders", icon: ShoppingCart },
                { title: "Catalog & Products", href: "/manager/products", icon: Package },
                { title: "Inventory & Warehouses", href: "/manager/inventory", icon: Boxes },
              ].map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (pathname.startsWith(item.href) && item.href !== "/manager");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                      isActive
                        ? "bg-amber-400 text-black font-extrabold shadow-sm"
                        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-black" : "text-slate-400")} />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>

            {/* Section 2: CRM & Engagement */}
            <div className="space-y-1">
              <span className="px-2 text-[9.5px] font-extrabold uppercase tracking-widest text-slate-500">
                CRM & Marketing
              </span>
              {[
                { title: "Customer Records", href: "/manager/customers", icon: Users },
                { title: "Promotions & Marketing", href: "/manager/marketing", icon: Megaphone },
                { title: "Content (CMS)", href: "/manager/cms", icon: LayoutTemplate },
                { title: "Support Helpdesk", href: "/manager/support", icon: LifeBuoy },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                      isActive
                        ? "bg-amber-400 text-black font-extrabold shadow-sm"
                        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-black" : "text-slate-400")} />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>

            {/* Section 3: Performance & System */}
            <div className="space-y-1">
              <span className="px-2 text-[9.5px] font-extrabold uppercase tracking-widest text-slate-500">
                Reports & Settings
              </span>
              {[
                { title: "Analytics & Reports", href: "/manager/reports", icon: BarChart3 },
                { title: "Assigned Tasks", href: "/manager/tasks", icon: CheckSquare },
                { title: "Store Settings", href: "/manager/settings", icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                      isActive
                        ? "bg-amber-400 text-black font-extrabold shadow-sm"
                        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-black" : "text-slate-400")} />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Drawer Footer & Logout */}
          <div className="border-t border-slate-800 bg-slate-950 p-3.5 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-center border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 font-bold gap-2 text-xs rounded-xl"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out of Manager Portal
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Global Search Bar */}
      <div className="w-full flex-1">
        <form onSubmit={handleSearch}>
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products, orders, catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full appearance-none rounded-md bg-background dark:bg-slate-900 pl-8 shadow-none focus-visible:ring-primary"
            />
          </div>
        </form>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full text-muted-foreground hover:bg-muted"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle dark mode</span>
          </Button>
        )}

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full text-muted-foreground hover:bg-muted"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 mt-2 rounded-xl">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-bold flex justify-between items-center">
                Notifications
                <Link
                  href="/manager/support"
                  className="text-xs font-normal text-primary hover:underline"
                >
                  Manage
                </Link>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                <DropdownMenuItem asChild>
                  <Link
                    href="/manager/orders"
                    className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  >
                    <span className="font-semibold text-sm">Order Dispatch Queue</span>
                    <span className="text-xs text-muted-foreground">
                      New pending orders awaiting fulfillment.
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1">Live queue</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/manager/inventory"
                    className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  >
                    <span className="font-semibold text-sm">Low Stock Alert</span>
                    <span className="text-xs text-muted-foreground">
                      Multiple variants have dropped below reorder thresholds.
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1">Inventory</span>
                  </Link>
                </DropdownMenuItem>
              </div>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="p-2 text-center">
              <Link
                href="/manager/support"
                className="text-xs text-primary font-medium hover:underline"
              >
                View all operational alerts
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Support Tickets Quick Link */}
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="relative rounded-full text-muted-foreground hover:bg-muted"
          title="Customer Support"
        >
          <Link href="/manager/support">
            <MessageSquare className="h-4 w-4" />
            <span className="sr-only">Support</span>
          </Link>
        </Button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:bg-muted"
            >
              <CircleUser className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.user_metadata?.first_name ||
                      user?.user_metadata?.full_name ||
                      "Store Manager"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user?.email || "manager@anchorfashion.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push("/manager/settings/security")}
              >
                <User className="mr-2 h-4 w-4" />
                Security & Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push("/manager/settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
