import { z } from "zod";

export const PaginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export const SortSchema = z.object({
  column: z.string(),
  ascending: z.boolean().optional().default(true),
});

export const SearchSchema = z.object({
  query: z.string().min(1).max(255).optional(),
});

export const UuidSchema = z.string().uuid();

export const DateRangeSchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    { message: "'from' date must be before 'to' date" }
  );
