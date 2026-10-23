"use server";

import { CartService } from "../services/cart.service";
import { auth, getServerSession } from "@/lib/auth/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getSessionIdentifiers() {
  const { user } = await getServerSession();

  const cookieStore = await cookies();
  let guestSessionId = cookieStore.get("af_guest_session")?.value;

  // Auto-merge: If user is authenticated and there is a pending guest session cookie,
  // merge the guest cart into the user's persistent cart automatically and clear the cookie.
  if (user && guestSessionId) {
    try {
      await CartService.mergeGuestCart(guestSessionId, user.id);
      cookieStore.delete("af_guest_session");
      guestSessionId = undefined;
    } catch (mergeErr) {
      console.error("Auto-merge guest cart error:", mergeErr);
    }
  }

  // If user is guest and doesn't have a session ID yet, generate one
  if (!user && !guestSessionId) {
    guestSessionId = crypto.randomUUID();
    cookieStore.set("af_guest_session", guestSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return {
    userId: user?.id || null,
    sessionId: user ? null : (guestSessionId || null),
  };
}

export async function fetchCartAction() {
  try {
    const { userId, sessionId } = await getSessionIdentifiers();
    const cart = await CartService.getOrCreateCart(userId, sessionId);
    return { success: true, cart };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addToCartAction(
  productId: string,
  variantId: string | null,
  quantity: number
) {
  try {
    const { userId, sessionId } = await getSessionIdentifiers();
    if (!userId && !sessionId) {
      return { success: false, error: "Unable to initialize shopping bag session." };
    }
    await CartService.addItem(
      userId,
      sessionId,
      productId,
      variantId,
      quantity
    );
    revalidatePath("/cart");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCartItemQuantityAction(
  itemId: string,
  quantity: number
) {
  try {
    const { userId, sessionId } = await getSessionIdentifiers();
    // Ownership check: make sure this item belongs to the caller's cart
    await CartService.verifyItemOwnership(itemId, userId, sessionId);
    await CartService.updateQuantity(itemId, quantity);
    revalidatePath("/cart");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeFromCartAction(itemId: string) {
  try {
    const { userId, sessionId } = await getSessionIdentifiers();
    // Ownership check: make sure this item belongs to the caller's cart
    await CartService.removeItem(itemId, userId, sessionId);
    revalidatePath("/cart");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function clearCartAction(cartId?: string) {
  try {
    const { userId, sessionId } = await getSessionIdentifiers();
    const cart = await CartService.getOrCreateCart(userId, sessionId, cartId);
    if (cart) {
      await CartService.clearCart(cart.id, userId, sessionId);
    }
    revalidatePath("/cart");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function mergeGuestCartAction() {
  try {
    const { user } = await getServerSession();

    if (!user) return { success: false, error: "User not logged in" };

    const cookieStore = await cookies();
    const guestSessionId = cookieStore.get("af_guest_session")?.value;

    if (guestSessionId) {
      await CartService.mergeGuestCart(guestSessionId, user.id);
      cookieStore.delete("af_guest_session");
    }
    revalidatePath("/cart");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function logoutCartAction() {
  try {
    const cookieStore = await cookies();
    // Delete any stale guest session cookie on explicit logout
    cookieStore.delete("af_guest_session");
    revalidatePath("/cart");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
