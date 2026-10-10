import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Cart, CartItem } from "@/types/checkout.types";
import {
  fetchCartAction,
  addToCartAction,
  updateCartItemQuantityAction,
  removeFromCartAction,
  clearCartAction,
} from "@/lib/actions/cart.actions";

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  isSheetOpen: boolean;

  setSheetOpen: (open: boolean) => void;
  fetchCart: () => Promise<void>;
  addItem: (
    productId: string,
    variantId: string | null,
    quantity: number
  ) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isLoading: false,
      error: null,
      isSheetOpen: false,

      setSheetOpen: (open) => set({ isSheetOpen: open }),

      fetchCart: async () => {
        set({ isLoading: true, error: null });
        const res = await fetchCartAction();
        if (res.success) {
          set({ cart: res.cart, isLoading: false });
        } else {
          set({ error: res.error, isLoading: false });
        }
      },

      addItem: async (productId, variantId, quantity) => {
        set({ isLoading: true, error: null });
        // Optimistic UI could be implemented here
        const res = await addToCartAction(productId, variantId, quantity);
        if (res.success) {
          await get().fetchCart(); // Refresh cart
          set({ isSheetOpen: true }); // Open cart sheet on add
        } else {
          set({ error: res.error, isLoading: false });
        }
      },

      updateQuantity: async (itemId, quantity) => {
        set({ isLoading: true, error: null });
        const res = await updateCartItemQuantityAction(itemId, quantity);
        if (res.success) {
          await get().fetchCart();
        } else {
          set({ error: res.error, isLoading: false });
        }
      },

      removeItem: async (itemId) => {
        set({ isLoading: true, error: null });
        const res = await removeFromCartAction(itemId);
        if (res.success) {
          await get().fetchCart();
        } else {
          set({ error: res.error, isLoading: false });
        }
      },

      clearCart: async () => {
        const cart = get().cart;
        if (!cart) return;
        set({ isLoading: true, error: null });
        const res = await clearCartAction(cart.id);
        if (res.success) {
          set({ cart: { ...cart, items: [] }, isLoading: false });
        } else {
          set({ error: res.error, isLoading: false });
        }
      },
    }),
    {
      name: "af-cart-storage", // only stores simple ui state, cart is fetched from server
      partialize: (state) => ({ isSheetOpen: state.isSheetOpen }), // don't persist cart data here, server is source of truth
    }
  )
);
