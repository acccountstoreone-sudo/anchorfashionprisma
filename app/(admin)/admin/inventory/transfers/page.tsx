import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { StockTransfersClient } from "@/features/inventory/components/StockTransfersClient";
import { getWarehouses, getVariants } from "@/app/actions/admin/procurement.actions";

export const metadata: Metadata = {
  title: "Stock Transfers | Anchor Fashion",
  description: "Manage internal inventory movements and transfers between warehouses.",
};

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const supabase = createAdminClient();

  const [
    transfersRes,
    whRes,
    varRes,
  ] = await Promise.all([
    supabase
      .from("stock_movements")
      .select(`
        *,
        variants(id, sku, attributes, product:products(name)),
        warehouses!warehouse_id(id, name, warehouse_code)
      `)
      .or("reason.ilike.%TRANSFER%,reason_code.ilike.%TRANSFER%")
      .order("created_at", { ascending: false })
      .limit(100),
    getWarehouses(),
    getVariants(),
  ]);

  const mappedTransfers = (transfersRes.data || []).map((t: any) => {
    const pName = t.variants?.product?.name || "Product";
    const sku = t.variants?.sku || "";
    const attr = t.variants?.attributes
      ? Object.values(t.variants.attributes).filter(Boolean).join(" / ")
      : "";
    const friendlyName = attr
      ? `${pName} (${sku} - ${attr})`
      : sku
      ? `${pName} (${sku})`
      : pName;

    return {
      ...t,
      quantity: t.quantity_change !== undefined ? t.quantity_change : t.quantity || 0,
      variants: {
        ...t.variants,
        name: friendlyName,
      },
    };
  });

  return (
    <StockTransfersClient
      transfers={mappedTransfers}
      allWarehouses={whRes.success && whRes.data ? whRes.data : []}
      allVariants={varRes.success && varRes.data ? varRes.data : []}
    />
  );
}
