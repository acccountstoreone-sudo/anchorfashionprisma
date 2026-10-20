import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import {
  getInventoryMasterListAction,
  getBranchTransfersReportAction,
  getInventoryFinancialReportAction,
} from "@/lib/actions/admin/inventory-master.actions";
import { InventoryMasterHubClient } from "@/components/admin/inventory/InventoryMasterHubClient";

export const metadata: Metadata = {
  title: "POS & Inventory Command Center | Anchor Fashion",
  description: "Master Inventory Intake, Barcode Generation, Branch Transfers & Profit Intelligence",
};

export const dynamic = "force-dynamic";

export default async function InventoryDashboardPage() {
  const [
    masterRes,
    branchRes,
    finRes,
    categories,
    warehouses,
    branches,
    rawVariants,
  ] = await Promise.all([
    getInventoryMasterListAction({ limit: 100 }),
    getBranchTransfersReportAction({ limit: 100 }),
    getInventoryFinancialReportAction(),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.branches.findMany({
      where: { is_active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.variant.findMany({
      where: { isActive: true },
      take: 200,
      select: {
        id: true,
        sku: true,
        barcode: true,
        attributes: true,
        product: { select: { name: true } },
        inventoryLevels: { select: { quantityAvailable: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const allVariants = rawVariants.map((v) => {
    const attr = v.attributes as any;
    const color = attr?.Color || attr?.color || "";
    const size = attr?.Size || attr?.size || "";
    const available = v.inventoryLevels.reduce((s, l) => s + (l.quantityAvailable || 0), 0);
    return {
      id: v.id,
      sku: v.sku,
      barcode: v.barcode || undefined,
      productName: v.product?.name || "Product",
      available,
      color,
      size,
    };
  });

  return (
    <div className="space-y-6">
      <InventoryMasterHubClient
        initialMasterData={masterRes.data}
        initialBranchReport={branchRes.data}
        initialFinancialReport={finRes.data}
        categories={categories}
        warehouses={warehouses}
        branches={branches}
        allVariants={allVariants}
      />
    </div>
  );
}
