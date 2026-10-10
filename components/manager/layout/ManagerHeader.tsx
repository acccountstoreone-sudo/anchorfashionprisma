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
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { title: "Dashboard", href: "/manager", icon: LayoutDashboard },
  { title: "Orders", href: "/manager/orders", icon: ShoppingCart },
  { title: "Products", href: "/manager/products", icon: Package },
  { title: "Inventory", href: "/manager/inventory", icon: Boxes },
  { title: "Customers", href: "/manager/customers", icon: Users },
  { title: "Marketing", href: "/manager/marketing", icon: Megaphone },
  { title: "CMS", href: "/manager/cms", icon: LayoutTemplate },
  { title: "Support", href: "/manager/support", icon: LifeBuoy },
  { title: "Reports", href: "/manager/reports", icon: BarChart3 },
  { title: "Tasks", href: "/manager/tasks", icon: CheckSquare },
  { title: "Settings", href: "/manager/settings", icon: Settings },
];

export function ManagerHeader({ user }: { user?: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to log out. Please try again.");
      return;
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
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-72 flex-col p-0 dark:bg-background">
          <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
            <Package className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">Anchor Manager</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <nav className="space-y-1">
              {mobileNavItems.map((item) => {
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
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="border-t p-4">
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
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
