import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PaymentProvidersForm } from "./PaymentProvidersForm";

export const metadata: Metadata = {
  title: "Payment Providers | Admin",
};

export const revalidate = 0;

const DEFAULT_CONFIG = (key: string) => ({
  key,
  enabled: false,
  credentials: { sandbox: "true" },
});

export default async function PaymentProvidersPage() {
  const supabase = await createClient();

  const [{ data: bkashData }, { data: sslData }] = await Promise.all([
    supabase
      .from("settings")
      .select("value")
      .eq("key", "payment_bkash")
      .single(),
    supabase
      .from("settings")
      .select("value")
      .eq("key", "payment_sslcommerz")
      .single(),
  ]);

  const bkash = bkashData?.value
    ? {
        key: "payment_bkash",
        enabled: bkashData.value.enabled ?? false,
        credentials: bkashData.value,
      }
    : DEFAULT_CONFIG("payment_bkash");

  const ssl = sslData?.value
    ? {
        key: "payment_sslcommerz",
        enabled: sslData.value.enabled ?? false,
        credentials: {
          store_id: sslData.value.store_id || "",
          sandbox:
            sslData.value.sandbox !== undefined
              ? String(sslData.value.sandbox)
              : sslData.value.is_sandbox !== undefined
              ? String(sslData.value.is_sandbox)
              : "true",
          store_pass:
            sslData.value.store_pass ||
            sslData.value.store_password ||
            sslData.value.store_passwd
              ? "••••••••"
              : "",
        },
      }
    : DEFAULT_CONFIG("payment_sslcommerz");

  return <PaymentProvidersForm initialBkash={bkash} initialSSL={ssl} />;
}
