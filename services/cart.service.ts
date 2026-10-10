import { CartService as LibCartService } from "@/lib/services/cart.service";
import { Cart, CartItem } from "@/types/checkout.types";

export class CartService {
  async getCart(cartId: string): Promise<Cart | null> {
    return await LibCartService.getOrCreateCart(null, null, cartId);
  }

  async getCartByUser(userId: string): Promise<Cart | null> {
    return await LibCartService.getOrCreateCart(userId);
  }

  async initializeCart(userId?: string, sessionId?: string): Promise<Cart> {
    return await LibCartService.getOrCreateCart(userId, sessionId);
  }

  async addToCart(
    cartId: string,
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<any> {
    await LibCartService.addItem(null, cartId, productId, variantId || null, quantity);
    const cart = await LibCartService.getOrCreateCart(null, null, cartId);
    return cart.items?.[cart.items.length - 1];
  }

  async updateQuantity(itemId: string, quantity: number): Promise<any> {
    await LibCartService.updateQuantity(itemId, quantity);
  }

  async removeFromCart(itemId: string): Promise<void> {
    await LibCartService.removeItem(itemId);
  }

  async clearCart(cartId: string): Promise<void> {
    await LibCartService.clearCart(cartId);
  }

  async mergeGuestCart(guestCartId: string, userId: string): Promise<void> {
    await LibCartService.mergeGuestCart(guestCartId, userId);
  }
}

