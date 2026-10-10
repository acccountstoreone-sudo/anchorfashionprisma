import { CartRepository as LibCartRepository } from "@/lib/repositories/cart.repository";
import { Cart, CartItem } from "@/types/checkout.types";

export class CartRepository {
  async getCartById(cartId: string): Promise<Cart | null> {
    return await LibCartRepository.getCartById(cartId);
  }

  async getCartByUserId(userId: string): Promise<Cart | null> {
    return await LibCartRepository.getCart(userId);
  }

  async createCart(userId?: string, sessionId?: string): Promise<Cart> {
    return await LibCartRepository.createCart(userId, sessionId);
  }

  async mergeCart(sessionIdOrGuestCartId: string, userId: string): Promise<void> {
    return await LibCartRepository.mergeCart(sessionIdOrGuestCartId, userId);
  }

  async addItem(
    cartId: string,
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<any> {
    await LibCartRepository.addItem(cartId, productId, variantId || null, quantity);
    const cart = await LibCartRepository.getCartById(cartId);
    return cart?.items?.[cart.items.length - 1];
  }

  async updateItemQuantity(itemId: string, quantity: number): Promise<any> {
    await LibCartRepository.updateItemQuantity(itemId, quantity);
  }

  async removeItem(itemId: string): Promise<void> {
    await LibCartRepository.removeItem(itemId);
  }

  async clearCart(cartId: string): Promise<void> {
    await LibCartRepository.clearCart(cartId);
  }
}

