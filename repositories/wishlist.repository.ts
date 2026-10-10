import { createClient } from "@/lib/supabase/server-client";
import { Wishlist, WishlistItem } from "@/types/checkout.types";

export class WishlistRepository {
  /**
   * Fetch wishlist by user ID
   */
  async getWishlistByUserId(userId: string): Promise<Wishlist | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wishlists")
      .select(
        `
        *,
        items:wishlist_items(
          *,
          product:products(id, name, slug, base_price, sale_price, product_media(url, is_primary))
        )
      `
      )
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      console.error("Error fetching wishlist:", error);
      throw new Error("Failed to fetch wishlist");
    }

    return data as Wishlist;
  }

  /**
   * Create a new wishlist
   */
  async createWishlist(userId: string): Promise<Wishlist> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wishlists")
      .insert({
        user_id: userId,
        is_public: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating wishlist:", error);
      throw new Error("Failed to create wishlist");
    }

    return data as Wishlist;
  }

  /**
   * Add item to wishlist
   */
  async addItem(wishlistId: string, productId: string): Promise<WishlistItem> {
    const supabase = await createClient();

    // Check if exists
    const { data: existing } = await supabase
      .from("wishlist_items")
      .select("id")
      .eq("wishlist_id", wishlistId)
      .eq("product_id", productId)
      .single();

    if (existing) {
      return existing as WishlistItem; // Already added
    }

    const { data, error } = await supabase
      .from("wishlist_items")
      .insert({
        wishlist_id: wishlistId,
        product_id: productId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding wishlist item:", error);
      throw new Error("Failed to add item to wishlist");
    }

    return data as WishlistItem;
  }

  /**
   * Remove item from wishlist
   */
  async removeItem(itemId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", itemId);

    if (error) {
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
    const supabase = await createClient();
    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("wishlist_id", wishlistId)
      .eq("product_id", productId);

    if (error) {
      console.error("Error removing wishlist item by product id:", error);
      throw new Error("Failed to remove item from wishlist");
    }
  }
}
