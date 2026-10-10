import { ReviewRepository } from "@/lib/repositories/catalog/review.repository";
import { ReviewsTable } from "./reviews-table";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Product Reviews | Catalog | Anchor Fashion Enterprise",
  description: "Monitor, view, approve, and manage customer product reviews.",
};

export default async function AdminReviewsPage() {
  const reviews = await ReviewRepository.getReviews();

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Product Reviews
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor customer feedback, view detailed submissions, and manage public visibility across all products.
          </p>
        </div>
      </div>

      <ReviewsTable initialReviews={reviews} />
    </div>
  );
}
