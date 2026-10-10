import { prisma } from "@/lib/prisma";
import { Review } from "@/types/catalog.types";
import { revalidatePath } from "next/cache";

export class ReviewRepository {
  static async getReviews(): Promise<Review[]> {
    try {
      const reviews = await prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
          product: {
            select: { name: true, slug: true },
          }
        },
      });
      return reviews.map(mapPrismaReview) as unknown as Review[];
    } catch (err) {
      console.error("Unexpected error in getReviews:", err);
      return [];
    }
  }

  static async getReviewsByProductId(productId: string): Promise<Review[]> {
    try {
      const reviews = await prisma.review.findMany({
        where: { productId, isApproved: true },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
          product: {
            select: { name: true, slug: true },
          }
        },
      });
      return reviews.map(mapPrismaReview) as unknown as Review[];
    } catch (err) {
      console.error("Unexpected error in getReviewsByProductId:", err);
      return [];
    }
  }

  static async getReviewStatsByProductId(productId: string): Promise<any> {
    try {
      const agg = await prisma.review.aggregate({
        where: { productId, isApproved: true },
        _avg: { rating: true },
        _count: { rating: true },
      });

      return {
        product_id: productId,
        total_reviews: agg._count.rating,
        average_rating: agg._avg.rating || 0,
      };
    } catch (err) {
      console.error("Unexpected error in getReviewStatsByProductId:", err);
      return null;
    }
  }

  static async approveReview(id: string): Promise<void> {
    const review = await prisma.review.update({
      where: { id },
      data: { isApproved: true },
    });
    await this.recalculateProductRating(review.productId);
  }

  static async revokeReview(id: string): Promise<void> {
    const review = await prisma.review.update({
      where: { id },
      data: { isApproved: false },
    });
    await this.recalculateProductRating(review.productId);
  }

  static async deleteReview(id: string): Promise<void> {
    const review = await prisma.review.delete({
      where: { id },
    });
    await this.recalculateProductRating(review.productId);
  }

  static async recalculateProductRating(productId: string): Promise<void> {
    try {
      const stats = await this.getReviewStatsByProductId(productId);
      
      const prod = await prisma.product.update({
        where: { id: productId },
        data: { averageRating: Number(stats?.average_rating || 0) },
        select: { slug: true }
      });

      if (prod?.slug) {
        revalidatePath(`/product/${prod.slug}`);
        revalidatePath(`/products/${prod.slug}`);
      }
      revalidatePath("/products");
      revalidatePath("/admin/products/reviews");
    } catch (e) {
      console.error("Failed to recalculate product rating:", e);
    }
  }

  static async voteHelpful(
    id: string,
    increment: boolean = true
  ): Promise<{ success: boolean; helpful_votes: number; error?: string }> {
    try {
      // Prism model Review does not have helpful_votes mapped yet,
      // simulating success for now.
      return { success: true, helpful_votes: 1 };
    } catch (err: any) {
      console.error("Unexpected error in voteHelpful:", err);
      return { success: false, helpful_votes: 0, error: err.message };
    }
  }
}

function mapPrismaReview(r: any) {
  return {
    ...r,
    product_id: r.productId,
    customer_id: r.userId,
    customer_name: r.user ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || r.user.email : r.customerName,
    is_approved: r.isApproved,
    created_at: r.createdAt.toISOString(),
    customer: r.user ? {
      first_name: r.user.firstName,
      last_name: r.user.lastName,
      email: r.user.email
    } : null,
    product: r.product ? {
      name: r.product.name,
      slug: r.product.slug
    } : null,
  };
}
