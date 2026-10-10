export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  thumbnail: string;
  category_id: string;
  brand_id?: string;
  sku: string;
  inStock: boolean;
  inventoryLevel: number;
  options: ProductOption[];
  variants: ProductVariant[];
  rating: number;
  reviewsCount: number;
  isNew?: boolean;
  isTrending?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductOption {
  id: string;
  name: string; // e.g., 'Color', 'Size'
  values: string[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  attributes: Record<string, string>; // e.g., { Color: 'Red', Size: 'M' }
  inventoryLevel: number;
  image?: string;
}
