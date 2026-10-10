import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Wishlist, WishlistItem } from "@/types/checkout.types";
import {
  fetchWishlistAction,
  addToWishlistAction,
  removeFromWishlistAction,
  removeWishlistItemByProductIdAction,
  moveWishlistItemToCartAction,
} from "@/lib/actions/wishlist.actions";

interface WishlistState {
  wishlist: Wishlist | null;
  isLoading: boolean;
  error: string | null;

  fetchWishlist: () => Promise<void>;
  addItem: (productId: string, variantId?: string | null) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  removeItemByProductId: (productId: string) => Promise<void>;
  moveToCart: (
    itemId: string,
    productId: string,
    variantId?: string | null
  ) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      wishlist: null,
      isLoading: false,
      error: null,

      fetchWishlist: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetchWishlistAction();
          if (res.success && res.wishlist) {
            set({ wishlist: res.wishlist, isLoading: false });
          } else {
            // If unauthorized (guest), keep existing local wishlist items
            set({ error: res.error, isLoading: false });
          }
        } catch (err: any) {
          set({ error: err?.message || "Failed to fetch wishlist", isLoading: false });
        }
      },

      addItem: async (productId, variantId) => {
        const currentWishlist = get().wishlist;
        const currentItems = currentWishlist?.items || [];

        // Check if already in wishlist
        const alreadyExists = currentItems.some(
          (item) => item.product_id === productId
        );
        if (alreadyExists) return;

        // Optimistic update
        const tempItem: WishlistItem = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          wishlist_id: currentWishlist?.id || "local-wishlist",
          product_id: productId,
          created_at: new Date().toISOString(),
        };

        const updatedWishlist: Wishlist = {
          id: currentWishlist?.id || "local-wishlist",
          user_id: currentWishlist?.user_id || "",
          is_public: currentWishlist?.is_public || false,
          created_at: currentWishlist?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [...currentItems, tempItem],
        };

        set({ wishlist: updatedWishlist, error: null });

        try {
          const res = await addToWishlistAction(productId, variantId);
          if (res.success) {
            // Background sync with database
            const fetchRes = await fetchWishlistAction();
            if (fetchRes.success && fetchRes.wishlist) {
              set({ wishlist: fetchRes.wishlist });
            }
          }
        } catch {
          // If server call fails (e.g. guest or network), the optimistic local item remains
        }
      },

      removeItem: async (itemId) => {
        const currentWishlist = get().wishlist;
        if (!currentWishlist) return;

        const previousItems = currentWishlist.items || [];
        const updatedItems = previousItems.filter((item) => item.id !== itemId);

        // Optimistic update
        set({
          wishlist: {
            ...currentWishlist,
            items: updatedItems,
          },
        });

        try {
          const res = await removeFromWishlistAction(itemId);
          if (res.success) {
            const fetchRes = await fetchWishlistAction();
            if (fetchRes.success && fetchRes.wishlist) {
              set({ wishlist: fetchRes.wishlist });
            }
          }
        } catch {
          // If server delete fails and wasn't a temp item, revert
          if (!itemId.startsWith("temp-")) {
            set({
              wishlist: {
                ...currentWishlist,
                items: previousItems,
              },
            });
          }
        }
      },

      removeItemByProductId: async (productId) => {
        const currentWishlist = get().wishlist;
        if (!currentWishlist) return;

        const previousItems = currentWishlist.items || [];
        const updatedItems = previousItems.filter(
          (item) => item.product_id !== productId
        );

        // Optimistic update
        set({
          wishlist: {
            ...currentWishlist,
            items: updatedItems,
          },
        });

        try {
          const res = await removeWishlistItemByProductIdAction(productId);
          if (res.success) {
            const fetchRes = await fetchWishlistAction();
            if (fetchRes.success && fetchRes.wishlist) {
              set({ wishlist: fetchRes.wishlist });
            }
          }
        } catch {
          // If server error, revert
          set({
            wishlist: {
              ...currentWishlist,
              items: previousItems,
            },
          });
        }
      },

      moveToCart: async (itemId, productId, variantId) => {
        set({ isLoading: true, error: null });
        const currentWishlist = get().wishlist;
        const previousItems = currentWishlist?.items || [];

        // Optimistically remove item from wishlist UI
        if (currentWishlist) {
          set({
            wishlist: {
              ...currentWishlist,
              items: previousItems.filter((item) => item.id !== itemId),
            },
          });
        }

        try {
          const res = await moveWishlistItemToCartAction(
            itemId,
            productId,
            variantId
          );
          if (res.success) {
            set({ isLoading: false });
            await get().fetchWishlist();
          } else {
            // Revert on server error
            if (currentWishlist) {
              set({
                wishlist: {
                  ...currentWishlist,
                  items: previousItems,
                },
                error: res.error,
                isLoading: false,
              });
            }
            throw new Error(res.error || "Failed to move item to cart");
          }
        } catch (err: any) {
          if (currentWishlist) {
            set({
              wishlist: {
                ...currentWishlist,
                items: previousItems,
              },
              error: err?.message || "Failed to move item to cart",
              isLoading: false,
            });
          }
          throw err;
        }
      },
    }),
    {
      name: "af-wishlist-storage",
      partialize: (state) => ({ wishlist: state.wishlist }),
    }
  )
);
