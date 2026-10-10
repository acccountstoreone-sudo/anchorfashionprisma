import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartState, CartItem } from "../types/cart";

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      totalItems: 0,
      subtotal: 0,

      addItem: (item: CartItem) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (i) => i.id === item.id
          );
          const newItems = [...state.items];

          if (existingItemIndex >= 0) {
            newItems[existingItemIndex].quantity += item.quantity;
          } else {
            newItems.push(item);
          }

          const totalItems = newItems.reduce(
            (acc, curr) => acc + curr.quantity,
            0
          );
          const subtotal = newItems.reduce(
            (acc, curr) => acc + curr.product.price * curr.quantity,
            0
          );

          return { items: newItems, totalItems, subtotal, isOpen: true };
        });
      },

      removeItem: (id: string) => {
        set((state) => {
          const newItems = state.items.filter((i) => i.id !== id);
          const totalItems = newItems.reduce(
            (acc, curr) => acc + curr.quantity,
            0
          );
          const subtotal = newItems.reduce(
            (acc, curr) => acc + curr.product.price * curr.quantity,
            0
          );

          return { items: newItems, totalItems, subtotal };
        });
      },

      updateQuantity: (id: string, quantity: number) => {
        set((state) => {
          if (quantity <= 0) {
            return get().removeItem(id) as any;
          }

          const newItems = state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          );
          const totalItems = newItems.reduce(
            (acc, curr) => acc + curr.quantity,
            0
          );
          const subtotal = newItems.reduce(
            (acc, curr) => acc + curr.product.price * curr.quantity,
            0
          );

          return { items: newItems, totalItems, subtotal };
        });
      },

      clearCart: () => set({ items: [], totalItems: 0, subtotal: 0 }),
      toggleCart: (isOpen?: boolean) =>
        set((state) => ({
          isOpen: isOpen !== undefined ? isOpen : !state.isOpen,
        })),
    }),
    {
      name: "anchor-fashion-cart",
    }
  )
);
