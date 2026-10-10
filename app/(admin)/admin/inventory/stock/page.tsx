import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { StockControlClient } from "@/features/inventory/components/StockControlClient";

export const metadata: Metadata = {
  title: "Stock Control | Anchor Fashion",
  description: "Monitor and adjust real-time inventory levels across warehouses.",
};

export default async function StockControlPage() {
  const supabase = createAdminClient();

  const [
    invRes,
    whRes,
    varRes,
    supRes,
  ] = await Promise.all([
    supabase
      .from("inventory_levels")
      .select("*, variants(id, sku, barcode, attributes, price_override, sale_price, product:products(id, name, sku, base_price, cost_price)), warehouses(id, name, is_active)")
      .order("quantity_available", { ascending: true }),
    supabase
      .from("warehouses")
      .select("id, name, is_active")
      .order("name", { ascending: true }),
    supabase
      .from("variants")
      .select("id, sku, barcode, price_override, sale_price, attributes, product:products(id, name, sku, base_price, cost_price)")
      .order("sku", { ascending: true }),
    supabase
      .from("supplier_profiles")
      .select("id, company_name, contact_person, email, phone")
      .order("company_name", { ascending: true }),
  ]);

  const inventory = invRes.data || [];
  const allWarehouses = whRes.data || [];
  const allVariants = varRes.data || [];
  const allSuppliers = supRes.data || [];

  return (
    <StockControlClient
      inventory={inventory}
      allWarehouses={allWarehouses}
      allVariants={allVariants}
      allSuppliers={allSuppliers}
    />
  );
}
