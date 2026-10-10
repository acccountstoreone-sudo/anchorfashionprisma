import { createClient } from "@/lib/supabase/server-client";
import { CheckoutSession, CheckoutStep } from "@/types/checkout.types";

export class CheckoutRepository {
  /**
   * Get a checkout session by ID
   */
  async getCheckoutSessionById(id: string): Promise<CheckoutSession | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("checkout_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      console.error("Error fetching checkout session:", error);
      throw new Error("Failed to fetch checkout session");
    }

    return data as CheckoutSession;
  }

  /**
   * Create a new checkout session
   */
  async createCheckoutSession(
    cartId: string,
    userId?: string,
    guestEmail?: string
  ): Promise<CheckoutSession> {
    const supabase = await createClient();

    // First, check if there's an active session for this cart
    const { data: existing } = await supabase
      .from("checkout_sessions")
      .select("*")
      .eq("cart_id", cartId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      // Return existing session if it hasn't expired
      if (new Date(existing.expires_at) > new Date()) {
        return existing as CheckoutSession;
      }
    }

    const { data, error } = await supabase
      .from("checkout_sessions")
      .insert({
        cart_id: cartId,
        user_id: userId || null,
        guest_email: guestEmail || null,
        current_step: "INFORMATION",
        // expires_at will be set automatically to now() + 2 hours
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating checkout session:", error);
      throw new Error("Failed to create checkout session");
    }

    return data as CheckoutSession;
  }

  /**
   * Update a checkout session
   */
  async updateCheckoutSession(
    id: string,
    updates: Partial<Omit<CheckoutSession, "id" | "created_at" | "updated_at">>
  ): Promise<CheckoutSession> {
    const supabase = await createClient();

    // Ensure we convert address objects to JSON compatible types if needed
    // Supabase JS handles objects to JSONB mapping automatically.

    const { data, error } = await supabase
      .from("checkout_sessions")
      .update({
        ...updates,
        // Reset expiration on activity
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating checkout session:", error);
      throw new Error("Failed to update checkout session");
    }

    return data as CheckoutSession;
  }

  /**
   * Delete a checkout session (e.g. after order is created)
   */
  async deleteCheckoutSession(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("checkout_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting checkout session:", error);
      throw new Error("Failed to delete checkout session");
    }
  }
}
