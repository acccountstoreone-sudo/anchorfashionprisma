import { WishlistRepository } from "../repositories/wishlist.repository";
import { Wishlist } from "@/types/checkout.types";
import { CartService } from "./cart.service";
import { prisma } from "@/lib/prisma";

export class WishlistService {
  /**
   * Get or create wishlist
   */
  static async getOrCreateWishlist(userId: string): Promise<Wishlist> {
    let wishlist = await WishlistRepository.getWishlist(userId);

    if (!wishlist) {
      wishlist = await WishlistRepository.createWishlist(userId);
    }

    return wishlist;
  }

  /**
   * Add item to wishlist
   */
  static async addItem(
    userId: string,
    productId: string,
    variantId?: string | null
  ): Promise<void> {
    const wishlist = await this.getOrCreateWishlist(userId);
    await WishlistRepository.addItem(wishlist.id, productId, variantId);
  }

  /**
   * Remove item from wishlist by Item ID
   */
  static async removeItem(itemId: string): Promise<void> {
    await WishlistRepository.removeItem(itemId);
  }

  /**
   * Remove item from wishlist by Product ID
   */
  static async removeItemByProductId(
    userId: string,
    productId: string
  ): Promise<void> {
    const wishlist = await this.getOrCreateWishlist(userId);
    await WishlistRepository.removeItemByProductId(wishlist.id, productId);
  }

  /**
   * Move item from wishlist to cart
   */
  static async moveToCart(
    userId: string,
    itemId: string,
    productId: string,
    variantId?: string | null
  ): Promise<void> {
    let effectiveVariantId = variantId;

    if (!effectiveVariantId) {
      const firstVariant = await prisma.variant.findFirst({
        where: { productId, isActive: true },
        select: { id: true },
      });
      if (firstVariant) {
        effectiveVariantId = firstVariant.id;
      }
    }

    // Add to cart
    await CartService.addItem(userId, null, productId, effectiveVariantId || null, 1);

    // Remove from wishlist
    await WishlistRepository.removeItem(itemId);
  }
}
