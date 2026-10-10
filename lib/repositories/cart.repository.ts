import { prisma } from "@/lib/prisma";
import { Cart, CartItem } from "@/types/checkout.types";

export class CartRepository {
  /**
   * Get a cart by User ID, Session ID, or direct Cart ID
   */
  static async getCart(
    userId?: string | null,
    sessionId?: string | null,
    cartId?: string | null
  ): Promise<Cart | null> {
    if (!userId && !sessionId && !cartId) {
      return null;
    }

    try {
      const includeClause = {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                basePrice: true,
                salePrice: true,
                sku: true,
                imageUrl: true,
                media: {
                  select: {
                    url: true,
                    isPrimary: true,
                    displayOrder: true,
                  },
                  orderBy: { displayOrder: "asc" as const },
                },
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                priceOverride: true,
                salePrice: true,
                attributes: true,
                isActive: true,
                inventoryLevels: {
                  select: {
                    quantityAvailable: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" as const },
        },
      };

      let cart = null;
      if (cartId) {
        cart = await prisma.cart.findUnique({
          where: { id: cartId },
          include: includeClause,
        });
      } else if (userId) {
        cart = await prisma.cart.findUnique({
          where: { userId },
          include: includeClause,
        });
      } else if (sessionId) {
        cart = await prisma.cart.findFirst({
          where: { sessionId },
          orderBy: { updatedAt: "desc" },
          include: includeClause,
        });
      }

      if (!cart) return null;

      let activePromoDiscount: number | null = null;
      try {
        const { PromotionRepository } = await import(
          "@/lib/repositories/marketing/promotion.repository"
        );
        const bestPromo = await PromotionRepository.getBestActivePromotion();
        if (bestPromo && bestPromo.discount_percentage > 0) {
          activePromoDiscount = bestPromo.discount_percentage;
        }
      } catch {
        activePromoDiscount = null;
      }

      const items: CartItem[] = (cart.items || []).map((item) => {
        const prod = item.product;
        const variant = item.variant;
        const prodBasePrice = prod ? Number(prod.basePrice) : 0;
        let prodSalePrice = prod?.salePrice ? Number(prod.salePrice) : null;
        let variantPrice = variant?.priceOverride ? Number(variant.priceOverride) : prodBasePrice;
        let variantSalePrice = variant?.salePrice ? Number(variant.salePrice) : null;

        if (activePromoDiscount && activePromoDiscount > 0) {
          const promoDiscountedPrice = Math.round(prodBasePrice * (1 - activePromoDiscount / 100));
          if (prodSalePrice === null || promoDiscountedPrice < prodSalePrice) {
            prodSalePrice = promoDiscountedPrice;
          }
          if (variantSalePrice === null || promoDiscountedPrice < variantSalePrice) {
            variantSalePrice = promoDiscountedPrice;
          }
        }

        const mainImageUrl =
          prod?.media?.find((m) => m.isPrimary)?.url ||
          prod?.media?.[0]?.url ||
          prod?.imageUrl ||
          null;

        const stockQuantity = (variant?.inventoryLevels || []).reduce(
          (sum, lvl) => sum + (lvl.quantityAvailable || 0),
          0
        );

        return {
          id: item.id,
          cart_id: item.cartId,
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity,
          created_at: item.createdAt.toISOString(),
          updated_at: item.updatedAt.toISOString(),
          product: prod
            ? {
                id: prod.id,
                title: prod.name,
                name: prod.name,
                slug: prod.slug,
                price: prodBasePrice,
                base_price: prodBasePrice,
                sale_price: prodSalePrice,
                main_image_url: mainImageUrl,
                imageUrl: mainImageUrl,
                stock_quantity: stockQuantity,
                sku: prod.sku,
              }
            : undefined,
          variant: variant
            ? {
                id: variant.id,
                sku: variant.sku,
                price: variantPrice,
                price_override: variant.priceOverride ? Number(variant.priceOverride) : null,
                sale_price: variantSalePrice,
                stock_quantity: stockQuantity,
                attributes: (variant.attributes as Record<string, string>) || {},
                is_active: variant.isActive,
              }
            : undefined,
        };
      });

      return {
        id: cart.id,
        user_id: cart.userId,
        session_id: cart.sessionId,
        created_at: cart.createdAt.toISOString(),
        updated_at: cart.updatedAt.toISOString(),
        items,
      } as Cart;
    } catch (error: any) {
      console.error("CartRepository.getCart error:", error);
      throw new Error(`Failed to fetch cart: ${error.message}`);
    }
  }

  /**
   * Fetch cart specifically by its unique ID
   */
  static async getCartById(cartId: string): Promise<Cart | null> {
    return await this.getCart(null, null, cartId);
  }

  /**
   * Create a new cart
   */
  static async createCart(
    userId?: string | null,
    sessionId?: string | null
  ): Promise<Cart> {
    try {
      if (userId) {
        const existing = await this.getCart(userId);
        if (existing) return existing;
      } else if (sessionId) {
        const existing = await this.getCart(null, sessionId);
        if (existing) return existing;
      }

      const newCart = await prisma.cart.create({
        data: {
          userId: userId || null,
          sessionId: sessionId || null,
        },
      });

      return {
        id: newCart.id,
        user_id: newCart.userId,
        session_id: newCart.sessionId,
        created_at: newCart.createdAt.toISOString(),
        updated_at: newCart.updatedAt.toISOString(),
        items: [],
      } as Cart;
    } catch (err: any) {
      if (userId) {
        const existing = await this.getCart(userId);
        if (existing) return existing;
      }
      throw new Error(`Failed to create cart: ${err.message}`);
    }
  }

  /**
   * Merge guest cart into user cart
   */
  static async mergeCart(sessionId: string, userId: string): Promise<void> {
    if (!sessionId || !userId) return;

    try {
      const guestCart = await prisma.cart.findFirst({
        where: { sessionId },
        include: { items: true },
      });

      if (!guestCart || !guestCart.items || guestCart.items.length === 0) {
        if (guestCart?.id) {
          await prisma.cart.delete({ where: { id: guestCart.id } }).catch(() => {});
        }
        return;
      }

      let userCart = await prisma.cart.findUnique({
        where: { userId },
        include: { items: true },
      });

      if (!userCart) {
        await prisma.cart.update({
          where: { id: guestCart.id },
          data: {
            userId,
            sessionId: null,
          },
        });
        return;
      }

      for (const item of guestCart.items) {
        if (!item.variantId) continue;

        const variant = await prisma.variant.findUnique({
          where: { id: item.variantId },
          select: {
            isActive: true,
            inventoryLevels: { select: { quantityAvailable: true } },
          },
        });

        if (!variant || !variant.isActive) continue;

        const totalAvailable = (variant.inventoryLevels || []).reduce(
          (sum, lvl) => sum + (lvl.quantityAvailable || 0),
          0
        );

        if (totalAvailable <= 0) continue;

        const existingItem = userCart.items?.find((i) => i.variantId === item.variantId);
        let targetQuantity = item.quantity;
        if (existingItem) {
          targetQuantity += existingItem.quantity;
        }
        targetQuantity = Math.min(targetQuantity, totalAvailable);
        if (targetQuantity <= 0) continue;

        if (existingItem) {
          await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: targetQuantity },
          });
        } else {
          await prisma.cartItem.create({
            data: {
              cartId: userCart.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: targetQuantity,
            },
          });
        }
      }

      await prisma.cart.update({
        where: { id: userCart.id },
        data: { updatedAt: new Date() },
      }).catch(() => {});

      await prisma.cart.delete({ where: { id: guestCart.id } }).catch(() => {});
    } catch (err) {
      console.error("CartRepository.mergeCart error:", err);
    }
  }

  /**
   * Add item to cart
   */
  static async addItem(
    cartId: string,
    productId: string,
    variantId: string | null,
    quantity: number
  ): Promise<void> {
    if (!variantId) {
      throw new Error("A valid variant ID is required to add an item to the cart.");
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId,
        variantId,
      },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId,
          productId,
          variantId,
          quantity,
        },
      });
    }

    await prisma.cart.update({
      where: { id: cartId },
      data: { updatedAt: new Date() },
    }).catch(() => {});
  }

  /**
   * Update item quantity
   */
  static async updateItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<void> {
    if (quantity <= 0) {
      await this.removeItem(itemId);
      return;
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  /**
   * Remove item from cart
   */
  static async removeItem(itemId: string): Promise<void> {
    await prisma.cartItem.delete({
      where: { id: itemId },
    }).catch(() => {});
  }

  /**
   * Clear cart
   */
  static async clearCart(cartId: string): Promise<void> {
    await prisma.cartItem.deleteMany({
      where: { cartId },
    }).catch(() => {});
  }
}
