"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Sparkles,
  Power,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PromotionRecord } from "@/lib/repositories/marketing/promotion.repository";
import { PromotionDialog } from "./PromotionDialog";
import { ConfirmDialog } from "@/features/admin/components/shared/ConfirmDialog";
import {
  deletePromotionAction,
  togglePromotionStatusAction,
} from "@/actions/marketing.actions";

interface PromotionsClientProps {
  initialPromotions: PromotionRecord[];
}

export function PromotionsClient({ initialPromotions }: PromotionsClientProps) {
  const router = useRouter();
  const [promotions, setPromotions] = useState<PromotionRecord[]>(initialPromotions);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionRecord | null>(null);
  const [deletingPromo, setDeletingPromo] = useState<PromotionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setPromotions(initialPromotions);
  }, [initialPromotions]);

  // Compute status helpers
  const getPromoState = (promo: PromotionRecord) => {
    const now = new Date();
    const start = new Date(promo.start_date);
    const end = new Date(promo.end_date);
    const isUpcoming = now < start;
    const isExpired = now > end;
    const isActive = promo.is_active && !isUpcoming && !isExpired;

    return { isActive, isUpcoming, isExpired };
  };

  // KPIs
  const kpis = useMemo(() => {
    let active = 0;
    let upcoming = 0;
    let expired = 0;

    promotions.forEach((p) => {
      const state = getPromoState(p);
      if (state.isActive) active++;
      else if (state.isUpcoming) upcoming++;
      else if (state.isExpired) expired++;
    });

    return { total: promotions.length, active, upcoming, expired };
  }, [promotions]);

  // Filtered promotions
  const filtered = useMemo(() => {
    return promotions.filter((promo) => {
      const matchSearch =
        search.trim() === "" ||
        promo.name.toLowerCase().includes(search.toLowerCase());

      const state = getPromoState(promo);
      let matchStatus = true;
      if (statusFilter === "active") matchStatus = state.isActive;
      else if (statusFilter === "upcoming") matchStatus = state.isUpcoming;
      else if (statusFilter === "expired") matchStatus = state.isExpired;
      else if (statusFilter === "disabled") matchStatus = !promo.is_active;

      return matchSearch && matchStatus;
    });
  }, [promotions, search, statusFilter]);

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingPromo) return;
    setIsDeleting(true);
    try {
      const res = await deletePromotionAction(deletingPromo.id);
      if (!res.success) {
        toast.error(res.error || "Failed to delete promotion");
        return;
      }
      setPromotions((prev) => prev.filter((p) => p.id !== deletingPromo.id));
      toast.success("Promotion deleted");
      setDeletingPromo(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (promo: PromotionRecord) => {
    const nextState = !promo.is_active;
    try {
      const res = await togglePromotionStatusAction(promo.id, nextState);
      if (!res.success) {
        toast.error(res.error || "Failed to toggle status");
        return;
      }
      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: nextState } : p))
      );
      toast.success(
        `Promotion "${promo.name}" ${nextState ? "activated" : "deactivated"}`
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotions & Discounts</h1>
          <p className="mt-1 text-muted-foreground">
            Manage seasonal discount campaigns, flash offers, and storewide markdown events.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Promotion
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Promotions</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All recorded campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {kpis.active}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Applying discounts live</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Campaigns</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {kpis.upcoming}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled for future dates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired / Past</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.expired}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search promotions by name..."
            className="pl-8 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "upcoming", label: "Upcoming" },
            { id: "expired", label: "Expired" },
            { id: "disabled", label: "Disabled" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={statusFilter === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(tab.id)}
              className="text-xs h-8"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Promotions Table */}
      <div className="rounded-md border bg-card text-card-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Photo</TableHead>
              <TableHead className="min-w-[200px]">Promotion Name</TableHead>
              <TableHead className="text-right w-[120px]">Discount Tier</TableHead>
              <TableHead className="w-[140px]">Start Date</TableHead>
              <TableHead className="w-[140px]">End Date</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="text-right w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="font-semibold text-foreground">No promotions found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {promotions.length === 0
                        ? "Create your first seasonal promotion or flash sale discount."
                        : "No campaigns match your current search or status filter."}
                    </p>
                    {promotions.length === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setIsCreateOpen(true)}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Create First Promotion
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((promo) => {
                const state = getPromoState(promo);

                return (
                  <TableRow key={promo.id} className="group">
                    <TableCell>
                      {promo.banner_url ? (
                        <div className="relative h-11 w-16 overflow-hidden rounded-md border border-border bg-muted/40">
                          <img
                            src={promo.banner_url}
                            alt={promo.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-11 w-16 items-center justify-center rounded-md border border-dashed border-border bg-muted/20 text-muted-foreground text-[10px]">
                          No Photo
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <div>
                        <span>{promo.name}</span>
                        {promo.banner_link && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs mt-0.5">
                            Link: <span className="text-primary font-mono">{promo.banner_link}</span>
                          </div>
                        )}
                        {promo.show_popup && (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            Popup active ({promo.popup_delay || 5}s delay)
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      <Badge variant="secondary" className="font-bold text-xs">
                        {promo.discount_percentage}% OFF
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(promo.start_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(promo.end_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      {!promo.is_active ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Disabled
                        </Badge>
                      ) : state.isActive ? (
                        <Badge
                          variant="default"
                          className="bg-emerald-600 hover:bg-emerald-700 font-normal"
                        >
                          Active
                        </Badge>
                      ) : state.isUpcoming ? (
                        <Badge variant="secondary" className="font-normal">
                          Upcoming
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          Expired
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingPromo(promo)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                            <span>Edit Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(promo)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Power className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {promo.is_active ? "Deactivate" : "Activate"}
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeletingPromo(promo)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Promotion Dialog */}
      <PromotionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
        onSuccess={(newPromo) => {
          setPromotions((prev) => [newPromo, ...prev]);
          router.refresh();
        }}
      />

      {/* Edit Promotion Dialog */}
      {editingPromo && (
        <PromotionDialog
          open={!!editingPromo}
          onOpenChange={(open) => !open && setEditingPromo(null)}
          mode="edit"
          initialData={editingPromo}
          onSuccess={(updated) => {
            setPromotions((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            );
            router.refresh();
          }}
        />
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingPromo}
        title="Delete Promotion?"
        description={`Are you sure you want to delete "${deletingPromo?.name}"? Customers will no longer receive this discount.`}
        confirmLabel="Delete Promotion"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingPromo(null)}
      />
    </div>
  );
}
