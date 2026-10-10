import { z } from "zod";

export const updateProfileSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100).optional(),
  last_name: z.string().min(1, "Last name is required").max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  date_of_birth: z.string().optional().nullable(), // YYYY-MM-DD
  gender: z
    .enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"])
    .optional()
    .nullable(),
  emergency_contact_name: z.string().max(100).optional().nullable(),
  emergency_contact_phone: z.string().max(20).optional().nullable(),
});

export const addressSchema = z.object({
  title: z.string().max(100).optional().nullable(),
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  phone: z.string().min(1, "Phone is required").max(20),
  address_line_1: z.string().min(1, "Address line 1 is required").max(255),
  address_line_2: z.string().max(255).optional().nullable(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().max(100).optional().nullable(),
  zip: z.string().min(1, "ZIP is required").max(20),
  country: z.string().default("Bangladesh").optional(),
  is_default_shipping: z.boolean().default(false).optional(),
  is_default_billing: z.boolean().default(false).optional(),
});

export const reviewSchema = z.object({
  product_id: z.string().uuid(),
  order_id: z.string().uuid().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional().nullable(),
  review_text: z.string().optional().nullable(),
  images: z.array(z.string().url()).optional().nullable(),
});

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(6, "Current password is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });
