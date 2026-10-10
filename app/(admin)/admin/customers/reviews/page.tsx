import { ReviewRepository } from "@/lib/repositories/catalog/review.repository";
import { ReviewsTable } from "@/app/(admin)/admin/products/reviews/reviews-table";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customer Reviews | Customers | Anchor Fashion Enterprise",
  description: "Monitor, view, approve, and manage customer product reviews.",
};

export default async function AdminCustomerReviewsPage() {
  const reviews = await ReviewRepository.getReviews();

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Customer Reviews
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor customer feedback, inspect detailed submissions, and manage public visibility.
          </p>
        </div>
      </div>

      <ReviewsTable initialReviews={reviews} />
    </div>
  );
}
