import { Metadata } from "next";
import { PaymentClient } from "./payment-client";
import { getAllPaymentConfigs } from "@/lib/actions/payment.actions";

export const metadata: Metadata = {
  title: "Payment Settings | Admin",
};

export default async function PaymentSettingsPage() {
  const configs = await getAllPaymentConfigs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Gateways & Methods</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Dynamically configure bKash, Nagad, Rocket, Bank Transfer, COD, and SSLCommerz credentials and customer instructions.
        </p>
      </div>

      <PaymentClient initialConfigs={configs} />
    </div>
  );
}

