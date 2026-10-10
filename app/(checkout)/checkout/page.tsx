import { redirect } from "next/navigation";
import { fetchCheckoutSessionAction } from "@/lib/actions/checkout.actions";
import { fetchCartAction as getCart } from "@/lib/actions/cart.actions";
import { getAllPaymentConfigs } from "@/lib/actions/payment.actions";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { OrderSummary } from "@/components/checkout/order-summary";
import { CheckoutStoreInitializer } from "./initializer";

export default async function CheckoutPage() {
  const { createClient } = await import("@/lib/supabase/server");
  const { ADMIN_ROLES } = await import("@/lib/constants/auth");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    let role = user.user_metadata?.role || user.app_metadata?.role;
    if (!role) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("roles(name)")
          .eq("id", user.id)
          .single();
        role = (profile?.roles as any)?.name;
      } catch {
        role = "CUSTOMER";
      }
    }
    if (ADMIN_ROLES.includes(role)) {
      redirect("/admin");
    }
  }

  const cartRes = await getCart();

  if (!cartRes.success || !cartRes.cart || cartRes.cart.items?.length === 0) {
    redirect("/cart");
  }

  const [sessionRes, paymentConfigs] = await Promise.all([
    fetchCheckoutSessionAction(cartRes.cart.id),
    getAllPaymentConfigs(),
  ]);

  if (!sessionRes.success || !sessionRes.session) {
    return (
      <div className="p-12 text-center text-red-500">
        Error initializing checkout. Please try again.
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 lg:py-12">
      <CheckoutStoreInitializer
        cartId={cartRes.cart.id}
        initialSession={sessionRes.session}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <CheckoutForm
            checkoutSessionId={sessionRes.session.id}
            cartId={cartRes.cart.id}
            paymentConfigs={paymentConfigs}
          />
        </div>

        <div className="order-first mb-8 lg:order-last lg:col-span-5 lg:mb-0">
          <div className="sticky top-8">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
