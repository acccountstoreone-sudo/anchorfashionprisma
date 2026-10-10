import prisma from "@/lib/prisma";
import { Wishlist, WishlistItem } from "@/types/checkout.types";

export class WishlistRepository {
  /**
   * Fetch wishlist by user ID
   */
  async getWishlistByUserId(userId: string): Promise<Wishlist | null> {
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
                  media: {
                    select: {
                      url: true,
                      isPrimary: true
                    }
                  }
                }
              }
            }
          }
        }
      });
      return data as unknown as Wishlist;
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      throw new Error("Failed to fetch wishlist");
    }
  }

  /**
   * Create a new wishlist
   */
  async createWishlist(userId: string): Promise<Wishlist> {
    try {
      const data = await prisma.wishlist.create({
        data: {
          userId: userId,
        }
      });
      return data as unknown as Wishlist;
    } catch (error) {
      console.error("Error creating wishlist:", error);
      throw new Error("Failed to create wishlist");
    }
  }

  /**
   * Add item to wishlist
   */
  async addItem(wishlistId: string, productId: string): Promise<WishlistItem> {
    try {
      // Check if exists
      const existing = await prisma.wishlistItem.findFirst({
        where: {
          wishlistId,
          productId,
        }
      });

      if (existing) {
        return existing as unknown as WishlistItem; // Already added
      }

      const data = await prisma.wishlistItem.create({
        data: {
          wishlistId,
          productId,
        }
      });

      return data as unknown as WishlistItem;
    } catch (error) {
      console.error("Error adding wishlist item:", error);
      throw new Error("Failed to add item to wishlist");
    }
  }

  /**
   * Remove item from wishlist
   */
  async removeItem(itemId: string): Promise<void> {
    try {
      await prisma.wishlistItem.delete({
        where: { id: itemId }
      });
    } catch (error) {
      console.error("Error removing wishlist item:", error);
      throw new Error("Failed to remove item from wishlist");
    }
  }

  /**
   * Remove item by product ID
   */
  async removeItemByProductId(
    wishlistId: string,
    productId: string
  ): Promise<void> {
    try {
      const item = await prisma.wishlistItem.findFirst({
        where: { wishlistId, productId }
      });
      
      if (item) {
        await prisma.wishlistItem.delete({
          where: { id: item.id }
        });
      }
    } catch (error) {
      console.error("Error removing wishlist item by product id:", error);
      throw new Error("Failed to remove item from wishlist");
    }
  }
}
