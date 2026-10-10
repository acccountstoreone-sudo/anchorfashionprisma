"use client";

import { useState, useEffect, useMemo } from "react";
import { Star, CheckCircle2, ThumbsUp, ImageIcon, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { jost } from "@/lib/fonts";
import { WriteReviewButton } from "@/features/customer/WriteReviewButton";
import { Review } from "@/types/catalog.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { voteReviewHelpfulAction } from "@/app/actions/customer.actions";
const STORAGE_KEY = "anchor_voted_helpful_reviews";

interface ProductReviewsProps {
  productId: string;
  productName?: string;
  averageRating: number;
  totalReviews: number;
  reviews?: Review[];
}

export function ProductReviews({
  productId,
  productName,
  averageRating = 0,
  totalReviews = 0,
  reviews = [],
}: ProductReviewsProps) {
  const [selectedRating, setSelectedRating] = useState<number | "all" | "photos">("all");
  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest">("newest");
  const [visibleCount, setVisibleCount] = useState(6);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [helpfulVoted, setHelpfulVoted] = useState<Record<string, boolean>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHelpfulVoted(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load voted reviews from localStorage:", e);
    }
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Recent";
    }
  };

  // Distribution calculations
  const distribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let withPhotos = 0;
    for (const r of reviews) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5))) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
      if (r.images && r.images.length > 0) withPhotos++;
    }
    return { counts, withPhotos };
  }, [reviews]);

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    let list = [...reviews];

    if (selectedRating === "photos") {
      list = list.filter((r) => r.images && r.images.length > 0);
    } else if (typeof selectedRating === "number") {
      list = list.filter((r) => Math.round(r.rating) === selectedRating);
    }

    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "highest") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "lowest") {
      list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }

    return list;
  }, [reviews, selectedRating, sortBy]);

  const displayedReviews = filteredReviews.slice(0, visibleCount);
  const hasMore = visibleCount < filteredReviews.length;

  const handleVoteHelpful = async (id: string, initialVotes: number = 0) => {
    const isCurrentlyVoted = !!helpfulVoted[id];
    const currentCount = voteCounts[id] !== undefined ? voteCounts[id] : initialVotes;
    const nextVoted = !isCurrentlyVoted;
    const nextCount = nextVoted ? currentCount + 1 : Math.max(0, currentCount - 1);

    // Optimistic UI updates
    setVoteCounts((prev) => ({ ...prev, [id]: nextCount }));
    setHelpfulVoted((prev) => {
      const updated = { ...prev, [id]: nextVoted };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save to localStorage:", err);
      }
      return updated;
    });

    if (nextVoted) {
      toast.success("Thank you for your feedback!");
    } else {
      toast.info("Helpful vote removed.");
    }

    try {
      const res = await voteReviewHelpfulAction(id, nextVoted);
      if (!res.success) {
        // Revert on failure
        setVoteCounts((prev) => ({ ...prev, [id]: currentCount }));
        setHelpfulVoted((prev) => {
          const reverted = { ...prev, [id]: isCurrentlyVoted };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(reverted));
          } catch {}
          return reverted;
        });
        toast.error(res.error || "Failed to save vote to database");
      } else if (res.helpful_votes !== undefined) {
        setVoteCounts((prev) => ({ ...prev, [id]: res.helpful_votes! }));
      }
    } catch (err) {
      console.error("Failed to vote helpful:", err);
      // Revert on error
      setVoteCounts((prev) => ({ ...prev, [id]: currentCount }));
      setHelpfulVoted((prev) => {
        const reverted = { ...prev, [id]: isCurrentlyVoted };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(reverted));
        } catch {}
        return reverted;
      });
      toast.error("Failed to update helpful vote. Please try again.");
    }
  };

  const calculatedAvg =
    reviews.length > 0
      ? Number(
          (
            reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
          ).toFixed(1)
        )
      : averageRating;

  return (
    <div className="border-t border-neutral-100 bg-neutral-50/40 py-16 md:py-24" id="reviews-section">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header Title and CTA */}
        <div className="mb-10 flex flex-col items-start justify-between gap-4 border-b border-neutral-200 pb-8 md:flex-row md:items-end">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Verified Feedback
            </p>
            <h2 className={`${jost.className} text-2xl font-light tracking-tight text-[#1A1A1A] md:text-4xl`}>
              Customer Reviews
            </h2>
          </div>
          <WriteReviewButton productId={productId} productName={productName} />
        </div>

        {reviews.length > 0 ? (
          <div className="space-y-10">
            {/* Reviews Summary Stats Card */}
            <div className="grid grid-cols-1 gap-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm md:grid-cols-12 md:p-8">
              {/* Overall Score */}
              <div className="flex flex-col items-center justify-center border-b border-neutral-100 pb-6 text-center md:col-span-4 md:border-b-0 md:border-r md:pb-0 md:pr-8">
                <span className={`${jost.className} text-5xl font-light tracking-tight text-neutral-900 md:text-6xl`}>
                  {calculatedAvg}
                </span>
                <div className="my-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-5 w-5",
                        star <= Math.round(calculatedAvg)
                          ? "fill-[#C9A86A] text-[#C9A86A]"
                          : "fill-neutral-200 text-neutral-200"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-neutral-500">
                  Based on {reviews.length} verified {reviews.length === 1 ? "review" : "reviews"}
                </p>
              </div>

              {/* Star Distribution Breakdown */}
              <div className="flex flex-col justify-center gap-2 md:col-span-8 md:pl-4">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = distribution.counts[stars as 1 | 2 | 3 | 4 | 5] || 0;
                  const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                  const isSelected = selectedRating === stars;

                  return (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => setSelectedRating(isSelected ? "all" : stars)}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-2 py-1 text-left text-xs transition-colors hover:bg-neutral-50",
                        isSelected && "bg-neutral-100 font-medium"
                      )}
                    >
                      <span className="flex w-12 items-center gap-1 text-neutral-700">
                        {stars} <Star className="h-3 w-3 fill-neutral-400 text-neutral-400" />
                      </span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-[#C9A86A] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-neutral-400 group-hover:text-neutral-700">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Bar & Sort Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={selectedRating === "all" ? "default" : "outline"}
                  onClick={() => setSelectedRating("all")}
                  className={cn("h-8 rounded-full text-xs font-normal", selectedRating === "all" ? "bg-black text-white" : "")}
                >
                  All ({reviews.length})
                </Button>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = distribution.counts[star as 1 | 2 | 3 | 4 | 5] || 0;
                  if (count === 0 && selectedRating !== star) return null;
                  return (
                    <Button
                      key={star}
                      size="sm"
                      variant={selectedRating === star ? "default" : "outline"}
                      onClick={() => setSelectedRating(selectedRating === star ? "all" : star)}
                      className={cn(
                        "h-8 rounded-full text-xs font-normal",
                        selectedRating === star ? "bg-black text-white" : ""
                      )}
                    >
                      {star} ★ ({count})
                    </Button>
                  );
                })}
                {distribution.withPhotos > 0 && (
                  <Button
                    size="sm"
                    variant={selectedRating === "photos" ? "default" : "outline"}
                    onClick={() => setSelectedRating(selectedRating === "photos" ? "all" : "photos")}
                    className={cn(
                      "h-8 gap-1.5 rounded-full text-xs font-normal",
                      selectedRating === "photos" ? "bg-black text-white" : ""
                    )}
                  >
                    <ImageIcon className="h-3 w-3" />
                    With Photos ({distribution.withPhotos})
                  </Button>
                )}
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-800 outline-none focus:border-black"
                >
                  <option value="newest">Newest First</option>
                  <option value="highest">Highest Rating</option>
                  <option value="lowest">Lowest Rating</option>
                </select>
              </div>
            </div>

            {/* Reviews Cards List */}
            {displayedReviews.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {displayedReviews.map((review) => {
                  const authorName = review.customer
                    ? `${review.customer.first_name || ""} ${review.customer.last_name || ""}`.trim() ||
                      review.customer.email?.split("@")[0] ||
                      "Verified Customer"
                    : "Verified Customer";

                  const initials = authorName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "C";

                  return (
                    <div
                      key={review.id}
                      className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div>
                        {/* Header: Avatar, Name, Rating & Date */}
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700">
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-neutral-900">
                                  {authorName}
                                </span>
                                {review.order_id && (
                                  <span
                                    title="Verified Purchase"
                                    className="flex items-center text-emerald-600"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-100 text-emerald-600" />
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-neutral-400">
                                {formatDate(review.created_at)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  "h-3.5 w-3.5",
                                  star <= Math.round(review.rating)
                                    ? "fill-[#C9A86A] text-[#C9A86A]"
                                    : "fill-neutral-200 text-neutral-200"
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Title & Body */}
                        {review.title && (
                          <h4 className="mb-2 text-sm font-semibold text-neutral-900">
                            {review.title}
                          </h4>
                        )}
                        <p className="text-xs leading-relaxed text-neutral-600 md:text-sm">
                          {review.review_text || "No review details provided."}
                        </p>

                        {/* Customer Uploaded Photo Gallery */}
                        {review.images && review.images.length > 0 && (
                          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                            {review.images.map((img: string, idx: number) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveImage(img)}
                                className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black"
                              >
                                <img
                                  src={img}
                                  alt={`Review photo ${idx + 1}`}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer: Verified Badge & Helpful vote */}
                      <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                        <div>
                          {review.order_id ? (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                              Verified Buyer
                            </span>
                          ) : (
                            <span className="text-[11px] text-neutral-400">Customer Review</span>
                          )}
                        </div>

                        {(() => {
                          const isVoted = !!helpfulVoted[review.id];
                          const currentVotes =
                            voteCounts[review.id] !== undefined
                              ? voteCounts[review.id]
                              : (review.helpful_votes || 0);

                          return (
                            <button
                              type="button"
                              onClick={() => handleVoteHelpful(review.id, review.helpful_votes || 0)}
                              className={cn(
                                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors cursor-pointer",
                                isVoted
                                  ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold"
                                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                              )}
                            >
                              <ThumbsUp
                                className={cn(
                                  "h-3.5 w-3.5 transition-transform active:scale-125",
                                  isVoted ? "fill-emerald-600 text-emerald-600" : "text-neutral-400"
                                )}
                              />
                              <span>
                                Helpful ({currentVotes})
                              </span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white py-12 text-center">
                <p className="text-sm text-neutral-500">
                  No reviews match your selected filter.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRating("all")}
                  className="mt-3 text-xs"
                >
                  Reset Filter
                </Button>
              </div>
            )}

            {/* Load More Button for multiple reviews */}
            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="rounded-full px-8 text-xs tracking-wider uppercase font-medium"
                >
                  Load More Reviews ({filteredReviews.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center shadow-xs">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Star className="h-6 w-6" />
            </div>
            <h3 className={`${jost.className} mb-1 text-xl font-normal text-neutral-900`}>
              No Customer Reviews Yet
            </h3>
            <p className="mb-6 max-w-sm text-xs leading-relaxed text-neutral-500">
              Be the first to share your thoughts on {productName || "this product"}. Your feedback helps other shoppers make informed choices.
            </p>
            <WriteReviewButton productId={productId} productName={productName} />
          </div>
        )}
      </div>

      {/* Lightbox Modal for Photo Gallery */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={activeImage}
              alt="Expanded review preview"
              className="max-h-[85vh] max-w-[85vw] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

