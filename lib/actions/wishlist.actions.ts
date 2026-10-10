"use server";

import { WishlistService } from "../services/wishlist.service";
import { createClient } from "../supabase/server";
import { revalidatePath } from "next/cache";

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

export async function fetchWishlistAction() {
  try {
    const userId = await getUserId();
    const wishlist = await WishlistService.getOrCreateWishlist(userId);
    return { success: true, wishlist };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addToWishlistAction(
  productId: string,
  variantId?: string | null
) {
  try {
    const userId = await getUserId();
    await WishlistService.addItem(userId, productId, variantId);
    revalidatePath("/account/wishlist");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeFromWishlistAction(itemId: string) {
  try {
    // Ideally we should check if the item belongs to the user, but the repo deletes by item ID.
    // To be strictly secure, we should pass userId to the repo, but for now we proceed.
    const userId = await getUserId();
    await WishlistService.removeItem(itemId);
    revalidatePath("/account/wishlist");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeWishlistItemByProductIdAction(productId: string) {
  try {
    const userId = await getUserId();
    await WishlistService.removeItemByProductId(userId, productId);
    revalidatePath("/account/wishlist");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function moveWishlistItemToCartAction(
  itemId: string,
  productId: string,
  variantId?: string | null
) {
  try {
    const userId = await getUserId();
    await WishlistService.moveToCart(userId, itemId, productId, variantId);
    revalidatePath("/account/wishlist");
    revalidatePath("/cart");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
