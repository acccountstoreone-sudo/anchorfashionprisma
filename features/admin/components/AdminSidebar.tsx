"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrderMetrics } from "@/hooks/oms/use-orders";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  Archive,
  Megaphone,
  FileText,
  Headphones,
  CreditCard,
  Truck,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  UserCheck,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { AnchorFashionLogo } from "@/components/shared/logo";
import { LogoutButton } from "@/components/auth/logout-button";

type NavItem = {
  name: string;
  href: string;
};

type NavGroup = {
  name: string;
  icon: any;
  href?: string;
  items?: NavItem[];
  allowedRoles?: string[];
};

type NavCategory = {
  title: string;
  items: NavGroup[];
};

const navigation: NavCategory[] = [
  {
    title: "GENERAL",
    items: [
      { name: "Executive Dashboard", href: "/admin", icon: LayoutDashboard, allowedRoles: ["SUPERADMIN", "ADMIN"] },
      { name: "Marketing Dashboard", href: "/admin/marketing", icon: LayoutDashboard, allowedRoles: ["MARKETING", "MARKETING_MANAGER"] },
      { name: "Analytics", href: "/admin/analytics", icon: BarChart3, allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER"] },
      { name: "Employee Profile", href: "/admin/profile", icon: UserCheck },
      { name: "Assigned Tasks", href: "/admin/tasks", icon: CheckSquare },
    ],
  },
  {
    title: "MARKETING & CRM",
    items: [
      {
        name: "Marketing",
        icon: Megaphone,
        allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER", "MARKETING_MANAGER", "MARKETING"],
        items: [
          { name: "Overview", href: "/admin/marketing" },
          { name: "Campaigns", href: "/admin/marketing/campaigns" },
          { name: "Promotions", href: "/admin/marketing/promotions" },
          { name: "Coupons", href: "/admin/marketing/coupons" },
          { name: "Banners", href: "/admin/cms/banners" },
          { name: "Newsletter", href: "/admin/marketing/newsletter" },
        ],
      },
      {
        name: "Content (CMS)",
        icon: FileText,
        allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER", "MARKETING_MANAGER", "MARKETING"],
        items: [
          { name: "Curated Categories", href: "/admin/cms/curated-categories" },
          { name: "Banners", href: "/admin/cms/banners" },
          { name: "Brand Ethos (Why Us)", href: "/admin/cms/why-choose-us" },
          { name: "Blog", href: "/admin/cms/blogs" },
          { name: "Media Library", href: "/admin/cms/media" },
        ],
      },
      {
        name: "CRM & Leads",
        icon: Headphones,
        allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER", "MARKETING_MANAGER", "MARKETING", "SUPPORT"],
        items: [
          { name: "Leads", href: "/admin/crm/leads" },
          { name: "Messages", href: "/admin/crm/messages" },
          { name: "Support Tickets", href: "/admin/support/tickets" },
        ],
      },
    ],
  },
  {
    title: "STORE OPERATIONS",
    items: [
      {
        name: "Products",
        icon: Package,
        allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER"],
        items: [
          { name: "All Products", href: "/admin/products" },
          { name: "Categories", href: "/admin/catalog/categories" },
          { name: "Brands", href: "/admin/catalog/brands" },
          { name: "Collections", href: "/admin/products/collections" },
          { name: "Reviews", href: "/admin/products/reviews" },
        ],
      },
      {
        name: "Orders",
        icon: ShoppingCart,
        allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER"],
        items: [
          { name: "All Orders", href: "/admin/orders" },
          { name: "Pending", href: "/admin/orders/pending" },
          { name: "Processing", href: "/admin/orders/processing" },
          { name: "Completed", href: "/admin/orders/completed" },
          { name: "Cancelled", href: "/admin/orders/cancelled" },
          { name: "Returns", href: "/admin/orders/returns" },
        ],
      },
      {
        name: "Customers",
        icon: Users,
        allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER", "SUPPORT"],
        items: [
          { name: "Customer List", href: "/admin/customers" },
          { name: "Customer Groups", href: "/admin/customers/groups" },
          { name: "Customer Reviews", href: "/admin/customers/reviews" },
        ],
      },
      {
        name: "Inventory",
        icon: Archive,
        allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER", "WAREHOUSE_MANAGER"],
        items: [
          { name: "Overview", href: "/admin/inventory" },
          { name: "Stock Control", href: "/admin/inventory/stock" },
          { name: "Warehouses", href: "/admin/inventory/warehouses" },
          { name: "Stock Movement", href: "/admin/inventory/movement" },
          { name: "Movement Audit Log", href: "/admin/inventory/stock-movements" },
          { name: "Stock Transfers", href: "/admin/inventory/transfers" },
          { name: "Purchase Orders", href: "/admin/inventory/purchases" },
          { name: "Suppliers", href: "/admin/inventory/suppliers" },
          { name: "Fulfillment", href: "/admin/inventory/fulfillment" },
          { name: "Audits", href: "/admin/inventory/audits" },
        ],
      },
      {
        name: "Shipping",
        icon: Truck,
        allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER", "WAREHOUSE_MANAGER"],
        items: [
          { name: "Couriers", href: "/admin/operations/logistics/couriers" },
          { name: "Tracking", href: "/admin/shipping/tracking" },
          { name: "Shipping Zones", href: "/admin/shipping/zones" },
        ],
      },
    ],
  },
  {
    title: "SYSTEM & ADMINISTRATION",
    items: [
      {
        name: "Finance",
        icon: CreditCard,
        allowedRoles: ["SUPERADMIN", "ADMIN"],
        items: [
          { name: "Manual Payments", href: "/admin/finance/manual-payments" },
          { name: "Sales Report", href: "/admin/analytics/sales" },
          { name: "Expenses", href: "/admin/finance/expenses" },
          { name: "Transactions", href: "/admin/payments/transactions" },
        ],
      },
      {
        name: "Users & Roles",
        icon: ShieldCheck,
        allowedRoles: ["SUPERADMIN", "ADMIN"],
        items: [
          { name: "Admin Users", href: "/admin/users/admins" },
          { name: "Managers", href: "/admin/users/managers" },
          { name: "Staff", href: "/admin/users/staff" },
          { name: "Permissions", href: "/admin/users/roles" },
        ],
      },
      {
        name: "Notifications",
        href: "/admin/notifications",
        icon: Bell,
        allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER"],
      },
      {
        name: "Settings",
        icon: Settings,
        allowedRoles: ["SUPERADMIN", "ADMIN"],
        items: [
          { name: "General", href: "/admin/settings/general" },
          { name: "Store", href: "/admin/settings/store" },
          { name: "Payment", href: "/admin/settings/payment" },
          { name: "Email", href: "/admin/settings/email" },
          { name: "SEO", href: "/admin/settings/seo" },
          { name: "Analytics", href: "/admin/settings/analytics" },
          { name: "Security", href: "/admin/security" },
        ],
      },
    ],
  },
];

export const AdminSidebar = ({
  className,
  role = "CUSTOMER",
  onNavigate,
  isMobile = false,
}: {
  className?: string;
  role?: string;
  onNavigate?: () => void;
  isMobile?: boolean;
}) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: orderMetrics } = useOrderMetrics();

  // On mobile drawers, never allow collapsed state
  const effectiveCollapsed = isMobile ? false : isCollapsed;

  const getOrderBadgeCount = (name: string): number | undefined => {
    if (!orderMetrics) return undefined;
    switch (name) {
      case "All Orders":
        return orderMetrics.totalOrders;
      case "Pending":
        return orderMetrics.pendingOrders;
      case "Processing":
        return orderMetrics.processingOrders;
      case "Completed":
        return orderMetrics.completedOrders;
      case "Cancelled":
        return orderMetrics.cancelledOrders;
      default:
        return undefined;
    }
  };

  return (
    <div
      className={cn(
        "flex h-full h-[100dvh] shrink-0 flex-col bg-card text-card-foreground shadow-[0_0_20px_rgba(89,102,122,0.05)] transition-all duration-300 relative z-20 border-r border-border",
        effectiveCollapsed ? "w-[80px]" : "w-[280px]",
        className
      )}
    >
      <div className={cn("h-[80px] shrink-0 flex items-center border-b border-border relative", effectiveCollapsed ? "px-0 justify-center" : "px-6 gap-3")}>
        {!effectiveCollapsed && (
          <>
            <AnchorFashionLogo noLink={true} className="text-foreground" />
          </>
        )}
        {effectiveCollapsed && <AnchorFashionLogo noLink={true} className="text-foreground w-8 h-8" />}
        
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted text-foreground transition-colors"
            title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {effectiveCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="space-y-6 py-4">
          {navigation.map((category) => {
            const normalizedRole = (role || "").toUpperCase().trim();
            const filteredItems = category.items.filter((item) => {
              if (!item.allowedRoles) return true;
              return item.allowedRoles.some((r) => r.toUpperCase() === normalizedRole);
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={category.title} className="px-4">
                {!effectiveCollapsed ? (
                  <h4 className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    {category.title}
                  </h4>
                ) : (
                  <div className="mb-2 mt-4 border-t border-muted-foreground/20 w-6 mx-auto first:mt-0 first:border-none" />
                )}
                <div className="space-y-1">
                  <Accordion type="multiple" className="w-full">
                    {filteredItems.map((group) => {
                      const Icon = group.icon;

                      if (group.href) {
                        const isActive =
                          pathname === group.href ||
                          (group.href !== "/admin" &&
                            pathname.startsWith(`${group.href}/`));
                        return (
                          <Link
                            key={group.name}
                            href={group.href}
                            onClick={onNavigate}
                            title={effectiveCollapsed ? group.name : undefined}
                            className={cn(
                              "group flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all",
                              effectiveCollapsed ? "justify-center px-0" : "px-4",
                              isActive
                                ? "bg-[#00A1FF]/10 text-[#00A1FF] relative after:absolute after:right-0 after:top-1/2 after:h-8 after:w-1 after:-translate-y-1/2 after:rounded-l-full after:bg-[#00A1FF]"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-[18px] w-[18px] flex-shrink-0",
                                isActive ? "text-[#00A1FF]" : "text-muted-foreground/80 group-hover:text-muted-foreground"
                              )}
                            />
                            {!effectiveCollapsed && group.name}
                          </Link>
                        );
                      }

                      const hasActiveChild = group.items?.some(
                        (item) =>
                          pathname === item.href || pathname.startsWith(`${item.href}/`)
                      );

                      if (effectiveCollapsed) {
                        const hasPendingOrders = group.name === "Orders" && (orderMetrics?.pendingOrders || 0) > 0;
                        return (
                          <div key={group.name} className="relative group/tooltip flex justify-center mb-1">
                            <button
                              title={group.name}
                              className={cn(
                                "group flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-medium transition-all hover:no-underline relative",
                                hasActiveChild
                                  ? "text-[#00A1FF] bg-[#00A1FF]/10 relative after:absolute after:right-0 after:top-1/2 after:h-8 after:w-1 after:-translate-y-1/2 after:rounded-l-full after:bg-[#00A1FF]"
                                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                              )}
                            >
                               <Icon
                                  className={cn(
                                    "h-[18px] w-[18px] flex-shrink-0",
                                    hasActiveChild ? "text-[#00A1FF]" : "text-muted-foreground/80 group-hover:text-muted-foreground"
                                  )}
                                />
                                {hasPendingOrders && (
                                  <span className="absolute top-2 right-2 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                  </span>
                                )}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <AccordionItem
                          key={group.name}
                          value={group.name}
                          className="border-none"
                        >
                          <AccordionTrigger
                            className={cn(
                              "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all hover:no-underline",
                              hasActiveChild
                                ? "text-[#00A1FF] bg-[#00A1FF]/10 relative after:absolute after:right-0 after:top-1/2 after:h-8 after:w-1 after:-translate-y-1/2 after:rounded-l-full after:bg-[#00A1FF]"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            <div className="flex flex-1 items-center justify-between gap-3 mr-2">
                              <div className="flex items-center gap-3">
                                <Icon
                                  className={cn(
                                    "h-[18px] w-[18px] flex-shrink-0",
                                    hasActiveChild ? "text-[#00A1FF]" : "text-muted-foreground/80 group-hover:text-muted-foreground"
                                  )}
                                />
                                {group.name}
                              </div>
                              {group.name === "Orders" && orderMetrics?.totalOrders !== undefined && (
                                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                                  {orderMetrics.totalOrders}
                                </span>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-1 pt-1">
                            <div className="ml-10 mt-1 flex flex-col space-y-1">
                              {group.items?.map((item) => {
                                const isSubActive = pathname === item.href;
                                const badgeCount = getOrderBadgeCount(item.name);
                                return (
                                  <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={onNavigate}
                                    className={cn(
                                      "relative flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                                      isSubActive
                                        ? "font-semibold text-[#00A1FF] bg-[#00A1FF]/5"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                    )}
                                  >
                                    <div className="flex items-center min-w-0 pr-2">
                                      <div
                                        className={cn(
                                          "mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors",
                                          isSubActive ? "bg-[#00A1FF]" : "bg-slate-300 group-hover:bg-slate-400"
                                        )}
                                      />
                                      <span className="truncate">{item.name}</span>
                                    </div>
                                    {badgeCount !== undefined && (
                                      <span
                                        className={cn(
                                          "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0",
                                          isSubActive
                                            ? "bg-[#00A1FF] text-white"
                                            : "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                        )}
                                      >
                                        {badgeCount}
                                      </span>
                                    )}
                                  </Link>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 p-4 border-t border-border flex justify-center">
        {effectiveCollapsed ? (
          <LogoutButton 
            className="w-10 h-10 p-0 justify-center bg-muted/50 hover:bg-muted dark:hover:bg-slate-800 text-foreground/90 border-none rounded-xl"
            hideText={true}
          />
        ) : (
          <LogoutButton className="w-full bg-muted/50 hover:bg-muted dark:hover:bg-slate-800 text-foreground/90 border-none" />
        )}
      </div>
    </div>
  );
};

