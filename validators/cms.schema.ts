import { z } from "zod";

export const cmsPageSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255),
  status: z
    .preprocess(
      (val) => (typeof val === "string" ? val.toUpperCase() : val),
      z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
    )
    .default("DRAFT"),
  template: z.string().optional().default("default"),
  seo_metadata: z.record(z.any()).optional(),
  published_at: z.date().nullable().optional(),
});

export const cmsSectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: z.string().min(1, "Type is required").max(100),
  content: z.record(z.any()).default({}),
  is_global: z.boolean().default(false),
});

export const cmsNavigationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  location: z.string().min(1, "Location is required").max(100),
  items: z
    .array(
      z.object({
        label: z.string(),
        url: z.string(),
        target: z.string().optional(),
        children: z.array(z.any()).optional(),
      })
    )
    .default([]),
});
