import { create } from "zustand";
import { CheckoutSession, CheckoutStep } from "@/types/checkout.types";
import {
  fetchCheckoutSessionAction,
  updateCheckoutStepAction,
} from "@/lib/actions/checkout.actions";
import {
  CheckoutFormValues,
  CheckoutInformationFormValues,
  CheckoutShippingFormValues,
  CheckoutPaymentFormValues,
} from "@/schemas/checkout.schema";

interface CheckoutState {
  session: CheckoutSession | null;
  isLoading: boolean;
  error: string | null;
  currentStep: CheckoutStep;

  formData: Partial<CheckoutFormValues>;

  setSession: (session: CheckoutSession) => void;
  fetchSession: (cartId: string) => Promise<void>;
  updateStep: (step: CheckoutStep) => Promise<void>;
  setInformation: (data: CheckoutInformationFormValues) => void;
  setShipping: (data: CheckoutShippingFormValues) => void;
  setPayment: (data: CheckoutPaymentFormValues) => void;
  setNotes: (notes: string) => void;

  syncWithServer: () => Promise<void>;
}

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  session: null,
  isLoading: false,
  error: null,
  currentStep: "INFORMATION",

  formData: {},

  setSession: (session: CheckoutSession) => {
    set({
      session,
      currentStep: session.current_step || "INFORMATION",
      formData: {
        information: {
          email: session.guest_email || "",
          shipping_address:
            session.shipping_address_snapshot || undefined,
          save_information: false,
        } as any,
        shipping: {
          shipping_method: session.shipping_method || "home_delivery",
        },
        payment: {
          payment_method: session.payment_method || "COD",
          billing_address_same_as_shipping: true,
          billing_address: session.billing_address_snapshot || undefined,
        },
      },
    });
  },

  fetchSession: async (cartId: string) => {
    set({ isLoading: true, error: null });
    const res = await fetchCheckoutSessionAction(cartId);
    if (res.success && res.session) {
      set({
        session: res.session,
        currentStep: res.session.current_step,
        formData: {
          information: {
            email: res.session.guest_email || "",
            shipping_address:
              res.session.shipping_address_snapshot || undefined,
            save_information: false,
          } as any,
          shipping: {
            shipping_method: res.session.shipping_method || "home_delivery",
          },
          payment: {
            payment_method: res.session.payment_method || "COD",
            billing_address_same_as_shipping: true,
            billing_address: res.session.billing_address_snapshot || undefined,
          },
        },
        isLoading: false,
      });
    } else {
      set({ error: res.error, isLoading: false });
    }
  },

  updateStep: async (step: CheckoutStep) => {
    // 1. Always update local step immediately so user sees step transition!
    set({ currentStep: step, isLoading: false, error: null });

    const { session } = get();
    if (!session) return;

    try {

    // Sync with server
    const dataToSync: Partial<CheckoutSession> = {};
    const formData = get().formData;

    if (step === "SHIPPING" || step === "PAYMENT" || step === "REVIEW") {
      if (formData.information) {
        dataToSync.guest_email = formData.information.email;
        dataToSync.shipping_address_snapshot =
          formData.information.shipping_address;
      }
    }

    if (step === "PAYMENT" || step === "REVIEW") {
      if (formData.shipping) {
        dataToSync.shipping_method = formData.shipping.shipping_method;
      }
    }

    if (step === "REVIEW") {
      if (formData.payment) {
        dataToSync.payment_method = formData.payment.payment_method;
        if (
          !formData.payment.billing_address_same_as_shipping &&
          formData.payment.billing_address
        ) {
          dataToSync.billing_address_snapshot =
            formData.payment.billing_address;
        } else if (formData.information?.shipping_address) {
          dataToSync.billing_address_snapshot =
            formData.information.shipping_address;
        }
      }
    }

      const res = await updateCheckoutStepAction(session.id, step, dataToSync);

      if (res.success && res.session) {
        set({ session: res.session });
      }
    } catch (syncErr) {
      console.warn("[useCheckoutStore] Step sync warning:", syncErr);
    }
  },

  setInformation: (data) =>
    set((state) => ({ formData: { ...state.formData, information: data } })),
  setShipping: (data) =>
    set((state) => ({ formData: { ...state.formData, shipping: data } })),
  setPayment: (data) =>
    set((state) => ({ formData: { ...state.formData, payment: data } })),
  setNotes: (notes) =>
    set((state) => ({ formData: { ...state.formData, notes } })),

  syncWithServer: async () => {
    // Force sync current state to server
    await get().updateStep(get().currentStep);
  },
}));
