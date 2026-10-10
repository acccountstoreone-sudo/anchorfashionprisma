"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Review } from "@/types/catalog.types";
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
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Star,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  ImageIcon,
  ShieldCheck,
  Loader2,
  MessageSquare,
  ThumbsUp,
  FilterX,
} from "lucide-react";
import {
  approveReviewAction,
  revokeReviewAction,
} from "@/lib/actions/admin/catalog.actions";
import { ReviewDetailDialog } from "./review-detail-dialog";
import { toast } from "sonner";

interface ReviewsTableProps {
  initialReviews: Review[];
}

export function ReviewsTable({ initialReviews }: ReviewsTableProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "cancelled">("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = reviews.length;
    const approved = reviews.filter((r) => r.is_approved).length;
    const cancelled = total - approved;
    const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const avgRating = total > 0 ? (totalRating / total).toFixed(1) : "0.0";
    return { total, approved, cancelled, avgRating };
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      // Status Filter
      if (statusFilter === "approved" && !review.is_approved) return false;
      if (statusFilter === "cancelled" && review.is_approved) return false;

      // Rating Filter
      if (ratingFilter !== "all") {
        const targetRating = parseInt(ratingFilter, 10);
        if (Math.round(review.rating) !== targetRating) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const customerName = review.customer
          ? `${review.customer.first_name || ""} ${review.customer.last_name || ""}`.toLowerCase()
          : "";
        const customerEmail = (review.customer?.email || "").toLowerCase();
        const productName = (review.product?.name || "").toLowerCase();
        const title = (review.title || "").toLowerCase();
        const reviewText = (review.review_text || "").toLowerCase();
        const customerId = (review.customer_id || "").toLowerCase();

        return (
          customerName.includes(query) ||
          customerEmail.includes(query) ||
          productName.includes(query) ||
          title.includes(query) ||
          reviewText.includes(query) ||
          customerId.includes(query)
        );
      }

      return true;
    });
  }, [reviews, statusFilter, ratingFilter, searchQuery]);

  // Toggle approval from table row directly
  const handleToggleApproval = async (review: Review) => {
    setLoadingRowId(review.id);
    const nextStatus = !review.is_approved;

    try {
      if (review.is_approved) {
        // Revoke approval
        const res = await revokeReviewAction({ id: review.id });
        if (res.success) {
          toast.success("Review approval cancelled. It is now hidden from the store.");
          updateReviewStatus(review.id, false);
        } else {
          toast.error(res.error || "Failed to cancel review approval");
        }
      } else {
        // Approve
        const res = await approveReviewAction({ id: review.id });
        if (res.success) {
          toast.success("Review approved. It is now publicly visible.");
          updateReviewStatus(review.id, true);
        } else {
          toast.error(res.error || "Failed to approve review");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update review status");
    } finally {
      setLoadingRowId(null);
    }
  };

  const updateReviewStatus = (id: string, isApproved: boolean) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_approved: isApproved } : r))
    );
    if (activeReview && activeReview.id === id) {
      setActiveReview((prev) => (prev ? { ...prev, is_approved: isApproved } : null));
    }
  };

  const handleDeleteReview = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    if (activeReview && activeReview.id === id) {
      setActiveReview(null);
      setIsDialogOpen(false);
    }
  };

  const handleOpenDetail = (review: Review) => {
    setActiveReview(review);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Reviews
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Customer feedback across all products
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Approved (Live)
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.approved}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Visible on store product pages
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Cancelled / Hidden
            </CardTitle>
            <XCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {metrics.cancelled}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Hidden from public product pages
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              {metrics.avgRating} <span className="text-xs text-muted-foreground font-normal">/ 5.0</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Overall customer satisfaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by customer, product, or review text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val: any) => setStatusFilter(val)}
          >
            <SelectTrigger className="w-[170px] text-xs">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Status ({reviews.length})
              </SelectItem>
              <SelectItem value="approved" className="text-xs">
                Approved Only ({metrics.approved})
              </SelectItem>
              <SelectItem value="cancelled" className="text-xs">
                Cancelled Only ({metrics.cancelled})
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Rating Filter */}
          <Select
            value={ratingFilter}
            onValueChange={(val) => setRatingFilter(val || "all")}
          >
            <SelectTrigger className="w-[140px] text-xs">
              <SelectValue placeholder="Rating: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Ratings
              </SelectItem>
              <SelectItem value="5" className="text-xs">
                ⭐⭐⭐⭐⭐ (5 Stars)
              </SelectItem>
              <SelectItem value="4" className="text-xs">
                ⭐⭐⭐⭐ (4 Stars)
              </SelectItem>
              <SelectItem value="3" className="text-xs">
                ⭐⭐⭐ (3 Stars)
              </SelectItem>
              <SelectItem value="2" className="text-xs">
                ⭐⭐ (2 Stars)
              </SelectItem>
              <SelectItem value="1" className="text-xs">
                ⭐ (1 Star)
              </SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== "all" || ratingFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setRatingFilter("all");
              }}
              className="text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <FilterX className="h-3.5 w-3.5" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Reviews Table */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[200px]">Customer</TableHead>
              <TableHead className="w-[220px]">Product</TableHead>
              <TableHead className="w-[130px]">Rating</TableHead>
              <TableHead className="min-w-[260px]">Review</TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead className="w-[160px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReviews.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-40 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                    <p className="font-medium text-sm">No reviews found.</p>
                    <p className="text-xs text-muted-foreground">
                      Try adjusting your search query or filter selection.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredReviews.map((review) => {
                const customerName = review.customer
                  ? `${review.customer.first_name || ""} ${review.customer.last_name || ""}`.trim() ||
                    "Customer"
                  : review.customer_id
                  ? `Customer #${review.customer_id.slice(0, 8)}`
                  : "Anonymous";

                const customerEmail = review.customer?.email || "";
                const isApproved = review.is_approved;
                const isRowLoading = loadingRowId === review.id;

                const formattedDate = review.created_at
                  ? new Date(review.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";

                return (
                  <TableRow key={review.id} className="text-xs hover:bg-muted/30 transition-colors">
                    {/* Customer */}
                    <TableCell>
                      <div>
                        <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          {customerName}
                          {review.order_id && (
                            <span title="Verified Purchase">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            </span>
                          )}
                        </div>
                        {customerEmail && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[170px]">
                            {customerEmail}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Product */}
                    <TableCell>
                      <div className="space-y-0.5 max-w-[200px]">
                        <div className="font-medium text-xs truncate text-foreground">
                          {review.product?.name || review.product_id}
                        </div>
                        {review.product?.slug && (
                          <Link
                            href={`/product/${review.product.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            View Product
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </TableCell>

                    {/* Rating */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="flex text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-muted text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-semibold">
                          {review.rating}
                        </span>
                      </div>
                    </TableCell>

                    {/* Review Snippet */}
                    <TableCell>
                      <div className="space-y-1 max-w-[340px]">
                        {review.title && (
                          <div className="font-semibold text-xs text-foreground truncate">
                            "{review.title}"
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {review.review_text || <span className="italic">No written comment.</span>}
                        </p>
                        {review.images && review.images.length > 0 && (
                          <div className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            <ImageIcon className="w-3 h-3" />
                            {review.images.length} {review.images.length === 1 ? "photo" : "photos"}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formattedDate}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      {isApproved ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 hover:bg-emerald-500/25 font-medium text-[11px] gap-1 px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 hover:bg-rose-500/25 font-medium text-[11px] gap-1 px-2 py-0.5"
                        >
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Cancelled (Hidden)
                        </Badge>
                      )}
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(review)}
                          className="h-8 px-2.5 text-xs gap-1 font-medium bg-background shadow-xs hover:bg-accent"
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          View
                        </Button>

                        {/* Quick Toggle: Cancel Approval / Approve */}
                        {isApproved ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleApproval(review)}
                            disabled={isRowLoading}
                            title="Cancel Approval (Hide from store)"
                            className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            {isRowLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleApproval(review)}
                            disabled={isRowLoading}
                            title="Approve Review (Show on store)"
                            className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          >
                            {isRowLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <ReviewDetailDialog
        review={activeReview}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onStatusChange={updateReviewStatus}
        onDelete={handleDeleteReview}
      />
    </div>
  );
}
