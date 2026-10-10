"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Mail,
  Plus,
  RefreshCw,
  Search,
  CheckCheck,
  Trash2,
  Pencil,
  AlertTriangle,
  ShoppingCart,
  Users,
  CreditCard,
  Megaphone,
  Info,
  Shield,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllAdminNotificationsAction,
  createAdminNotificationAction,
  updateAdminNotificationAction,
  deleteAdminNotificationAction,
  deleteAllAdminNotificationsAction,
  toggleNotificationStatusAction,
  markAllNotificationsAsReadAction,
  type AdminNotification,
} from "@/actions/admin/notification.actions";
import { ConfirmDialog } from "@/features/admin/components/shared/ConfirmDialog";

interface Template {
  id: string;
  name: string;
  type: string;
  channels: string[];
  active: boolean;
}

const defaultTemplates: Template[] = [
  {
    id: "tpl-1",
    name: "welcome_customer",
    type: "TRANSACTIONAL",
    channels: ["email", "in_app"],
    active: true,
  },
  {
    id: "tpl-2",
    name: "order_confirmation",
    type: "TRANSACTIONAL",
    channels: ["email", "in_app"],
    active: true,
  },
  {
    id: "tpl-3",
    name: "low_stock_warning",
    type: "OPERATIONAL",
    channels: ["in_app"],
    active: true,
  },
  {
    id: "tpl-4",
    name: "marketing_newsletter",
    type: "MARKETING",
    channels: ["email"],
    active: true,
  },
  {
    id: "tpl-5",
    name: "password_reset_request",
    type: "SECURITY",
    channels: ["email"],
    active: true,
  },
];

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  order: <ShoppingCart className="h-4 w-4 text-violet-500" />,
  inventory: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  customer: <Users className="h-4 w-4 text-sky-500" />,
  payment: <CreditCard className="h-4 w-4 text-rose-500" />,
  system: <Info className="h-4 w-4 text-slate-500 dark:text-slate-400" />,
  marketing: <Megaphone className="h-4 w-4 text-pink-500" />,
  security: <Shield className="h-4 w-4 text-emerald-500" />,
};

function getNotifIcon(type: string) {
  return NOTIF_ICONS[type?.toLowerCase()] ?? <Bell className="h-4 w-4 text-muted-foreground" />;
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<"notifications" | "templates">("notifications");
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Search & Filter
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create / Edit Modal State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingNotification, setEditingNotification] = useState<AdminNotification | null>(null);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formMessage, setFormMessage] = useState<string>("");
  const [formType, setFormType] = useState<string>("system");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<AdminNotification | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState<boolean>(false);
  const [deletingAll, setDeletingAll] = useState<boolean>(false);

  // Templates State
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_notification_templates");
      if (saved) {
        setTemplates(JSON.parse(saved));
      } else {
        setTemplates(defaultTemplates);
      }
    } catch {
      setTemplates(defaultTemplates);
    }
  }, []);

  const updateTemplates = (newTemplates: Template[]) => {
    setTemplates(newTemplates);
    try {
      localStorage.setItem("admin_notification_templates", JSON.stringify(newTemplates));
    } catch {
      // Ignore storage errors
    }
  };
  const [templateDialogOpen, setTemplateDialogOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [tplName, setTplName] = useState<string>("");
  const [tplType, setTplType] = useState<string>("TRANSACTIONAL");
  const [tplChannels, setTplChannels] = useState<string>("email, in_app");

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await getAllAdminNotificationsAction({
        search: search.trim() || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
      });

      if (res.data) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
        setTotalCount(res.total);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [typeFilter]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchSearch =
        !search.trim() ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.message.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "unread" && !n.read_at) ||
        (statusFilter === "read" && !!n.read_at);

      return matchSearch && matchStatus;
    });
  }, [notifications, search, statusFilter]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingNotification(null);
    setFormTitle("");
    setFormMessage("");
    setFormType("system");
    setIsDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (n: AdminNotification) => {
    setEditingNotification(n);
    setFormTitle(n.title);
    setFormMessage(n.message);
    setFormType(n.type || "system");
    setIsDialogOpen(true);
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Please enter a notification title");
      return;
    }
    if (!formMessage.trim()) {
      toast.error("Please enter the notification message");
      return;
    }

    setSubmitting(true);
    try {
      if (editingNotification) {
        const res = await updateAdminNotificationAction(editingNotification.id, {
          title: formTitle,
          message: formMessage,
          type: formType,
        });

        if (res.success && res.data) {
          toast.success("Notification updated successfully");
          setNotifications((prev) =>
            prev.map((item) => (item.id === editingNotification.id ? res.data! : item))
          );
          setIsDialogOpen(false);
        } else {
          toast.error(res.error || "Failed to update notification");
        }
      } else {
        const res = await createAdminNotificationAction({
          title: formTitle,
          message: formMessage,
          type: formType,
        });

        if (res.success && res.data) {
          toast.success("Notification created and broadcast successfully");
          setNotifications((prev) => [res.data!, ...prev]);
          setTotalCount((c) => c + 1);
          setUnreadCount((c) => c + 1);
          setIsDialogOpen(false);
        } else {
          toast.error(res.error || "Failed to create notification");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Read Status
  const handleToggleRead = async (n: AdminNotification) => {
    const isCurrentlyRead = !!n.read_at;
    const res = await toggleNotificationStatusAction(n.id, isCurrentlyRead);
    if (res.success) {
      const newReadAt = isCurrentlyRead ? null : new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read_at: newReadAt } : item))
      );
      setUnreadCount((prev) => (isCurrentlyRead ? prev + 1 : Math.max(0, prev - 1)));
      toast.success(isCurrentlyRead ? "Marked as unread" : "Marked as read");
    } else {
      toast.error(res.error || "Failed to update status");
    }
  };

  // Delete Notification
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteAdminNotificationAction(deleteTarget.id);
      if (res.success) {
        toast.success("Notification deleted successfully");
        setNotifications((prev) => prev.filter((item) => item.id !== deleteTarget.id));
        setTotalCount((c) => Math.max(0, c - 1));
        if (!deleteTarget.read_at) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        setIsDeleteDialogOpen(false);
        setDeleteTarget(null);
      } else {
        toast.error(res.error || "Failed to delete notification");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete notification");
    } finally {
      setDeleting(false);
    }
  };

  // Delete All Notifications
  const handleConfirmDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await deleteAllAdminNotificationsAction();
      if (res.success) {
        toast.success("All notifications deleted successfully");
        setNotifications([]);
        setTotalCount(0);
        setUnreadCount(0);
        setIsDeleteAllOpen(false);
      } else {
        toast.error(res.error || "Failed to delete notifications");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete notifications");
    } finally {
      setDeletingAll(false);
    }
  };

  // Mark all read
  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markAllNotificationsAsReadAction();
      if (!res.error) {
        setNotifications((prev) =>
          prev.map((item) => ({ ...item, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
        toast.success("All notifications marked as read");
      } else {
        toast.error(res.error);
      }
    });
  };

  // Template handling
  const handleToggleTemplate = (id: string) => {
    const updated = templates.map((t) => (t.id === id ? { ...t, active: !t.active } : t));
    updateTemplates(updated);
    toast.success("Template status updated");
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    updateTemplates(updated);
    toast.success("Template deleted");
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim()) {
      toast.error("Template name is required");
      return;
    }
    const channels = tplChannels.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
    if (editingTemplate) {
      const updated = templates.map((t) =>
        t.id === editingTemplate.id
          ? { ...t, name: tplName.trim(), type: tplType, channels }
          : t
      );
      updateTemplates(updated);
      toast.success("Template updated successfully");
    } else {
      const newTpl: Template = {
        id: `tpl-${Date.now()}`,
        name: tplName.trim(),
        type: tplType,
        channels: channels.length > 0 ? channels : ["email"],
        active: true,
      };
      updateTemplates([...templates, newTpl]);
      toast.success("Template created successfully");
    }
    setTemplateDialogOpen(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Notification Center
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Broadcast operational alerts, view system notices, and manage communication templates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadNotifications}
            disabled={loading}
            className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <CheckCheck className="mr-2 h-4 w-4 text-emerald-500" /> Mark All Read
            </Button>
          )}

          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteAllOpen(true)}
              disabled={isPending || deleting || deletingAll}
              className="border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="mr-2 h-4 w-4 text-rose-500" /> Clear All
            </Button>
          )}

          <Button
            onClick={handleOpenCreate}
            className="bg-primary text-primary-foreground shadow-sm hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" /> Send Notification
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Alerts
            </CardTitle>
            <div className="rounded-lg bg-rose-500/10 p-2">
              <Bell className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">All system notices</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Unread Alerts
            </CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{unreadCount}</div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Awaiting attention</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Templates
            </CardTitle>
            <div className="rounded-lg bg-violet-500/10 p-2">
              <Mail className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {templates.filter((t) => t.active).length}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pre-configured channels</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dispatch Mode
            </CardTitle>
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <Shield className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Live</div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">In-App & Email channels active</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <Button
          variant={activeTab === "notifications" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("notifications")}
          className="text-xs font-semibold gap-2"
        >
          <Bell className="h-3.5 w-3.5" />
          All Notifications ({totalCount})
        </Button>
        <Button
          variant={activeTab === "templates" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("templates")}
          className="text-xs font-semibold gap-2"
        >
          <Mail className="h-3.5 w-3.5" />
          Message Templates ({templates.length})
        </Button>
      </div>

      {/* ──────────────── TAB 1: NOTIFICATIONS ──────────────── */}
      {activeTab === "notifications" && (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Notification Register
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {filteredNotifications.length} of {notifications.length} alerts.
                </CardDescription>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search title or message..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 text-xs border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                  />
                </div>

                <Select value={typeFilter} onValueChange={(val) => val && setTypeFilter(val)}>
                  <SelectTrigger className="h-9 w-32 text-xs border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
                  <SelectTrigger className="h-9 w-28 text-xs border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableRow className="border-b border-slate-200 dark:border-slate-800">
                    <TableHead className="w-[120px] font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      Type
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      Notification Details
                    </TableHead>
                    <TableHead className="w-[110px] font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      Status
                    </TableHead>
                    <TableHead className="w-[140px] font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      Date Created
                    </TableHead>
                    <TableHead className="w-[120px] text-right font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span>Loading notifications...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredNotifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Bell className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                            No notifications found
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {notifications.length === 0
                              ? "Click 'Send Notification' to broadcast an alert."
                              : "No alerts match your search or filter."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNotifications.map((n) => {
                      const isUnread = !n.read_at;
                      return (
                        <TableRow
                          key={n.id}
                          className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                            isUnread ? "bg-blue-50/20 dark:bg-blue-950/10" : ""
                          }`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="rounded-md bg-slate-100 dark:bg-slate-800 p-1.5 shrink-0">
                                {getNotifIcon(n.type)}
                              </div>
                              <span className="text-xs font-semibold capitalize text-slate-800 dark:text-slate-200">
                                {n.type}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${isUnread ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                                  {n.title}
                                </span>
                                {isUnread && (
                                  <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                {n.message}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                isUnread
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900 text-[11px] font-medium"
                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 text-[11px]"
                              }
                            >
                              {isUnread ? "Unread" : "Read"}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(n.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {new Date(n.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                                onClick={() => handleToggleRead(n)}
                                title={isUnread ? "Mark as Read" : "Mark as Unread"}
                              >
                                {isUnread ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                                onClick={() => handleOpenEdit(n)}
                                title="Edit Notification"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                onClick={() => {
                                  setDeleteTarget(n);
                                  setIsDeleteDialogOpen(true);
                                }}
                                title="Delete Notification"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ──────────────── TAB 2: TEMPLATES ──────────────── */}
      {activeTab === "templates" && (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Communication Templates
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Configure automated email and in-app message triggers.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingTemplate(null);
                setTplName("");
                setTplType("TRANSACTIONAL");
                setTplChannels("email, in_app");
                setTemplateDialogOpen(true);
              }}
              className="text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> New Template
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableRow className="border-b border-slate-200 dark:border-slate-800">
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      Template Identifier
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      Category Type
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      Active Channels
                    </TableHead>
                    <TableHead className="w-[120px] font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      Status
                    </TableHead>
                    <TableHead className="w-[120px] text-right font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tpl) => (
                    <TableRow
                      key={tpl.id}
                      className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <TableCell className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {tpl.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px] font-semibold">
                          {tpl.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tpl.channels.map((c) => (
                            <Badge
                              key={c}
                              variant="outline"
                              className="text-[10px] uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {c.replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleToggleTemplate(tpl.id)}
                          className="focus:outline-none"
                        >
                          <Badge
                            className={`cursor-pointer text-[11px] font-semibold ${
                              tpl.active
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900"
                                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            }`}
                          >
                            {tpl.active ? "Active" : "Inactive"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                            onClick={() => {
                              setEditingTemplate(tpl);
                              setTplName(tpl.name);
                              setTplType(tpl.type);
                              setTplChannels(tpl.channels.join(", "));
                              setTemplateDialogOpen(true);
                            }}
                            title="Edit Template"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            title="Delete Template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Dialog: Create / Edit Notification ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Bell className="h-5 w-5 text-primary" />
              {editingNotification ? "Edit Notification" : "Send Broadcast Notification"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
              {editingNotification
                ? "Update the content and category of this notification."
                : "Create an alert that immediately displays in the admin dashboard and notifications center."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="notif-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="notif-title"
                placeholder="e.g., Flash Sale Announcement, Stock Depleted"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notif-type" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Notification Type
              </Label>
              <Select value={formType} onValueChange={(val) => val && setFormType(val)}>
                <SelectTrigger id="notif-type" className="border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System Notification</SelectItem>
                  <SelectItem value="order">Order Update</SelectItem>
                  <SelectItem value="inventory">Inventory Alert</SelectItem>
                  <SelectItem value="customer">Customer Event</SelectItem>
                  <SelectItem value="payment">Payment & Billing</SelectItem>
                  <SelectItem value="marketing">Marketing Campaign</SelectItem>
                  <SelectItem value="security">Security & Access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notif-msg" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Message Body <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="notif-msg"
                placeholder="Write the message text for this alert..."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                rows={4}
                required
                className="border-slate-200 dark:border-slate-800"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
                className="border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingNotification ? "Save Changes" : "Send Alert"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Create / Edit Template ── */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Mail className="h-5 w-5 text-primary" />
              {editingTemplate ? "Edit Template" : "New Template"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
              Configure communication trigger identifiers and channels.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTemplate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Identifier Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g., order_shipped_sms"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                required
                className="border-slate-200 dark:border-slate-800 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Category Type
              </Label>
              <Select value={tplType} onValueChange={(val) => val && setTplType(val)}>
                <SelectTrigger className="border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSACTIONAL">TRANSACTIONAL</SelectItem>
                  <SelectItem value="MARKETING">MARKETING</SelectItem>
                  <SelectItem value="OPERATIONAL">OPERATIONAL</SelectItem>
                  <SelectItem value="SECURITY">SECURITY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Channels (comma-separated)
              </Label>
              <Input
                placeholder="email, in_app, sms"
                value={tplChannels}
                onChange={(e) => setTplChannels(e.target.value)}
                className="border-slate-200 dark:border-slate-800 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTemplateDialogOpen(false)}
                className="border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingTemplate ? "Update Template" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirm Delete Notification ── */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Delete Notification"
        description="Are you sure you want to permanently delete this notification? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setDeleteTarget(null);
        }}
      />

      {/* ── Dialog: Confirm Delete All Notifications ── */}
      <ConfirmDialog
        open={isDeleteAllOpen}
        title="Delete All Notifications"
        description="Are you sure you want to permanently delete all notifications? This action cannot be undone."
        confirmLabel="Delete All"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={deletingAll}
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => setIsDeleteAllOpen(false)}
      />
    </div>
  );
}
