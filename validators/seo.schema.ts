import { z } from "zod";

export const seoMetadataSchema = z.object({
  entity_type: z.string().min(1, "Entity type is required").max(50),
  entity_id: z.string().uuid(),
  title: z.string().max(255).nullable().optional(),
  description: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  canonical_url: z.string().max(500).nullable().optional(),
  og_title: z.string().max(255).nullable().optional(),
  og_description: z.string().nullable().optional(),
  og_image: z.string().uuid().nullable().optional(),
  twitter_card: z.string().max(50).default("summary_large_image"),
  noindex: z.boolean().default(false),
  json_ld: z.record(z.any()).nullable().optional(),
});
