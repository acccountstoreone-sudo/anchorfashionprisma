import { Product } from "./product";

export interface CartItem {
  id: string; // Unique ID for the cart item (usually product.id + variants)
  productId: string;
  variantId?: string;
  product: Product;
  quantity: number;
  attributes?: Record<string, string>;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  subtotal: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: (isOpen?: boolean) => void;
}
