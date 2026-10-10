"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trash2, Edit } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { deleteCustomerReviewAction } from "@/app/actions/customer.actions";

export function ReviewsList({ initialReviews }: { initialReviews: any[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteCustomerReviewAction(id);
      if (res.success) {
        toast.success("Review deleted successfully");
        setReviews((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error(res.error || "Failed to delete review");
      }
    });
  };

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-12 text-center">
        <p className="text-muted-foreground">
          You haven't written any reviews yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const product = review.product;
        const title = product?.name || "Unknown Product";
        const image = product?.main_image_url || "/images/placeholder.webp";

        return (
          <Card key={review.id}>
            <CardContent className="flex flex-col gap-6 p-6 md:flex-row">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image src={image} alt={title} fill className="object-cover" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <div className="mt-1 flex text-yellow-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? "fill-current" : "text-muted"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="mr-1 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(review.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
                {review.title && (
                  <p className="mt-2 font-medium">{review.title}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {review.comment || review.review_text}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Reviewed on {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
