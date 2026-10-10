import { prisma } from "@/lib/prisma";
import { Wishlist, WishlistItem } from "@/types/checkout.types";

export class WishlistRepository {
  /**
   * Get a user's wishlist
   */
  static async getWishlist(userId: string): Promise<Wishlist | null> {
    try {
      const data = await prisma.wishlist.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  basePrice: true,
                  salePrice: true,
                  imageUrl: true,
                  media: {
                    select: {
                      url: true,
                      isPrimary: true,
                    },
                  },
                  variants: {
                    include: {
                      inventoryLevels: {
                        select: {
                          quantityAvailable: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!data) return null;

      const items: WishlistItem[] = data.items.map((item) => {
        const prod = item.product;
        const mainImageUrl =
          prod.media?.find((m) => m.isPrimary)?.url ||
          prod.media?.[0]?.url ||
          prod.imageUrl ||
          null;
        const stockQuantity = (prod.variants || []).reduce(
          (total, v) =>
            total +
            (v.inventoryLevels || []).reduce(
              (sum, lvl) => sum + (lvl.quantityAvailable || 0),
              0
            ),
          0
        );

        return {
          id: item.id,
          wishlist_id: item.wishlistId,
          product_id: item.productId,
          variant_id: prod.variants?.[0]?.id || null,
          created_at: item.createdAt.toISOString(),
          product: {
            id: prod.id,
            title: prod.name,
            name: prod.name,
            slug: prod.slug,
            price: Number(prod.basePrice),
            base_price: Number(prod.basePrice),
            sale_price: prod.salePrice ? Number(prod.salePrice) : null,
            main_image_url: mainImageUrl,
            stock_quantity: stockQuantity,
          },
        };
      });

      return {
        id: data.id,
        user_id: data.userId,
        is_public: false,
        created_at: data.createdAt.toISOString(),
        updated_at: data.updatedAt.toISOString(),
        items,
      } as Wishlist;
    } catch (error: any) {
      console.error(`Failed to fetch wishlist for ${userId}:`, error.message);
      return null;
    }
  }

  /**
   * Create a new wishlist for a user
   */
  static async createWishlist(userId: string): Promise<Wishlist> {
    try {
      const existing = await this.getWishlist(userId);
      if (existing) return existing;

      const data = await prisma.wishlist.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      return {
        id: data.id,
        user_id: data.userId,
        is_public: false,
        created_at: data.createdAt.toISOString(),
        updated_at: data.updatedAt.toISOString(),
        items: [],
      } as Wishlist;
    } catch (err: any) {
      const existing = await this.getWishlist(userId);
      if (existing) return existing;
      throw new Error(`Failed to create wishlist: ${err.message}`);
    }
  }

  /**
   * Add item to wishlist
   */
  static async addItem(
    wishlistId: string,
    productId: string,
    variantId?: string | null
  ): Promise<void> {
    await prisma.wishlistItem.upsert({
      where: {
        wishlistId_productId: {
          wishlistId,
          productId,
        },
      },
      update: {},
      create: {
        wishlistId,
        productId,
      },
    });
  }

  /**
   * Remove item from wishlist
   */
  static async removeItem(itemId: string): Promise<void> {
    await prisma.wishlistItem.delete({
      where: { id: itemId },
    }).catch(() => {});
  }

  /**
   * Remove item by product ID (for a specific wishlist)
   */
  static async removeItemByProductId(
    wishlistId: string,
    productId: string
  ): Promise<void> {
    await prisma.wishlistItem.deleteMany({
      where: {
        wishlistId,
        productId,
      },
    }).catch(() => {});
  }
}
