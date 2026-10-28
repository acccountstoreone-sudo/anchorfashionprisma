"use server";

import { revalidatePath } from "next/cache";
import { CustomerService } from "@/lib/services/customer.service";
import { auth, getServerSession } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
// Storage needs migration from Supabase to Neon/S3, temporarily keeping createAdminClient for image upload only if it exists
import { createAdminClient } from "@/lib/supabase/admin";
import { WalletService } from "@/services/wallet.service";
import { LoyaltyService } from "@/services/loyalty.service";
import { verifyAuthenticated } from "@/lib/security/roles";

const customerService = new CustomerService();

async function getUserId() {
  const { user } = await getServerSession();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user.id;
}

export async function updateProfileAction(formData: FormData) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  const { user } = await getServerSession();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const firstName = formData.get("first_name") as string;
  const lastName = formData.get("last_name") as string;
  const phone = formData.get("phone") as string;
  const dob = formData.get("date_of_birth") as string;

  await customerService.updateProfile(user.id, {
    first_name: firstName,
    last_name: lastName,
    phone: phone,
    email: user.email,
    date_of_birth: dob || null,
  });

  revalidatePath("/account/profile");
  return { success: true };
}

export async function uploadAvatarAction(formData: FormData) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const { user } = await getServerSession();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided" };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File size exceeds 5MB limit" };
    }

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from("media")
      .upload(fileName, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: pubData } = admin.storage.from("media").getPublicUrl(fileName);
    const avatarUrl = pubData.publicUrl;

    // Update customer profile
    await customerService.updateProfile(user.id, {
      avatar_url: avatarUrl,
    });

    // Update auth user metadata in Neon/Better Auth if supported
    try {
      if (typeof (auth as any).updateUser === "function") {
        const { headers } = await import("next/headers");
        await (auth as any).updateUser({
          headers: await headers(),
          body: {
            image: avatarUrl,
          },
        });
      }
    } catch {}

    revalidatePath("/account/profile");
    revalidatePath("/account");
    return { success: true, avatarUrl };
  } catch (err: any) {
    console.error("Upload avatar exception:", err);
    return { success: false, error: err.message || "Failed to upload avatar" };
  }
}

export async function createAddressAction(formData: FormData) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  const userId = await getUserId();

  await customerService.createAddress(userId, {
    title: (formData.get("title") as string) || "Home",
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
    address_line_1: formData.get("address_line_1") as string,
    address_line_2: formData.get("address_line_2") as string,
    city: formData.get("city") as string,
    state: formData.get("state") as string,
    zip: formData.get("zip") as string,
    country: (formData.get("country") as string) || "US",
    is_default_shipping: formData.get("is_default_shipping") === "true",
    is_default_billing: formData.get("is_default_billing") === "true",
  });

  revalidatePath("/account/addresses");
  return { success: true };
}

export async function markNotificationAsReadAction(id: string) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  const userId = await getUserId();
  await customerService.markNotificationAsRead(id, userId);
  revalidatePath("/account/notifications");
  return { success: true };
}

export async function fetchWalletAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    const wallet = await WalletService.getWallet(userId);
    const transactions = await WalletService.getTransactions(wallet.id);

    return {
      success: true,
      data: { ...wallet, transactions: transactions || [] },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchLoyaltyAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    const supabase = await createClient();

    const { data: loyalty, error: loyaltyError } = await supabase
      .from("loyalty_accounts")
      .select("*")
      .eq("customer_id", userId)
      .single();

    if (loyaltyError) {
      if (loyaltyError.code === "PGRST116")
        return { success: true, data: { tier: "MEMBER", points_balance: 0 } };
      throw loyaltyError;
    }

    return { success: true, data: loyalty };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchRewardCatalogAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const catalog = await LoyaltyService.getCatalog();
    return { success: true, data: catalog };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchAccountSummaryAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    const supabase = await createClient();

    const [walletRes, loyaltyRes, ordersRes] = await Promise.all([
      fetchWalletAction(),
      fetchLoyaltyAction(),
      supabase
        .from("orders")
        .select("id", { count: "exact" })
        .eq("customer_id", userId)
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        ),
    ]);

    return {
      success: true,
      data: {
        recentOrders: ordersRes.count || 0,
        walletBalance: walletRes.data?.balance || 0,
        currency: walletRes.data?.currency || "BDT",
        loyaltyPoints: loyaltyRes.data?.points_balance || 0,
        loyaltyTier: loyaltyRes.data?.tier || "MEMBER",
        supportTickets: 0, // Can be replaced by actual count
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAddressAction(id: string) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    await customerService.deleteAddress(id, userId);
    revalidatePath("/account/addresses");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Customer Portal Actions ---

export async function fetchReviewsAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    const reviews = await customerService.getReviews(userId);
    return { success: true, data: reviews };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchTicketsAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    const tickets = await customerService.getTickets(userId);
    return { success: true, data: tickets };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createTicketAction(formData: FormData) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string;

    await customerService.createTicket(userId, {
      subject,
      description,
      status: "OPEN",
      priority: "NORMAL",
    });

    revalidatePath("/account/support");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchTicketDetailsAction(ticketId: string) {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    const ticket = await customerService.getTicketDetails(ticketId, userId);
    return { success: true, data: ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function replyTicketAction(data: {
  ticketId: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    if (!data.message || !data.message.trim()) {
      return { success: false, error: "Message cannot be empty" };
    }
    await customerService.replyTicket(data.ticketId, userId, data.message.trim());
    revalidatePath(`/account/support/${data.ticketId}`);
    revalidatePath("/account/support");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchLoginHistoryAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    const history = await customerService.getLoginHistory(userId);
    return { success: true, data: history };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchActiveSessionsAction() {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    const sessions = await customerService.getActiveSessions(userId);
    return { success: true, data: sessions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchPurchasedProductsAction(): Promise<{
  success: boolean;
  data?: Array<{
    productId: string;
    productName: string;
    orderId: string;
    orderNumber: string;
  }>;
  error?: string;
}> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    const supabase = await createClient();

    // Fetch user's orders
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("customer_id", userId);

    if (ordersError || !orders || orders.length === 0) {
      // Instead of failing completely or showing catalog, just return empty so they can't review anything
      return {
        success: true,
        data: []
      };
    }

    const orderIds = (orders || []).map((o: any) => o.id);
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, product_name, order_id")
      .in("order_id", orderIds)
      .not("product_id", "is", null);

    const orderMap = (orders || []).reduce((acc: any, o: any) => {
      acc[o.id] = o.order_number;
      return acc;
    }, {} as Record<string, string>);

    const seen = new Set<string>();
    const purchased: Array<{
      productId: string;
      productName: string;
      orderId: string;
      orderNumber: string;
    }> = [];

    for (const it of items || []) {
      if (it.product_id && !seen.has(it.product_id)) {
        seen.add(it.product_id);
        purchased.push({
          productId: it.product_id,
          productName: it.product_name,
          orderId: it.order_id,
          orderNumber: orderMap[it.order_id] || "Order",
        });
      }
    }

    if (purchased.length === 0) {
      const { data: catalogProducts } = await supabase
        .from("products")
        .select("id, name")
        .eq("status", "ACTIVE")
        .limit(10);

      return {
        success: true,
        data: (catalogProducts || []).map((p: any) => ({
          productId: p.id,
          productName: p.name,
          orderId: "",
          orderNumber: "Store Product",
        })),
      };
    }

    return { success: true, data: purchased };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createReviewAction(data: {
  productId: string;
  orderId?: string;
  rating: number;
  title?: string;
  body?: string;
  comment?: string;
  review_text?: string;
  images?: string[];
}): Promise<{ success?: boolean; data?: any; error?: string }> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    const adminClient = createAdminClient();

    if (data.rating < 1 || data.rating > 5) {
      return { error: "Rating must be between 1 and 5" };
    }

    const reviewContent =
      data.review_text ||
      data.comment ||
      data.body ||
      data.title ||
      "Verified product review";

    if (reviewContent.length > 2000) {
      return { error: "Review is too long (maximum 2000 characters)" };
    }

    // Ensure customer_profiles record exists to satisfy foreign key constraint
    const { data: customerProfile } = await adminClient
      .from("customer_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!customerProfile) {
      const { data: staffProfile } = await adminClient
        .from("profiles")
        .select("first_name, last_name, phone, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      const { user } = await getServerSession();

      await adminClient.from("customer_profiles").upsert({
        id: userId,
        first_name:
          staffProfile?.first_name ||
          user?.user_metadata?.first_name ||
          (user?.user_metadata as any)?.name ||
          "Customer",
        last_name:
          staffProfile?.last_name ||
          user?.user_metadata?.last_name ||
          "",
        email: user?.email || "",
        phone: staffProfile?.phone || null,
        avatar_url: staffProfile?.avatar_url || null,
        is_active: true,
      });
    }

    // Check if user has an order for this product (for verified purchase badge)
    let linkedOrderId: string | null = data.orderId || null;

    if (!linkedOrderId) {
      const { data: userOrders } = await adminClient
        .from("orders")
        .select("id, status")
        .eq("customer_id", userId);

      if (userOrders && userOrders.length > 0) {
        const orderIds = userOrders.map((o: any) => o.id);
        const { data: matchingItem } = await adminClient
          .from("order_items")
          .select("order_id")
          .eq("product_id", data.productId)
          .in("order_id", orderIds)
          .limit(1)
          .maybeSingle();

        if (matchingItem) {
          linkedOrderId = matchingItem.order_id;
        }
      }
    }

    // Insert new review (customers can submit multiple reviews for the same product)
    const { data: review, error: insertError } = await adminClient
      .from("customer_reviews")
      .insert({
        customer_id: userId,
        product_id: data.productId,
        order_id: linkedOrderId,
        rating: data.rating,
        title: data.title || null,
        review_text: reviewContent,
        images: data.images || [],
        is_approved: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Recalculate and update product average rating
    const { data: prodReviews } = await adminClient
      .from("customer_reviews")
      .select("rating")
      .eq("product_id", data.productId)
      .eq("is_approved", true);

    if (prodReviews && prodReviews.length > 0) {
      const avg =
        prodReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) /
        prodReviews.length;
      await adminClient
        .from("products")
        .update({ average_rating: Number(avg.toFixed(2)) })
        .eq("id", data.productId);
    }

    // Revalidate paths so reviews appear immediately
    const { data: prod } = await adminClient
      .from("products")
      .select("slug")
      .eq("id", data.productId)
      .maybeSingle();

    if (prod?.slug) {
      revalidatePath(`/product/${prod.slug}`);
    }
    revalidatePath(`/product/${data.productId}`);
    revalidatePath("/products");
    revalidatePath("/account/reviews");
    return { success: true, data: review };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function topUpWalletAction(data: {
  amount: number;
  paymentMethod: string;
  paymentRef: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" };
    }
    if (!data.paymentRef || !data.paymentRef.trim()) {
      return { success: false, error: "Payment transaction reference is required" };
    }

    const result = await WalletService.topUp({
      userId,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod || "bKash / Nagad",
      paymentRef: data.paymentRef.trim(),
    });

    revalidatePath("/account/wallet");
    revalidatePath("/account");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function withdrawWalletAction(data: {
  amount: number;
  destinationMethod: string;
  destinationAccount: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" };
    }
    if (!data.destinationAccount || !data.destinationAccount.trim()) {
      return { success: false, error: "Account/Mobile number is required" };
    }

    const result = await WalletService.withdraw({
      userId,
      amount: Number(data.amount),
      destinationMethod: data.destinationMethod || "bKash",
      destinationAccount: data.destinationAccount.trim(),
    });

    revalidatePath("/account/wallet");
    revalidatePath("/account");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function transferWalletAction(data: {
  toIdentifier: string;
  amount: number;
  note?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    if (!data.amount || data.amount <= 0) {
      return { success: false, error: "Transfer amount must be greater than zero" };
    }
    if (!data.toIdentifier || !data.toIdentifier.trim()) {
      return { success: false, error: "Recipient phone or customer ID is required" };
    }

    const result = await WalletService.transfer({
      fromUserId: userId,
      toIdentifier: data.toIdentifier.trim(),
      amount: Number(data.amount),
      note: data.note,
    });

    revalidatePath("/account/wallet");
    revalidatePath("/account");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function redeemLoyaltyPointsAction(data: {
  rewardId: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    if (!data.rewardId) {
      return { success: false, error: "Reward ID is required" };
    }

    const result = await LoyaltyService.redeemPoints({
      userId,
      rewardId: data.rewardId,
    });

    revalidatePath("/account/loyalty");
    revalidatePath("/account/rewards");
    revalidatePath("/account/wallet");
    revalidatePath("/account");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCustomerReviewAction(reviewId: string): Promise<{ success: boolean; error?: string }> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const userId = await getUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("customer_reviews")
      .delete()
      .eq("id", reviewId)
      .eq("customer_id", userId);

    if (error) throw error;

    revalidatePath("/account/reviews");
    revalidatePath("/account");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function voteReviewHelpfulAction(
  reviewId: string,
  increment: boolean = true
): Promise<{ success: boolean; helpful_votes?: number; error?: string }> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyAuthenticated();
  try {
    const adminClient = createAdminClient();

    const { data: review, error: fetchErr } = await adminClient
      .from("customer_reviews")
      .select("id, helpful_votes, product_id")
      .eq("id", reviewId)
      .maybeSingle();

    if (fetchErr || !review) {
      return { success: false, error: "Review not found" };
    }

    const currentVotes = review.helpful_votes || 0;
    const nextVotes = increment ? currentVotes + 1 : Math.max(0, currentVotes - 1);

    const { error: updateErr } = await adminClient
      .from("customer_reviews")
      .update({ helpful_votes: nextVotes })
      .eq("id", reviewId);

    if (updateErr) throw updateErr;

    if (review.product_id) {
      const { data: prod } = await adminClient
        .from("products")
        .select("slug")
        .eq("id", review.product_id)
        .maybeSingle();
      if (prod?.slug) {
        revalidatePath(`/product/${prod.slug}`);
      }
    }

    return { success: true, helpful_votes: nextVotes };
  } catch (error: any) {
    console.error("Error in voteReviewHelpfulAction:", error);
    return { success: false, error: error.message };
  }
}



