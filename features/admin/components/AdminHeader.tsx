"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import {
  Bell,
  Search,
  User,
  Menu,
  LogOut,
  Settings,
  Moon,
  Sun,
  MessageSquare,
  Home,
  X,
  CheckCheck,
  ShoppingCart,
  AlertTriangle,
  Users,
  CreditCard,
  Megaphone,
  Info,
  Mail,
  Inbox,
  MessageCircle,
  Loader2,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { playOrderNotificationSound, unlockAudioContext } from "@/lib/utils/notification-sound";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
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
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { AdminSidebar } from "./AdminSidebar";
import { AdminBookmarksMenu } from "./AdminBookmarksMenu";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  getAdminHeaderNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  type AdminNotification,
} from "@/actions/admin/notification.actions";
import {
  getAdminHeaderMessagesAction,
  markAllMessagesAsReadAction,
  deleteMessageAction,
  deleteAllMessagesAction,
  type AdminMessage,
} from "@/actions/admin/messages.actions";

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const NOTIFICATION_ICON_MAP: Record<string, React.ReactNode> = {
  order: <ShoppingCart className="h-4 w-4 text-violet-500" />,
  inventory: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  customer: <Users className="h-4 w-4 text-sky-500" />,
  payment: <CreditCard className="h-4 w-4 text-red-500" />,
  system: <Info className="h-4 w-4 text-slate-400" />,
  marketing: <Megaphone className="h-4 w-4 text-pink-500" />,
};

function notifIcon(type: string) {
  return NOTIFICATION_ICON_MAP[type?.toLowerCase()] ?? <Bell className="h-4 w-4 text-muted-foreground" />;
}

function msgIcon(type: string) {
  if (type === "EMAIL") return <Mail className="h-4 w-4 text-blue-500" />;
  if (type === "IN_APP") return <MessageCircle className="h-4 w-4 text-violet-500" />;
  return <Inbox className="h-4 w-4 text-muted-foreground" />;
}

function relativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

function getInitials(first: string, last: string, email?: string): string {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  return email?.slice(0, 2).toUpperCase() ?? "AD";
}

// ────────────────────────────────────────────────────────────────────────────
// Search autocomplete suggestions by page
// ────────────────────────────────────────────────────────────────────────────
const ADMIN_ROUTES = [
  { label: "Dashboard", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Add Product", href: "/admin/products/add" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Marketing", href: "/admin/marketing" },
  { label: "Inventory", href: "/admin/inventory" },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "Messages", href: "/admin/crm/messages" },
  { label: "Settings", href: "/admin/settings/general" },
  { label: "Staff", href: "/admin/staff" },
  { label: "CRM", href: "/admin/crm" },
  { label: "Support Tickets", href: "/admin/crm/support" },
  { label: "Campaigns", href: "/admin/marketing/campaigns" },
  { label: "Reports", href: "/admin/analytics/reports" },
];

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

interface AdminHeaderProps {
  user: any;
  role?: string;
  className?: string;
}

import { useAdminBreadcrumbStore } from "@/stores/useAdminBreadcrumbStore";

export const AdminHeader = ({ user, role, className }: AdminHeaderProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dynamicSegmentNames = useAdminBreadcrumbStore((state) => state.dynamicSegmentNames);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<typeof ADMIN_ROUTES>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const isInitialNotifMountRef = useRef(true);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());

  // Messages
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [msgUnread, setMsgUnread] = useState(0);
  const [msgLoading, setMsgLoading] = useState(true);

  // ── User metadata ──────────────────────────────────────────────────────────
  const firstName = user?.first_name || user?.name?.split(" ")[0] || "";
  const lastName = user?.last_name || user?.name?.split(" ").slice(1).join(" ") || "";
  const avatarUrl = user?.image || user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`;
  const initials = getInitials(firstName, lastName, user?.email);
  const displayName =
    firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : user?.full_name || user?.name || user?.email || "Admin User";

  // ── Breadcrumb ──────────────────────────────────────────────────────────────
  const paths = pathname.split("/").filter(Boolean);

  // ── Mount & Audio Context ──────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);

    try {
      const saved = localStorage.getItem("af_admin_notif_sound");
      if (saved !== null) {
        setSoundEnabled(saved === "true");
      }
    } catch {}

    const handleInteraction = () => {
      unlockAudioContext();
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("af_admin_notif_sound", String(next));
      } catch {}
      if (next) {
        playOrderNotificationSound();
        toast.success("🔊 Notification sound enabled");
      } else {
        toast.info("🔇 Notification sound muted");
      }
      return next;
    });
  };

  // ── Data fetching with real-time audio chime ───────────────────────────────
  const fetchNotifications = useCallback(
    async (isPolling = false) => {
      if (!isPolling) setNotifLoading(true);
      try {
        const result = await getAdminHeaderNotificationsAction();
        if (!result.error && result.data) {
          // If this is a subsequent polling check, detect newly arrived notifications
          if (!isInitialNotifMountRef.current) {
            const incoming = result.data.filter(
              (n) => !n.read_at && !seenNotifIdsRef.current.has(n.id)
            );

            if (incoming.length > 0) {
              const hasOrder = incoming.some(
                (n) => n.type?.toLowerCase() === "order"
              );

              if (soundEnabled) {
                playOrderNotificationSound();
              }

              const latest = incoming[0];
              toast(hasOrder ? "🛍️ New Order Received!" : "🔔 New Notification", {
                description: latest.message || latest.title,
                action: {
                  label: "View Orders",
                  onClick: () => router.push(latest.link_url || "/admin/orders"),
                },
                duration: 8000,
              });
            }
          }

          // Record all current notification IDs
          result.data.forEach((n) => seenNotifIdsRef.current.add(n.id));
          isInitialNotifMountRef.current = false;

          setNotifications(result.data);
          setNotifUnread(result.unreadCount);
        }
      } catch (e) {
        console.warn("Error fetching admin notifications:", e);
      } finally {
        if (!isPolling) setNotifLoading(false);
      }
    },
    [soundEnabled, router]
  );

  const fetchMessages = useCallback(async () => {
    setMsgLoading(true);
    try {
      const result = await getAdminHeaderMessagesAction();
      if (!result.error) {
        setMessages(result.data);
        setMsgUnread(result.unreadCount);
      }
    } catch (e) {
      console.warn("Error fetching admin messages:", e);
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(false);
    fetchMessages();

    // 1. Polling interval every 8 seconds for real-time notification sync
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 8000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchNotifications, fetchMessages, soundEnabled]);

  // ── Search ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchSuggestions([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    setSearchSuggestions(
      ADMIN_ROUTES.filter((r) => r.label.toLowerCase().includes(q) || r.href.includes(q)).slice(0, 6)
    );
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setSearchFocused(false);
      setSearchQuery("");
      router.push(`/admin/products?search=${encodeURIComponent(searchQuery)}`);
    }
    if (e.key === "Escape") {
      setSearchFocused(false);
      setSearchQuery("");
    }
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  async function handleLogout() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error("Failed to log out. Please try again.");
      return;
    }
    toast.success("Logged out successfully.");
    window.location.href = "/auth/login";
  }

  // ── Notification actions ───────────────────────────────────────────────────
  const handleMarkNotifRead = (id: string) => {
    startTransition(async () => {
      await markNotificationAsReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setNotifUnread((c) => Math.max(0, c - 1));
    });
  };

  const handleMarkAllNotifsRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      setNotifUnread(0);
      toast.success("All notifications marked as read");
    });
  };

  // ── Message actions ────────────────────────────────────────────────────────
  const handleMarkAllMsgsRead = () => {
    startTransition(async () => {
      await markAllMessagesAsReadAction();
      setMessages((prev) => prev.map((m) => ({ ...m, status: "READ" })));
      setMsgUnread(0);
      toast.success("All messages marked as read");
    });
  };

  const handleDeleteMsg = (id: string) => {
    startTransition(async () => {
      const res = await deleteMessageAction(id);
      if (res.success) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setMsgUnread((c) => Math.max(0, c - 1));
        toast.success("Message deleted");
      } else {
        toast.error(res.error || "Failed to delete message");
      }
    });
  };

  const handleClearAllMsgs = () => {
    startTransition(async () => {
      const res = await deleteAllMessagesAction();
      if (res.success) {
        setMessages([]);
        setMsgUnread(0);
        toast.success("All messages cleared");
      } else {
        toast.error(res.error || "Failed to clear messages");
      }
    });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <header className={cn("shrink-0 sticky top-0 z-30 flex h-[80px] w-full items-center justify-between border-b border-slate-200 dark:border-border bg-white dark:bg-background px-4 shadow-sm lg:px-8", className)}>
      {/* ── Left: mobile menu + breadcrumb ── */}
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden text-slate-700 dark:text-slate-200">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] border-r border-border p-0 bg-white dark:bg-background">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <AdminSidebar className="w-full border-r-0 shadow-none" role={role} />
          </SheetContent>
        </Sheet>

        <div className="hidden flex-col md:flex">
          <h2 className="text-[20px] font-bold tracking-tight text-slate-800 dark:text-slate-100 capitalize">
            {paths.length === 1 && paths[0].toLowerCase() === "admin"
              ? "Dashboard"
              : paths.length > 0
                ? dynamicSegmentNames[paths[paths.length - 1]] || paths[paths.length - 1].replace(/-/g, " ")
                : "Dashboard"}
          </h2>
          <nav className="flex items-center text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 gap-1.5">
            <Link href="/admin" className="hover:text-primary transition-colors flex items-center">
              <Home className="h-3 w-3" />
            </Link>
            {paths.map((path, index) => {
              const href = "/" + paths.slice(0, index + 1).join("/");
              const isLast = index === paths.length - 1;
              const isUUID = path.length > 30 && path.includes('-');
              const baseName = path === "admin" ? "Dashboard" : path.replace(/-/g, " ");
              
              const formattedName = dynamicSegmentNames[path] || (isUUID ? "Details" : baseName);
              
              return (
                <span key={`${path}-${index}`} className="flex items-center gap-1.5">
                  <span className="text-slate-400 dark:text-slate-600">/</span>
                  {isLast ? (
                    <span className="text-[#00A1FF] capitalize font-semibold max-w-[200px] truncate">
                      {formattedName}
                    </span>
                  ) : (
                    <Link href={href} className="capitalize hover:text-slate-700 dark:hover:text-slate-200 transition-colors max-w-[150px] truncate inline-block">
                      {formattedName}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-3 lg:gap-4">

        {/* Global Search with autocomplete */}
        <div className="relative hidden w-full sm:flex sm:w-[260px] md:w-[280px] lg:w-[320px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <Input
            type="search"
            placeholder="Search pages, products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="w-full h-10 appearance-none rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 pl-11 pr-4 shadow-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-1 focus-visible:ring-[#00A1FF] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Autocomplete dropdown */}
          {searchFocused && searchSuggestions.length > 0 && (
            <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
              {searchSuggestions.map((s) => (
                <button
                  key={s.href}
                  onMouseDown={() => {
                    router.push(s.href);
                    setSearchQuery("");
                    setSearchFocused(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted text-left transition-colors"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground">{s.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground truncate">{s.href}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Icon buttons row */}
        <div className="flex items-center gap-2">

          {/* Bookmarks */}
          <AdminBookmarksMenu />

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-10 w-10 rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100 transition-colors"
            title="Toggle theme"
          >
            {mounted && theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </Button>

          {/* ── Notifications Dropdown ── */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100 relative transition-colors"
                title="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
                {notifUnread > 0 && (
                  <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {notifUnread > 9 ? "9+" : notifUnread}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[360px] mt-2 rounded-xl p-0 border border-border bg-popover shadow-xl">
              <DropdownMenuLabel className="px-4 py-3 flex justify-between items-center bg-slate-50/50 dark:bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#00A1FF]" />
                  <span className="font-bold text-sm text-foreground">Notifications</span>
                  {notifUnread > 0 && (
                    <span className="text-[10px] bg-rose-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                      {notifUnread}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSound();
                    }}
                    className="p-1 rounded-md text-slate-500 hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                    title={soundEnabled ? "Mute notification sound" : "Enable notification sound"}
                  >
                    {soundEnabled ? (
                      <Volume2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      playOrderNotificationSound();
                      toast.success("🔊 Notification sound test played!");
                    }}
                    className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                    title="Click to test order alert sound"
                  >
                    Test Sound
                  </button>
                  {notifUnread > 0 && (
                    <button
                      onClick={handleMarkAllNotifsRead}
                      disabled={isPending}
                      className="flex items-center gap-1 text-xs font-normal text-[#00A1FF] hover:underline disabled:opacity-50 ml-1"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Mark all
                    </button>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="m-0" />
              <div className="max-h-[360px] overflow-y-auto">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No notifications yet.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.read_at) handleMarkNotifRead(n.id);
                        if (n.link_url) {
                          router.push(n.link_url);
                        } else if (n.type?.toLowerCase() === "order") {
                          router.push("/admin/orders");
                        }
                      }}
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 border-b border-border/50 last:border-0",
                        !n.read_at && "bg-blue-500/5 dark:bg-blue-500/10"
                      )}
                    >
                      <div className="mt-0.5 h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {notifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-sm font-semibold truncate", !n.read_at ? "text-foreground" : "text-foreground/70")}>
                            {n.title}
                          </span>
                          {!n.read_at && (
                            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                          {relativeTime(n.created_at)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <DropdownMenuSeparator className="m-0" />
              <div className="p-2.5 text-center">
                <Link
                  href="/admin/notifications"
                  className="text-sm text-[#00A1FF] hover:underline font-medium"
                >
                  View all notifications →
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ── Messages Dropdown ── */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100 relative transition-colors"
                title="Messages"
              >
                <MessageSquare className="h-[18px] w-[18px]" />
                {msgUnread > 0 && (
                  <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {msgUnread > 9 ? "9+" : msgUnread}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[340px] mt-2 rounded-xl p-0 border border-border bg-popover shadow-xl">
              <DropdownMenuLabel className="px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#00A1FF]" />
                  <span className="font-bold text-sm text-foreground">Messages</span>
                  {msgUnread > 0 && (
                    <span className="text-[10px] bg-blue-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                      {msgUnread}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {msgUnread > 0 && (
                    <button
                      onClick={handleMarkAllMsgsRead}
                      disabled={isPending}
                      className="flex items-center gap-1 text-xs font-normal text-[#00A1FF] hover:underline disabled:opacity-50"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Mark read
                    </button>
                  )}
                  {messages.length > 0 && (
                    <button
                      onClick={handleClearAllMsgs}
                      disabled={isPending}
                      className="flex items-center gap-1 text-xs font-normal text-rose-500 hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear all
                    </button>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="m-0" />
              <div className="max-h-[340px] overflow-y-auto">
                {msgLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No messages yet.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isUnread = m.status !== "READ";
                    const senderName =
                      m.profile
                        ? `${m.profile.first_name ?? ""} ${m.profile.last_name ?? ""}`.trim() || "Customer"
                        : "Customer";
                    const senderInitials = senderName.slice(0, 2).toUpperCase();
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors hover:bg-muted/60",
                          isUnread && "bg-[#00A1FF]/5"
                        )}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-xs font-bold">
                            {senderInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("text-sm font-semibold truncate", !isUnread && "text-foreground/70")}>
                              {senderName}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {msgIcon(m.type)}
                              {isUnread && <span className="h-2 w-2 rounded-full bg-[#00A1FF]" />}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMsg(m.id);
                                }}
                                disabled={isPending}
                                className="h-5 w-5 text-muted-foreground/50 hover:text-rose-500 flex items-center justify-center rounded transition-colors"
                                title="Delete message"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          {m.subject && (
                            <p className="text-xs font-medium text-foreground/80 truncate mt-0.5">{m.subject}</p>
                          )}
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {m.content ?? "No content"}
                          </p>
                          <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                            {relativeTime(m.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <DropdownMenuSeparator className="m-0" />
              <div className="p-2.5 text-center">
                <Link
                  href="/admin/crm/messages"
                  className="text-sm text-[#00A1FF] hover:underline font-medium"
                >
                  View all messages →
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── User Profile Dropdown ── */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-full hover:opacity-90 focus:outline-none pl-2">
            <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-[#00A1FF] text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start text-sm md:flex">
              <span className="font-semibold text-slate-700 dark:text-slate-200 leading-none mb-1">
                {firstName || displayName.split(" ")[0] || "Admin"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 leading-none capitalize">
                {role?.toLowerCase() || "admin"}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/admin/profile")}>
                <User className="mr-2 h-4 w-4" />
                Employee Profile
              </DropdownMenuItem>
              {role && ["SUPERADMIN", "ADMIN"].includes(role) && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push("/admin/settings/general")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/50"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
