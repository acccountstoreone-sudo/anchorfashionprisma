"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
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
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogoutButton } from "@/components/auth/logout-button";

const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/manager",
    icon: LayoutDashboard,
  },
  {
    title: "Orders",
    href: "/manager/orders",
    icon: ShoppingCart,
  },
  {
    title: "Products",
    href: "/manager/products",
    icon: Package,
  },
  {
    title: "Inventory",
    href: "/manager/inventory",
    icon: Boxes,
  },
  {
    title: "Customers",
    href: "/manager/customers",
    icon: Users,
  },
  {
    title: "Marketing",
    href: "/manager/marketing",
    icon: Megaphone,
  },
  {
    title: "CMS",
    href: "/manager/cms",
    icon: LayoutTemplate,
  },
  {
    title: "Support",
    href: "/manager/support",
    icon: LifeBuoy,
  },
  {
    title: "Reports",
    href: "/manager/reports",
    icon: BarChart3,
  },
  {
    title: "Tasks",
    href: "/manager/tasks",
    icon: CheckSquare,
  },
  {
    title: "Settings",
    href: "/manager/settings",
    icon: Settings,
  },
];

export function ManagerSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "sticky top-0 hidden h-screen flex-shrink-0 border-r bg-muted/40 md:block transition-all duration-300 relative z-20",
      isCollapsed ? "w-[80px]" : "w-64"
    )}>
      <div className="flex h-full max-h-screen flex-col gap-2 relative">
        <div className={cn("flex h-14 items-center border-b lg:h-[60px]", isCollapsed ? "justify-center px-0" : "px-4 lg:px-6")}>
          <Link
            href="/manager"
            className={cn("flex items-center gap-2 font-semibold", isCollapsed && "justify-center")}
          >
            <Package className="h-6 w-6 text-primary" />
            {!isCollapsed && (
              <span className="text-lg font-bold tracking-tight">
                Anchor Manager
              </span>
            )}
          </Link>
        </div>
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted z-30"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <nav className={cn("grid items-start py-4 text-sm font-medium", isCollapsed ? "px-2" : "px-2 lg:px-4")}>
            {!isCollapsed ? (
              <div className="mb-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Operations
              </div>
            ) : (
              <div className="mb-2 mt-2 border-t border-muted-foreground/20 w-6 mx-auto" />
            )}
            {sidebarNavItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={index}
                  href={item.href}
                  title={isCollapsed ? item.title : undefined}
                  className={cn(
                    "mb-1 flex items-center gap-3 rounded-md py-2.5 transition-all",
                    isCollapsed ? "justify-center px-0 mx-2" : "px-3",
                    pathname === item.href ||
                      (pathname.startsWith(item.href) &&
                        item.href !== "/manager")
                      ? "bg-primary font-medium text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && item.title}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t p-4 flex justify-center">
          {isCollapsed ? (
            <LogoutButton 
              className="w-10 h-10 p-0 justify-center rounded-xl"
              hideText={true}
            />
          ) : (
            <LogoutButton className="w-full justify-center" />
          )}
        </div>
      </div>
    </div>
  );
}
