"use server";

import { revalidatePath } from "next/cache";
import { CustomerService } from "@/services/customer.service";
import { updateProfileSchema, addressSchema } from "@/schemas/customer.schema";
import { createClient } from "@/lib/supabase/server";

export async function updateProfileAction(userId: string, formData: FormData) {
  try {
    const rawData = {
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      phone: formData.get("phone") as string,
    };

    await CustomerService.updateProfile(userId, rawData);
    revalidatePath("/account/profile");
    return { success: true, message: "Profile updated successfully" };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to update profile",
    };
  }
}

export async function addAddressAction(userId: string, formData: FormData) {
  try {
    const rawData = {
      title: formData.get("title") as string,
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      phone: formData.get("phone") as string,
      address_line_1: formData.get("address_line_1") as string,
      city: formData.get("city") as string,
      zip: formData.get("zip") as string,
    };

    await CustomerService.addAddress(userId, rawData);
    revalidatePath("/account/profile");
    return { success: true, message: "Address added successfully" };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to add address",
    };
  }
}
