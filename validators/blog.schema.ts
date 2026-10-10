import { z } from "zod";

export const blogCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255),
  description: z.string().nullable().optional(),
});

export const blogTagSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255),
});

export const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255),
  excerpt: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  category_id: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() !== "" && val !== "general" ? val : null)),
  author_id: z.string().nullable().optional(),
  featured_image: z.string().nullable().optional(),
  cover_image: z.string().nullable().optional(),
  status: z
    .enum(["draft", "scheduled", "published", "archived"])
    .default("draft"),
  reading_time_minutes: z.number().nullable().optional(),
  published_at: z.coerce.date().nullable().optional(),
});



