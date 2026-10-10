import { StockMovementRepository } from "@/lib/repositories/inventory/stock-movement.repository";
import { StockMovementClient } from "@/features/inventory/components/StockMovementClient";
import { getWarehouses, getVariants } from "@/app/actions/admin/procurement.actions";

export const metadata = {
  title: "Stock Movement | Inventory | Anchor Fashion Enterprise",
};

export const dynamic = "force-dynamic";

export default async function AdminStockMovementPage() {
  const [movements, whRes, varRes] = await Promise.all([
    StockMovementRepository.getMovements(),
    getWarehouses(),
    getVariants(),
  ]);

  return (
    <StockMovementClient
      movements={movements || []}
      allWarehouses={whRes.success && whRes.data ? whRes.data : []}
      allVariants={varRes.success && varRes.data ? varRes.data : []}
    />
  );
}
