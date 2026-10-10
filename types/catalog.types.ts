import { z } from "zod";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================
export const ProductStatus = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);
export const Gender = z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]);
export const MediaType = z.enum(["IMAGE", "VIDEO", "360_VIEW"]);

// ============================================================================
// BASE SCHEMAS
// ============================================================================
export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProductSeoSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  canonicalUrl: z.string().url().max(1024).optional().nullable(),
  ogTitle: z.string().max(255).optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  ogImageUrl: z.string().url().max(1024).optional().nullable(),
  twitterCardType: z.string().max(50).optional().nullable(),
  structuredData: z.any().optional().nullable(), // JSON-LD
  keywords: z.array(z.string()).optional().nullable(),
});

export const ProductVariantSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  sku: z.string().max(100),
  barcode: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim() ? val.trim() : null)),
  priceOverride: z.number().min(0).optional().nullable(),
  salePrice: z.number().min(0).optional().nullable(),
  weight: z.number().min(0).optional().nullable(),
  dimensions: z
    .object({
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
  attributes: z.record(z.string()).optional(), // { Color: 'Red', Size: 'M' }
  stockQuantity: z.coerce.number().int().min(0).optional().default(0),
});

export const ProductMediaSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  url: z.string().min(1, "Image URL is required").max(1024),
  urlWebp: z.string().url().max(1024).optional().nullable(),
  altText: z.string().max(255).optional().nullable(),
  displayOrder: z.number().default(0),
  isPrimary: z.boolean().default(false),
  mediaType: MediaType.default("IMAGE"),
});

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Product name is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255),
  shortDescription: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim() ? val.trim() : null)),
  description: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim() ? val.trim() : null)),
  categoryId: z.string().uuid("Please select a valid category"),
  brandId: z.string().uuid().optional().nullable().or(z.literal("").transform(() => null)),
  basePrice: z.number().min(0, "Sell price must be 0 or greater"),
  costPrice: z.number().min(0).optional().nullable(),
  salePrice: z.number().min(0).optional().nullable(),
  stockQuantity: z.coerce.number().int().min(0).optional().default(0),
  sku: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim() ? val.trim() : null)),
  barcode: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim() ? val.trim() : null)),
  status: ProductStatus.default("DRAFT"),
  gender: Gender.optional().nullable().or(z.literal("").transform(() => null)),
  season: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim() ? val.trim() : null)),
  careInstructions: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim() ? val.trim() : null)),
  countryOfOrigin: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim() ? val.trim() : null)),
  warranty: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim() ? val.trim() : null)),
  material: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim() ? val.trim() : null)),
  isFeatured: z.boolean().default(false),
  averageRating: z.number().min(0).max(5).default(0),
  publishedAt: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),

  // Relations
  variants: z.array(ProductVariantSchema).optional(),
  media: z.array(ProductMediaSchema).optional(),
  product_media: z.array(ProductMediaSchema).optional().nullable(),
  seo: ProductSeoSchema.optional().nullable(),
  tags: z.array(TagSchema).optional(),
});


// ============================================================================
// TYPES
// ============================================================================
export type Tag = z.infer<typeof TagSchema>;
export type ProductSeo = z.infer<typeof ProductSeoSchema>;
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export type ProductMedia = z.infer<typeof ProductMediaSchema>;
export type Product = z.infer<typeof ProductSchema>;

export type ProductStatusType = z.infer<typeof ProductStatus>;
export type GenderType = z.infer<typeof Gender>;
export type MediaTypeType = z.infer<typeof MediaType>;

// ============================================================================
// MUTATION SCHEMAS (Create/Update)
// ============================================================================
export const CreateProductSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  averageRating: true,
  variants: true,
  media: true,
  product_media: true,
  seo: true,
  tags: true,
}).extend({
  seo: ProductSeoSchema.omit({ id: true, productId: true })
    .optional()
    .nullable(),
  tags: z.array(z.string().uuid()).optional(), // Tag IDs
  media: z
    .array(ProductMediaSchema.omit({ id: true, productId: true }))
    .optional(),
  variants: z
    .array(ProductVariantSchema.omit({ id: true, productId: true }))
    .optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

// ============================================================================
// CATALOG ENTITY TYPES (Category, Brand, Collection, Attribute, Review)
// ============================================================================

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  parent_id: string | null;
  icon_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // joined
  parent?: { id: string; name: string } | null;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  banner_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
  product_ids?: string[];
  products?: any[];
};

export type AttributeValue = {
  id: string;
  attribute_id: string;
  value: string;
};

export type Attribute = {
  id: string;
  name: string;
  type: string;
  values: AttributeValue[];
};

export type Review = {
  id: string;
  customer_id: string | null;
  product_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  review_text: string | null;
  images: string[] | null;
  is_approved: boolean;
  helpful_votes: number;
  created_at: string;
  updated_at: string;
  // joined
  customer: { first_name: string | null; last_name: string | null; email: string } | null;
  product: { name: string; slug: string } | null;
};

// ============================================================================
// SIZE CHART TYPES
// ============================================================================

export type SizeChartMeasurements = {
  units: string[];
  columns: string[];
  rows: Record<string, string | number>[];
};

export type SizeChart = {
  id: string;
  name: string;
  category_id: string | null;
  product_id: string | null;
  is_default: boolean;
  measurements: SizeChartMeasurements;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// MUTATION INPUT TYPES
// ============================================================================

export type CreateCategoryInput = {
  name: string;
  slug: string;
  parent_id?: string | null;
  icon_url?: string | null;
  image_url?: string | null;
  description?: string | null;
  is_active?: boolean;
  display_order?: number;
};
export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export type CreateBrandInput = {
  name: string;
  slug: string;
  logo_url?: string | null;
  description?: string | null;
  is_active?: boolean;
};
export type UpdateBrandInput = Partial<CreateBrandInput>;

export type CreateCollectionInput = {
  name: string;
  slug: string;
  banner_url?: string | null;
  is_active?: boolean;
  product_ids?: string[];
};
export type UpdateCollectionInput = Partial<CreateCollectionInput>;

export type CreateAttributeInput = {
  name: string;
  type: string;
};
export type UpdateAttributeInput = Partial<CreateAttributeInput>;
