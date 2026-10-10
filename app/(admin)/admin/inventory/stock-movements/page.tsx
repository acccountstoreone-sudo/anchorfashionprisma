import { Metadata } from "next";
import { getAllWarehouses, getDetailedMovementsAction } from "@/actions/warehouse.actions";
import { StockMovementsClient } from "@/features/warehouse/components/StockMovementsClient";

export const metadata: Metadata = {
  title: "Stock Movements Audit Log | Anchor Fashion ERP",
  description: "Comprehensive immutable ledger of inventory transactions, receipts, dispatches, and transfers.",
};

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouse_id?: string }>;
}) {
  const { warehouse_id } = await searchParams;

  const [movementsRes, warehousesRes] = await Promise.all([
    getDetailedMovementsAction({
      warehouseId: warehouse_id,
      limit: 100,
    }),
    getAllWarehouses(),
  ]);

  const movements = movementsRes.data?.data || [];
  const warehouses = warehousesRes.data || [];

  return (
    <div className="space-y-6 max-w-full">
      <StockMovementsClient
        initialMovements={movements}
        allWarehouses={warehouses}
        initialWarehouseId={warehouse_id || "all"}
      />
    </div>
  );
}
