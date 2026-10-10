import { CheckoutRepository } from "../repositories/checkout.repository";
import { CheckoutSession, CheckoutStep } from "@/types/checkout.types";
import { CartService } from "./cart.service";

export class CheckoutService {
  /**
   * Get or initialize checkout session
   */
  static async getOrInitializeSession(
    cartId: string,
    userId?: string | null,
    guestEmail?: string | null
  ): Promise<CheckoutSession> {
    let session = await CheckoutRepository.getSession(cartId, userId);

    // If no session exists, or if it expired, create a new one
    if (!session || new Date(session.expires_at) < new Date()) {
      session = await CheckoutRepository.createSession(
        cartId,
        userId,
        guestEmail
      );
    }

    return session;
  }

  /**
   * Update step and data
   */
  static async updateSession(
    sessionId: string,
    step: CheckoutStep,
    data: Partial<CheckoutSession>
  ): Promise<CheckoutSession> {
    return await CheckoutRepository.updateSession(sessionId, {
      ...data,
      current_step: step,
      updated_at: new Date().toISOString(),
    });
  }
}
