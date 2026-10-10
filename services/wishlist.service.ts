import { WishlistRepository } from "@/repositories/wishlist.repository";
import { Wishlist, WishlistItem } from "@/types/checkout.types";
import { CartService } from "./cart.service";

export class WishlistService {
  private wishlistRepository: WishlistRepository;
  private cartService: CartService;

  constructor() {
    this.wishlistRepository = new WishlistRepository();
    this.cartService = new CartService();
  }

  async getWishlist(userId: string): Promise<Wishlist | null> {
    return await this.wishlistRepository.getWishlistByUserId(userId);
  }

  async initializeWishlist(userId: string): Promise<Wishlist> {
    const existing = await this.wishlistRepository.getWishlistByUserId(userId);
    if (existing) return existing;
    return await this.wishlistRepository.createWishlist(userId);
  }

  async addToWishlist(
    userId: string,
    productId: string
  ): Promise<WishlistItem> {
    const wishlist = await this.initializeWishlist(userId);
    return await this.wishlistRepository.addItem(wishlist.id, productId);
  }

  async removeFromWishlist(itemId: string): Promise<void> {
    await this.wishlistRepository.removeItem(itemId);
  }

  async moveToCart(
    userId: string,
    cartId: string,
    productId: string,
    wishlistId: string
  ): Promise<void> {
    // 1. Add to cart
    await this.cartService.addToCart(cartId, productId, 1);

    // 2. Remove from wishlist
    await this.wishlistRepository.removeItemByProductId(wishlistId, productId);
  }
}
