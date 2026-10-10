import { z } from "zod";

export const campaignAudienceSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().nullable().optional(),
  segment_criteria: z.record(z.any()).default({}),
});

export const campaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: z.enum(["email", "sms", "push", "drip"]),
  status: z
    .enum(["draft", "scheduled", "running", "completed", "paused"])
    .default("draft"),
  audience_id: z.string().uuid().nullable().optional(),
  subject: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  schedule_time: z.date().nullable().optional(),
  created_by: z.string().uuid(),
});

export const dynamicFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: z.string().min(1, "Type is required").max(50),
  fields: z.array(z.record(z.any())).default([]),
  success_message: z.string().nullable().optional(),
  redirect_url: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const promotionSchema = z
  .object({
    name: z.string().min(2, "Promotion name must be at least 2 characters").max(255),
    discount_percentage: z.coerce
      .number({ invalid_type_error: "Discount must be a number" })
      .min(1, "Discount must be at least 1%")
      .max(100, "Discount cannot exceed 100%"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    is_active: z.boolean().default(true),
    banner_url: z.string().optional().default(""),
    banner_link: z.string().optional().default(""),
    show_popup: z.boolean().default(true),
    popup_delay: z.coerce.number().min(1).max(60).default(5),
    description: z.string().optional().default(""),
  })
  .refine(
    (data) => {
      const start = new Date(data.start_date).getTime();
      const end = new Date(data.end_date).getTime();
      return !isNaN(start) && !isNaN(end) && start < end;
    },
    {
      message: "End date must be after start date",
      path: ["end_date"],
    }
  );

export type PromotionFormValues = z.infer<typeof promotionSchema>;

