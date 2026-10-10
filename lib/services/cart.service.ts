import { CartRepository } from "../repositories/cart.repository";
import { Cart } from "@/types/checkout.types";
import { prisma } from "@/lib/prisma";
import { FlashSaleService } from "@/lib/services/marketing/flash-sale.service";

export class CartService {
  /**
   * Get or create a cart
   */
  static async getOrCreateCart(
    userId?: string | null,
    sessionId?: string | null,
    cartId?: string | null
  ): Promise<Cart> {
    if (!userId && !sessionId && !cartId) {
      throw new Error("Must provide userId, sessionId, or cartId");
    }

    let cart = await CartRepository.getCart(userId, sessionId, cartId);

    if (!cart) {
      cart = await CartRepository.createCart(userId, sessionId);
    }

    return cart;
  }

  /**
   * Add an item to the cart with authoritative server-side validation:
   * - Product exists & is ACTIVE (in Neon PostgreSQL via Prisma)
   * - Variant belongs to product & is ACTIVE
   * - Quantity is positive integer
   * - Authoritative inventory levels are respected
   * - Flash sale availability is verified
   */
  static async addItem(
    userId: string | null | undefined,
    sessionId: string | null | undefined,
    productId: string,
    variantId: string | null,
    quantity: number
  ): Promise<void> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Quantity must be at least 1.");
    }

    // 1. Verify Product exists and is active in Neon PostgreSQL
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        sku: true,
        basePrice: true,
      },
    });

    if (!product || product.status !== "ACTIVE") {
      throw new Error("This product is currently unavailable for purchase.");
    }

    // 2. Verify or resolve variant
    const variants = await prisma.variant.findMany({
      where: { productId },
      select: {
        id: true,
        sku: true,
        isActive: true,
        priceOverride: true,
        salePrice: true,
        inventoryLevels: {
          select: {
            quantityAvailable: true,
          },
        },
      },
    });

    let effectiveVariantId: string;

    if (variants && variants.length > 0) {
      let matchedVariant = variantId ? variants.find((v) => v.id === variantId) : null;
      if (!matchedVariant) {
        matchedVariant = variants.find((v) => v.isActive) || variants[0];
      }
      if (!matchedVariant) {
        throw new Error("No available variant for this product.");
      }
      if (!matchedVariant.isActive) {
        throw new Error("Selected variant is currently inactive.");
      }
      effectiveVariantId = matchedVariant.id;
    } else {
      // Product has no variants in DB. Check or create a default variant
      let defaultVariant = await prisma.variant.findFirst({
        where: { productId },
        select: { id: true, isActive: true },
      });

      if (!defaultVariant) {
        const defaultSku =
          product.sku ||
          `${product.slug.toUpperCase().slice(0, 10)}-DEFAULT-${Date.now().toString().slice(-4)}`;

        defaultVariant = await prisma.variant.create({
          data: {
            productId: product.id,
            sku: defaultSku,
            priceOverride: product.basePrice,
            isActive: true,
            attributes: { Standard: "Default" },
          },
          select: { id: true, isActive: true },
        });

        const defaultWarehouse = await prisma.warehouse.findFirst({
          where: { isActive: true },
          select: { id: true },
        });

        if (defaultWarehouse) {
          await prisma.inventoryLevel.create({
            data: {
              variantId: defaultVariant.id,
              warehouseId: defaultWarehouse.id,
              quantityAvailable: 100,
              quantityReserved: 0,
              reorderPoint: 10,
            },
          });
        }
      }
      effectiveVariantId = defaultVariant.id;
    }

    // 3. Check inventory stock from inventoryLevels
    const targetVariant = variants.find((v) => v.id === effectiveVariantId);
    let inventoryLevels = targetVariant?.inventoryLevels;
    if (!inventoryLevels || inventoryLevels.length === 0) {
      inventoryLevels = await prisma.inventoryLevel.findMany({
        where: { variantId: effectiveVariantId },
        select: { quantityAvailable: true },
      });
    }

    if (inventoryLevels && inventoryLevels.length > 0) {
      const totalAvailable = inventoryLevels.reduce(
        (sum, lvl) => sum + (lvl.quantityAvailable || 0),
        0
      );

      if (totalAvailable <= 0) {
        throw new Error("This item is currently out of stock.");
      }

      // Check existing quantity in current cart
      const cart = await this.getOrCreateCart(userId, sessionId);
      const existingItem = (cart.items || []).find(
        (i: any) => i.variant_id === effectiveVariantId
      );
      const currentInCart = existingItem ? existingItem.quantity : 0;

      if (currentInCart + quantity > totalAvailable) {
        const remaining = Math.max(0, totalAvailable - currentInCart);
        if (remaining <= 0) {
          throw new Error(
            `You already have the maximum available stock (${totalAvailable}) in your cart.`
          );
        }
        throw new Error(
          `Cannot add ${quantity} item(s). Only ${remaining} more available in stock.`
        );
      }
    }

    // 4. Check active flash sale availability if applicable
    const flashSale = await FlashSaleService.getFlashSaleForProduct(productId);
    if (flashSale) {
      const flashRemaining = Math.max(
        0,
        flashSale.stock_allocated - flashSale.stock_sold
      );
      if (flashRemaining <= 0) {
        throw new Error("Flash sale stock for this item is fully claimed.");
      }
      const cart = await this.getOrCreateCart(userId, sessionId);
      const existingItem = (cart.items || []).find(
        (i: any) => i.variant_id === effectiveVariantId
      );
      const currentInCart = existingItem ? existingItem.quantity : 0;
      if (currentInCart + quantity > flashRemaining) {
        throw new Error(
          `Only ${flashRemaining} item(s) remain at flash sale price.`
        );
      }
    }

    // 5. Add to cart
    const cart = await this.getOrCreateCart(userId, sessionId);
    await CartRepository.addItem(cart.id, productId, effectiveVariantId, quantity);
  }

  /**
   * Update quantity with authoritative inventory checks
   */
  static async updateQuantity(itemId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.removeItem(itemId);
      return;
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      select: { id: true, variantId: true },
    });

    if (item && item.variantId) {
      const inventoryLevels = await prisma.inventoryLevel.findMany({
        where: { variantId: item.variantId },
        select: { quantityAvailable: true },
      });

      if (inventoryLevels && inventoryLevels.length > 0) {
        const totalAvailable = inventoryLevels.reduce(
          (sum, lvl) => sum + (lvl.quantityAvailable || 0),
          0
        );

        if (quantity > totalAvailable) {
          throw new Error(
            `Cannot set quantity to ${quantity}. Only ${totalAvailable} item(s) available.`
          );
        }
      }
    }

    await CartRepository.updateItemQuantity(itemId, quantity);
  }

  /**
   * Remove item with optional caller ownership validation
   */
  static async removeItem(
    itemId: string,
    userId?: string | null,
    sessionId?: string | null
  ): Promise<void> {
    if (userId !== undefined || sessionId !== undefined) {
      await this.verifyItemOwnership(itemId, userId || null, sessionId || null);
    }
    await CartRepository.removeItem(itemId);
  }

  /**
   * Clear cart with optional caller ownership validation
   */
  static async clearCart(
    cartId: string,
    userId?: string | null,
    sessionId?: string | null
  ): Promise<void> {
    if (userId || sessionId) {
      const cart = await CartRepository.getCart(userId, sessionId);
      if (!cart || cart.id !== cartId) {
        throw new Error("Unauthorized: cannot clear a cart that does not belong to you");
      }
    }
    await CartRepository.clearCart(cartId);
  }

  /**
   * Merge guest cart to user cart
   */
  static async mergeGuestCart(
    sessionId: string,
    userId: string
  ): Promise<void> {
    await CartRepository.mergeCart(sessionId, userId);
  }

  /**
   * Verify that a cart item belongs to the calling user's cart.
   * Throws if the item is not found or belongs to a different user.
   */
  static async verifyItemOwnership(
    itemId: string,
    userId: string | null,
    sessionId: string | null
  ): Promise<void> {
    const cart = await CartRepository.getCart(userId, sessionId);
    if (!cart) {
      throw new Error("Cart not found");
    }
    const itemBelongsToCart = cart.items?.some(
      (item: any) => item.id === itemId
    );
    if (!itemBelongsToCart) {
      throw new Error("Unauthorized: cart item does not belong to your cart");
    }
  }
}
