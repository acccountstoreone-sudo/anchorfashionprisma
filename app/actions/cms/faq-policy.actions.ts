"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { verifyStaff } from "@/lib/security/roles";
import { revalidatePath } from "next/cache";

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  display_order: number;
  created_at?: string;
}

export interface ShippingPolicyConfig {
  inside_dhaka_delivery_time: string;
  inside_dhaka_fee: number;
  outside_dhaka_delivery_time: string;
  outside_dhaka_fee: number;
  free_shipping_threshold: number;
  courier_partners: string;
  processing_time: string;
  notice?: string;
}

export interface ReturnPolicyConfig {
  return_window_days: number;
  allow_exchanges: boolean;
  conditions: string;
  require_photo_for_damaged: boolean;
  allowed_reasons: string[];
  policy_notice?: string;
}

const DEFAULT_SHIPPING_POLICY: ShippingPolicyConfig = {
  inside_dhaka_delivery_time: "24 to 48 hours",
  inside_dhaka_fee: 60,
  outside_dhaka_delivery_time: "3 to 5 business days",
  outside_dhaka_fee: 120,
  free_shipping_threshold: 999,
  courier_partners: "Pathao, Steadfast, Paperfly",
  processing_time: "Same day dispatch for orders before 2:00 PM",
  notice: "All deliveries are securely handled with real-time SMS tracking updates.",
};

const DEFAULT_RETURN_POLICY: ReturnPolicyConfig = {
  return_window_days: 7,
  allow_exchanges: true,
  conditions: "Items must be unworn, unwashed, and in original packaging with all brand tags attached.",
  require_photo_for_damaged: true,
  allowed_reasons: [
    "Wrong size",
    "Wrong item received",
    "Damaged item",
    "Defective item",
    "Product not as described",
    "Quality issue",
    "Changed my mind",
  ],
  policy_notice: "Contact our customer support team within 7 days of package delivery to initiate an exchange.",
};

const DEFAULT_FAQS: Omit<FAQItem, "id" | "created_at">[] = [
  {
    category: "Orders & Delivery",
    question: "How long does delivery take across Bangladesh?",
    answer: "Deliveries inside Dhaka Metropolitan area are completed within 24 to 48 hours. Deliveries outside Dhaka across all other districts take 3 to 5 business days via our partner couriers.",
    display_order: 1,
  },
  {
    category: "Orders & Delivery",
    question: "How can I track my order status?",
    answer: "Once your package is dispatched, you will receive an SMS and email notification with your tracking number. You can also visit our Track Order page at any time and enter your Order ID.",
    display_order: 2,
  },
  {
    category: "Orders & Delivery",
    question: "What are the standard shipping charges?",
    answer: "Standard shipping is ৳60 inside Dhaka and ৳120 outside Dhaka. Enjoy FREE shipping on all orders over ৳999.",
    display_order: 3,
  },
  {
    category: "Returns & Exchanges",
    question: "What is your return and exchange policy?",
    answer: "We offer a 7-day hassle-free exchange policy. If your item does not fit or you wish to exchange it for another size or design, simply contact our support team within 7 days of delivery with your order invoice.",
    display_order: 4,
  },
  {
    category: "Returns & Exchanges",
    question: "What items are eligible for exchange?",
    answer: "Items must be unworn, unwashed, and in their original packaging with all brand tags securely attached. Clearance, final sale, and innerwear items are non-exchangeable for hygiene reasons.",
    display_order: 5,
  },
  {
    category: "Payment & Security",
    question: "What payment methods are supported?",
    answer: "We accept Cash on Delivery (COD) nationwide across Bangladesh, as well as bKash, Nagad, Rocket, Visa, Mastercard, and American Express via the SSLCOMMERZ secure payment gateway.",
    display_order: 6,
  },
  {
    category: "Payment & Security",
    question: "Is Cash on Delivery (COD) available outside Dhaka?",
    answer: "Yes! Cash on Delivery is available across all 64 districts in Bangladesh with doorstep delivery and payment collection.",
    display_order: 7,
  },
  {
    category: "Products & Sizing",
    question: "How do I choose the correct size?",
    answer: "Please refer to the interactive Size Guide link available on each product page. Our sizing conforms to standard international garment specifications with detailed chest, waist, and length measurements.",
    display_order: 8,
  },
  {
    category: "Products & Sizing",
    question: "Are product colors accurate to the photos?",
    answer: "Yes. All photography is taken in professional studio conditions. Minor tonal variations may occur depending on your device screen calibration and brightness settings.",
    display_order: 9,
  },
  {
    category: "General & Support",
    question: "How can I contact Anchor Fashion customer support?",
    answer: "Our customer care team is available 7 days a week, 9:00 AM to 10:00 PM via live chat, email at support@anchorfashion.com, or direct phone support at +880 1711-223344.",
    display_order: 10,
  },
];

// Seed default FAQs if the table is empty
async function seedDefaultFaqs(supabase: any) {
  try {
    const { count } = await supabase
      .from("faqs")
      .select("*", { count: "exact", head: true });

    if (count === 0 || count === null) {
      const { data, error } = await supabase
        .from("faqs")
        .insert(DEFAULT_FAQS)
        .select();
      if (!error && data) {
        return data as FAQItem[];
      }
    }
  } catch (err) {
    console.error("[seedDefaultFaqs error]:", err);
  }
  return null;
}

// -----------------------------------------------------------------------------
// FAQ Server Actions
// -----------------------------------------------------------------------------

export async function getFaqsAction(): Promise<{
  success: boolean;
  data: FAQItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("faqs")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      const seeded = await seedDefaultFaqs(supabase);
      if (seeded && seeded.length > 0) {
        return { success: true, data: seeded };
      }
    }

    return { success: true, data: (data as FAQItem[]) || [] };
  } catch (error: any) {
    console.error("[getFaqsAction]", error);
    return { success: false, data: [], error: error.message };
  }
}

export async function createFaqAction(payload: {
  category: string;
  question: string;
  answer: string;
  display_order?: number;
}): Promise<{
  success: boolean;
  data?: FAQItem;
  error?: string;
}> {
  try {
    await verifyStaff();
    const supabase = createAdminClient();

    const cleanCategory = payload.category?.trim() || "General";
    const cleanQuestion = payload.question?.trim();
    const cleanAnswer = payload.answer?.trim();

    if (!cleanQuestion || !cleanAnswer) {
      return { success: false, error: "Question and Answer are required." };
    }

    const { data, error } = await supabase
      .from("faqs")
      .insert({
        category: cleanCategory,
        question: cleanQuestion,
        answer: cleanAnswer,
        display_order: Number(payload.display_order) || 0,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/support/faq");
    revalidatePath("/manager/cms/faqs");
    revalidatePath("/admin/cms/faqs");

    return { success: true, data: data as FAQItem };
  } catch (error: any) {
    console.error("[createFaqAction]", error);
    return { success: false, error: error.message };
  }
}

export async function updateFaqAction(
  id: string,
  payload: {
    category?: string;
    question?: string;
    answer?: string;
    display_order?: number;
  }
): Promise<{
  success: boolean;
  data?: FAQItem;
  error?: string;
}> {
  try {
    await verifyStaff();
    const supabase = createAdminClient();

    const updateData: any = {};
    if (payload.category !== undefined) updateData.category = payload.category.trim();
    if (payload.question !== undefined) updateData.question = payload.question.trim();
    if (payload.answer !== undefined) updateData.answer = payload.answer.trim();
    if (payload.display_order !== undefined)
      updateData.display_order = Number(payload.display_order) || 0;

    const { data, error } = await supabase
      .from("faqs")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/support/faq");
    revalidatePath("/manager/cms/faqs");
    revalidatePath("/admin/cms/faqs");

    return { success: true, data: data as FAQItem };
  } catch (error: any) {
    console.error("[updateFaqAction]", error);
    return { success: false, error: error.message };
  }
}

export async function deleteFaqAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await verifyStaff();
    const supabase = createAdminClient();

    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/support/faq");
    revalidatePath("/manager/cms/faqs");
    revalidatePath("/admin/cms/faqs");

    return { success: true };
  } catch (error: any) {
    console.error("[deleteFaqAction]", error);
    return { success: false, error: error.message };
  }
}

// -----------------------------------------------------------------------------
// Policies Server Actions (Shipping & Returns)
// -----------------------------------------------------------------------------

export async function getStorePoliciesAction(): Promise<{
  shipping: ShippingPolicyConfig;
  returns: ReturnPolicyConfig;
}> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["shipping_policy_settings", "return_policy_settings"]);

    let shipping = DEFAULT_SHIPPING_POLICY;
    let returns = DEFAULT_RETURN_POLICY;

    if (data) {
      for (const row of data) {
        if (row.key === "shipping_policy_settings" && row.value) {
          shipping = { ...DEFAULT_SHIPPING_POLICY, ...row.value };
        }
        if (row.key === "return_policy_settings" && row.value) {
          returns = { ...DEFAULT_RETURN_POLICY, ...row.value };
        }
      }
    }

    return { shipping, returns };
  } catch (error) {
    console.error("[getStorePoliciesAction]", error);
    return { shipping: DEFAULT_SHIPPING_POLICY, returns: DEFAULT_RETURN_POLICY };
  }
}

export async function updateStorePoliciesAction(payload: {
  shipping?: Partial<ShippingPolicyConfig>;
  returns?: Partial<ReturnPolicyConfig>;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await verifyStaff();
    const supabase = createAdminClient();

    const current = await getStorePoliciesAction();
    const updatedShipping = { ...current.shipping, ...(payload.shipping || {}) };
    const updatedReturns = { ...current.returns, ...(payload.returns || {}) };

    if (payload.shipping) {
      const { error: shipError } = await supabase.from("settings").upsert(
        {
          key: "shipping_policy_settings",
          value: updatedShipping,
          description: "Customer shipping delivery timeline and rates policy",
        },
        { onConflict: "key" }
      );
      if (shipError) throw shipError;

      // Also keep store_info free_shipping_threshold in sync
      try {
        const { data: storeInfoRow } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "store_info")
          .maybeSingle();

        if (storeInfoRow?.value) {
          const updatedStoreInfo = {
            ...storeInfoRow.value,
            free_shipping_threshold: String(updatedShipping.free_shipping_threshold || 999),
          };
          await supabase.from("settings").upsert(
            {
              key: "store_info",
              value: updatedStoreInfo,
              description: "Global store contact and branding info",
            },
            { onConflict: "key" }
          );
        }
      } catch (syncErr) {
        console.warn("[updateStorePoliciesAction sync store_info warning]:", syncErr);
      }
    }

    if (payload.returns) {
      const { error: retError } = await supabase.from("settings").upsert(
        {
          key: "return_policy_settings",
          value: updatedReturns,
          description: "Customer return and refund policy settings",
        },
        { onConflict: "key" }
      );
      if (retError) throw retError;
    }

    revalidatePath("/support/faq");
    revalidatePath("/support/shipping");
    revalidatePath("/manager/cms/faqs");
    revalidatePath("/manager/cms/policies");
    revalidatePath("/admin/cms/faqs");

    return { success: true };
  } catch (error: any) {
    console.error("[updateStorePoliciesAction]", error);
    return { success: false, error: error.message };
  }
}
