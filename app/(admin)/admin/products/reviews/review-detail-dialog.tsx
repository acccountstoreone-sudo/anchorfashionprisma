"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Trash2,
  Calendar,
  User,
  Package,
  ShieldCheck,
  ThumbsUp,
  Loader2,
  ZoomIn,
} from "lucide-react";
import { Review } from "@/types/catalog.types";
import {
  approveReviewAction,
  revokeReviewAction,
  deleteReviewAction,
} from "@/lib/actions/admin/catalog.actions";
import { toast } from "sonner";

interface ReviewDetailDialogProps {
  review: Review | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (id: string, isApproved: boolean) => void;
  onDelete?: (id: string) => void;
}

export function ReviewDetailDialog({
  review,
  open,
  onOpenChange,
  onStatusChange,
  onDelete,
}: ReviewDetailDialogProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!review) return null;

  const customerName = review.customer
    ? `${review.customer.first_name || ""} ${review.customer.last_name || ""}`.trim() ||
      "Customer"
    : review.customer_id
    ? `Customer #${review.customer_id.slice(0, 8)}`
    : "Anonymous";

  const customerEmail = review.customer?.email || "No email available";
  const productName = review.product?.name || `Product #${review.product_id.slice(0, 8)}`;
  const productSlug = review.product?.slug;

  const handleToggleApproval = async () => {
    setActionLoading(true);
    try {
      if (review.is_approved) {
        // Revoke / Cancel approval
        const res = await revokeReviewAction({ id: review.id });
        if (res.success) {
          toast.success(
            "Review approval cancelled. This review will no longer appear on the store."
          );
          onStatusChange?.(review.id, false);
        } else {
          toast.error(res.error || "Failed to cancel review approval");
        }
      } else {
        // Approve review
        const res = await approveReviewAction({ id: review.id });
        if (res.success) {
          toast.success(
            "Review approved. This review is now publicly visible on the product page."
          );
          onStatusChange?.(review.id, true);
        } else {
          toast.error(res.error || "Failed to approve review");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while updating status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this review?")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await deleteReviewAction({ id: review.id });
      if (res.success) {
        toast.success("Review deleted permanently");
        onDelete?.(review.id);
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to delete review");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while deleting");
    } finally {
      setActionLoading(false);
    }
  };

  const formattedDate = review.created_at
    ? new Date(review.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="text-xl font-bold">Review Details</DialogTitle>
              {review.is_approved ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 font-medium text-xs px-2.5 py-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Approved (Live on Store)
                </Badge>
              ) : (
                <Badge
                  variant="destructive"
                  className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 font-medium text-xs px-2.5 py-0.5"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Cancelled (Hidden from Store)
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Review ID: {review.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3 text-sm">
            {/* Customer & Product Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Customer Info */}
              <div className="rounded-lg border bg-muted/30 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  Customer Information
                </div>
                <div className="font-semibold text-sm">{customerName}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {customerEmail}
                </div>
                {review.order_id && (
                  <div className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Purchase (Order #{review.order_id.slice(0, 8)})
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="rounded-lg border bg-muted/30 p-3.5 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Package className="w-3.5 h-3.5" />
                    Product Information
                  </div>
                  <div className="font-semibold text-sm line-clamp-2 mt-1">
                    {productName}
                  </div>
                </div>
                {productSlug ? (
                  <Link
                    href={`/product/${productSlug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium pt-1 w-fit"
                  >
                    View Product Page
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">ID: {review.product_id}</span>
                )}
              </div>
            </div>

            {/* Rating and Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/20 border rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground font-medium mb-1">
                  Customer Rating
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-muted text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-sm">
                    {review.rating.toFixed(1)} / 5.0
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-muted-foreground font-medium mb-1">
                  Submitted On
                </div>
                <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {formattedDate}
                </div>
              </div>

              {typeof review.helpful_votes === "number" && review.helpful_votes > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground font-medium mb-1">
                    Helpful Votes
                  </div>
                  <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                    <ThumbsUp className="w-3.5 h-3.5 text-blue-500" />
                    {review.helpful_votes} users found helpful
                  </div>
                </div>
              )}
            </div>

            {/* Review Headline & Body */}
            <div className="space-y-2 rounded-lg border p-4 bg-card">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Review Content
              </div>
              {review.title && (
                <h4 className="font-bold text-base text-foreground leading-snug">
                  "{review.title}"
                </h4>
              )}
              <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {review.review_text || (
                  <span className="italic text-muted-foreground">
                    No text provided with this rating.
                  </span>
                )}
              </div>
            </div>

            {/* Uploaded Photos / Images */}
            {review.images && review.images.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">
                  Attached Photos ({review.images.length})
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {review.images.map((imgUrl, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedImage(imgUrl)}
                      className="group relative aspect-square rounded-md overflow-hidden border bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <img
                        src={imgUrl}
                        alt={`Review attachment ${index + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <ZoomIn className="w-5 h-5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={actionLoading}
              className="text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Delete Review
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={actionLoading}
              >
                Close
              </Button>

              {review.is_approved ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleApproval}
                  disabled={actionLoading}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30 gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  )}
                  Cancel Approval (Hide)
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleToggleApproval}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Approve Review (Show)
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox for full image view */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="sm:max-w-[700px] p-2 bg-black/90 border-none">
            <div className="relative w-full h-[70vh] flex items-center justify-center">
              <img
                src={selectedImage}
                alt="Enlarged review photo"
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
