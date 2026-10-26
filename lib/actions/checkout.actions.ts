"use server";

import { CheckoutService } from "../services/checkout.service";
import { OrderService } from "../services/order.service";
import { getServerSession } from "@/lib/auth/server";
import { cookies } from "next/headers";
import {
  CheckoutFormValues,
  checkoutFormSchema,
} from "@/schemas/checkout.schema";
import { CheckoutStep } from "@/types/checkout.types";
import { CodRiskService, CodRiskEvaluation } from "../services/fraud/cod-risk.service";
import { CodOtpService } from "../services/fraud/cod-otp.service";
import { prisma } from "@/lib/prisma";

async function getSessionIdentifiers() {
  const { user } = await getServerSession();

  const cookieStore = await cookies();
  const guestSessionId = cookieStore.get("af_guest_session")?.value;

  return {
    userId: user?.id || null,
    sessionId: user ? null : guestSessionId || `guest_${Date.now()}`,
  };
}

export async function fetchCheckoutSessionAction(cartId: string) {
  try {
    const { userId, sessionId } = await getSessionIdentifiers();
    const guestEmail = null;

    const session = await CheckoutService.getOrInitializeSession(
      cartId,
      userId,
      guestEmail
    );
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCheckoutStepAction(
  sessionId: string,
  step: CheckoutStep,
  data: any
) {
  try {
    const session = await CheckoutService.updateSession(sessionId, step, data);
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function calculateOrderSummaryAction(cartId: string) {
  try {
    const { userId } = await getSessionIdentifiers();
    const summary = await OrderService.calculateSummary(cartId, userId);
    return { success: true, summary };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Pre-evaluate COD risk without placing an order
 */
export async function evaluateCodRiskAction(
  cartId: string,
  formData: CheckoutFormValues
) {
  try {
    const parsedData = checkoutFormSchema.parse(formData);
    const { userId } = await getSessionIdentifiers();
    const summary = await OrderService.calculateSummary(
      cartId,
      userId,
      parsedData.shipping.shipping_method
    );

    const evaluation = await CodRiskService.evaluateRisk({
      customerId: userId || null,
      email: parsedData.information.email,
      phone: parsedData.information.shipping_address.phone || "",
      totalAmount: summary.total_amount,
      shippingAddress: parsedData.information.shipping_address,
    });

    return { success: true, evaluation };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Dispatch or resend a COD verification OTP code
 */
export async function sendCodOtpAction(
  checkoutSessionId: string,
  formData: CheckoutFormValues
) {
  try {
    const parsedData = checkoutFormSchema.parse(formData);
    const { userId } = await getSessionIdentifiers();
    const summary = await OrderService.calculateSummary(
      parsedData.shipping.shipping_method || "standard",
      userId
    ).catch(() => null);

    const result = await CodOtpService.initiateVerification({
      sessionId: checkoutSessionId,
      email: parsedData.information.email,
      phone: parsedData.information.shipping_address.phone,
      customerName: `${parsedData.information.shipping_address.first_name} ${parsedData.information.shipping_address.last_name}`,
      orderTotal: summary?.total_amount,
    });

    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Verify a customer-entered OTP code for the current checkout session
 */
export async function verifyCodOtpAction(
  checkoutSessionId: string,
  otpCode: string
) {
  try {
    if (!otpCode || otpCode.trim().length !== 6) {
      return { success: false, error: "Please enter a valid 6-digit verification code." };
    }

    const result = await CodOtpService.verifyOtp(checkoutSessionId, otpCode.trim());
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Process checkout with authoritative COD Risk Assessment and OTP Verification Guards
 */
export async function processCheckoutAction(
  cartId: string,
  checkoutSessionId: string,
  formData: CheckoutFormValues,
  otpCode?: string
) {
  try {
    // 1. Validate form data
    const parsedData = checkoutFormSchema.parse(formData);
    const { userId, sessionId } = await getSessionIdentifiers();

    if (!userId && !sessionId) {
      throw new Error("No valid session found for checkout.");
    }

    if (userId) {
      try {
        const { user: currentUser } = await getServerSession();
        let roleName = (currentUser as any)?.role || currentUser?.user_metadata?.role;
        if (!roleName) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
          const profile = await prisma.profile.findFirst({
            where: {
              OR: [
                ...(isUuid ? [{ id: userId }] : []),
                ...(parsedData.information.email ? [{ email: parsedData.information.email }] : []),
              ],
            },
            include: { role: true },
          });
          roleName = profile?.role?.name;
        }

        const upperRole = String(roleName || "").toUpperCase();
        const { ADMIN_ROLES } = await import("@/lib/constants/auth");
        if (upperRole && (ADMIN_ROLES as readonly string[]).includes(upperRole)) {
          throw new Error("Admin accounts cannot place customer orders. Please use a customer account.");
        }
      } catch (err: any) {
        if (err.message?.includes("Admin accounts")) throw err;
        console.warn("[processCheckoutAction] Role verification notice:", err);
      }
    }

    const guestEmail = parsedData.information.email;

    // 2. Compute authoritative server-side order summary
    const summary = await OrderService.calculateSummary(
      cartId,
      userId,
      parsedData.shipping.shipping_method
    );

    let riskMetadata: {
      risk_level?: string;
      risk_score?: number;
      risk_reasons?: string[];
      verification_status?: string;
      verification_verified_at?: string | null;
    } = {
      risk_level: "LOW",
      risk_score: 0,
      risk_reasons: [],
      verification_status: "UNVERIFIED",
    };

    // 3. COD Fraud Shield Evaluation
    if (parsedData.payment.payment_method === "COD") {
      const riskEvaluation = await CodRiskService.evaluateRisk({
        customerId: userId || null,
        email: parsedData.information.email,
        phone: parsedData.information.shipping_address.phone || "",
        totalAmount: summary.total_amount,
        shippingAddress: parsedData.information.shipping_address,
      });

      // If OTP is provided in this submission, attempt verification first
      if (otpCode && otpCode.trim()) {
        const verifyRes = await CodOtpService.verifyOtp(checkoutSessionId, otpCode.trim());
        if (!verifyRes.success) {
          return {
            success: false,
            error: verifyRes.error || "Invalid verification code.",
            verificationRequired: true,
            riskLevel: riskEvaluation.riskLevel,
            maskedTarget: CodOtpService.maskTarget(parsedData.information.email, "email"),
          };
        }
      }

      // Check if verification is required by risk policy
      if (riskEvaluation.requiresVerification) {
        const isVerified = await CodOtpService.isSessionVerified(checkoutSessionId);

        if (!isVerified) {
          // Trigger OTP dispatch if not already active
          const otpInit = await CodOtpService.initiateVerification({
            sessionId: checkoutSessionId,
            email: parsedData.information.email,
            phone: parsedData.information.shipping_address.phone,
            customerName: `${parsedData.information.shipping_address.first_name} ${parsedData.information.shipping_address.last_name}`,
            orderTotal: summary.total_amount,
          });

          return {
            success: false,
            verificationRequired: true,
            riskLevel: riskEvaluation.riskLevel,
            maskedTarget: otpInit.maskedTarget || CodOtpService.maskTarget(parsedData.information.email, "email"),
            targetType: otpInit.targetType || "email",
            remainingCooldownSeconds: otpInit.remainingCooldownSeconds,
            error: otpInit.error,
          };
        }

        // Customer has successfully verified!
        riskMetadata = {
          risk_level: riskEvaluation.riskLevel,
          risk_score: riskEvaluation.riskScore,
          risk_reasons: riskEvaluation.reasons,
          verification_status: "VERIFIED",
          verification_verified_at: new Date().toISOString(),
        };
      } else {
        // Low risk or exempted by trusted customer policy
        riskMetadata = {
          risk_level: riskEvaluation.riskLevel,
          risk_score: riskEvaluation.riskScore,
          risk_reasons: riskEvaluation.reasons,
          verification_status: "EXEMPT",
          verification_verified_at: null,
        };
      }
    }

    // 4. Create Order & Atomically Reserve Inventory
    const order = await OrderService.placeOrder(
      cartId,
      userId || null,
      guestEmail || null,
      parsedData,
      checkoutSessionId,
      riskMetadata as any
    );

    // Trigger Real-time Admin Notification
    try {
      const { createOrderNotificationAction } = await import("@/actions/admin/notification.actions");
      const customerFullName = [
        parsedData.information.shipping_address.first_name,
        parsedData.information.shipping_address.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() || "Customer";

      const orderAmount = order.total_amount || order.grand_total || summary.total_amount;

      await createOrderNotificationAction({
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: customerFullName,
        amount: orderAmount,
        paymentMethod: order.payment_method || "COD",
        status: order.status,
      });
    } catch (notifErr) {
      console.warn("[Checkout] Error triggering order notification:", notifErr);
    }

    // 5. If Manual Payment (bKash, Nagad, Rocket, Bank Transfer), record transaction for Admin Approval
    const methodUpper = (order.payment_method || "").toUpperCase();
    const isManualPayment = ["BKASH", "NAGAD", "ROCKET", "BANK", "BANK_TRANSFER"].includes(methodUpper);

    if (isManualPayment && parsedData.payment.manual_payment) {
      const { recordManualPaymentTransaction } = await import("./payment.actions");
      await recordManualPaymentTransaction({
        order_id: order.id,
        payment_method: methodUpper,
        amount: order.total_amount || order.grand_total || summary.total_amount,
        sender_number: parsedData.payment.manual_payment.sender_number,
        transaction_id: parsedData.payment.manual_payment.transaction_id,
        bank_name: parsedData.payment.manual_payment.bank_name,
        branch_name: parsedData.payment.manual_payment.branch_name,
        account_holder_name: parsedData.payment.manual_payment.account_holder_name,
        notes: parsedData.payment.manual_payment.notes,
        customer_id: userId || null,
      });
    }

    // 6. Generate Payment Payload ONLY for Automated Gateway Redirects (e.g. SSLCommerz)
    let paymentPayload = null;
    if (order.payment_method === "SSLCOMMERZ") {
      const name = `${parsedData.information.shipping_address.first_name} ${parsedData.information.shipping_address.last_name}`;
      paymentPayload = OrderService.generatePaymentPayload(
        order,
        name,
        parsedData.information.email,
        parsedData.information.shipping_address.phone || ""
      );
    }

    // 7. If Cash on Delivery (COD), order is immediately confirmed -> Trigger confirmation SMS asynchronously
    if (
      order.payment_method === "COD" &&
      ((order.status as string) === "confirmed" || (order.status as string) === "CONFIRMED")
    ) {
      const { AlphaSmsService } = await import("@/lib/services/sms/alpha-sms.service");
      AlphaSmsService.triggerOrderConfirmationSmsAsync(order.id);
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentPayload,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
