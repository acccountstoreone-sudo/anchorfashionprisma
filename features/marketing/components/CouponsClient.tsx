"use client";

import React, { useState, useMemo } from "react";
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
import { Plus, Tag, MoreHorizontal, Search, Trash2, Power } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CouponRecord } from "@/lib/repositories/marketing/coupon.repository";
import { CouponDialog } from "./CouponDialog";
import { ConfirmDialog } from "@/features/admin/components/shared/ConfirmDialog";
import {
  toggleCouponStatusAction,
  deleteCouponAction,
} from "@/actions/marketing.actions";

interface CouponsClientProps {
  initialCoupons: CouponRecord[];
}

export function CouponsClient({ initialCoupons }: CouponsClientProps) {
  const router = useRouter();
  const [coupons, setCoupons] = useState<CouponRecord[]>(initialCoupons);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingCoupon, setDeletingCoupon] = useState<CouponRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    setCoupons(initialCoupons);
  }, [initialCoupons]);

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) =>
      search.trim() === ""
        ? true
        : c.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [coupons, search]);

  const handleToggleActive = async (coupon: CouponRecord) => {
    const nextState = !coupon.is_active;
    try {
      const res = await toggleCouponStatusAction(coupon.id, nextState);
      if (!res.success) {
        toast.error(res.error || "Failed to toggle status");
        return;
      }
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: nextState } : c))
      );
      toast.success(`Coupon "${coupon.code}" ${nextState ? "activated" : "deactivated"}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCoupon) return;
    setIsDeleting(true);
    try {
      const res = await deleteCouponAction(deletingCoupon.id);
      if (!res.success) {
        toast.error(res.error || "Failed to delete coupon");
        return;
      }
      setCoupons((prev) => prev.filter((c) => c.id !== deletingCoupon.id));
      toast.success(`Coupon "${deletingCoupon.code}" deleted`);
      setDeletingCoupon(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Coupon Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create and track promotional voucher codes and discounts.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by code..."
          className="pl-8 bg-card"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active & Past Coupons</CardTitle>
          <CardDescription>
            Live view of all discount codes created across the store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Tag className="h-6 w-6 text-muted-foreground/40 mb-1" />
                        <p className="font-semibold text-foreground">No coupons found</p>
                        <p className="text-xs">Create your first coupon voucher above.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCoupons.map((coupon) => {
                    const isExpired = new Date() > new Date(coupon.valid_until);
                    const usageText = coupon.usage_limit
                      ? `${coupon.used_count} / ${coupon.usage_limit}`
                      : `${coupon.used_count} / Unlimited`;

                    return (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono font-bold">
                              {coupon.code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {coupon.discount_type === "PERCENTAGE"
                            ? `${coupon.value}% OFF`
                            : `$${coupon.value} OFF`}
                        </TableCell>
                        <TableCell className="capitalize text-xs">
                          {coupon.discount_type === "PERCENTAGE" ? "Percentage" : "Fixed Amount"}
                        </TableCell>
                        <TableCell className="text-xs">{usageText}</TableCell>
                        <TableCell>
                          {!coupon.is_active ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              Disabled
                            </Badge>
                          ) : isExpired ? (
                            <Badge variant="secondary">Expired</Badge>
                          ) : (
                            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(coupon.valid_until).toLocaleDateString()}
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
                                onClick={() => handleToggleActive(coupon)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Power className="h-4 w-4" />
                                <span>{coupon.is_active ? "Deactivate" : "Activate"}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeletingCoupon(coupon)}
                                className="flex items-center gap-2 cursor-pointer text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
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
        </CardContent>
      </Card>

      <CouponDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={(newCoupon) => {
          setCoupons((prev) => [newCoupon, ...prev]);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={!!deletingCoupon}
        title="Delete Coupon Code?"
        description={`Are you sure you want to permanently delete coupon "${deletingCoupon?.code}"?`}
        confirmLabel="Delete Coupon"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingCoupon(null)}
      />
    </div>
  );
}
