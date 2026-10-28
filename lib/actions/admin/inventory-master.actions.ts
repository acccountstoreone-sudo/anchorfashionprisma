"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { invalidateProductCache } from "@/lib/cache/invalidate-catalog";

import { generateEAN13Sync } from "@/lib/utils/barcode";
import { generateUniqueProductCode, formatVariantSku } from "@/lib/utils/product-code";

export async function generateEAN13BarcodeAction(prefix = "89420"): Promise<string> {
  return generateEAN13Sync(prefix);
}

export async function generateProductCodeAction(params: {
  productName: string;
  categoryNameOrId?: string;
  brandPrefix?: string;
}): Promise<string> {
  let categoryNameOrSlug = params.categoryNameOrId;
  if (params.categoryNameOrId && params.categoryNameOrId.length > 20) {
    try {
      const cat = await prisma.category.findUnique({
        where: { id: params.categoryNameOrId },
        select: { name: true, slug: true },
      });
      if (cat) categoryNameOrSlug = cat.name || cat.slug;
    } catch (_) {}
  }
  return await generateUniqueProductCode(params.productName, categoryNameOrSlug, params.brandPrefix || "AF");
}

export interface ColorSizeMatrixItem {
  color: string;
  sizes: Array<{
    size: string;
    quantity: number;
    sku?: string;
    barcode?: string;
  }>;
}

export interface InventoryMasterIntakeInput {
  name: string;
  categoryId: string;
  basePrice: number;
  costPrice: number;
  totalQuantity: number;
  colorVariants: ColorSizeMatrixItem[];
  publishImmediately?: boolean;
  warehouseId?: string;
  notes?: string;
  skuPrefix?: string;
  barcodeBase?: string;
}

/**
 * Ensure an active central warehouse exists and return its ID
 */
async function ensureDefaultWarehouseId(preferredId?: string): Promise<string> {
  if (preferredId) {
    const wh = await prisma.warehouse.findUnique({
      where: { id: preferredId },
      select: { id: true },
    });
    if (wh) return wh.id;
  }

  const existing = await prisma.warehouse.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.warehouse.create({
    data: {
      name: "Main Central Warehouse",
      code: "WH-MAIN-01",
      address: "Dhaka, Bangladesh",
      city: "Dhaka",
      country: "BD",
      isActive: true,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Create master product and variants in Inventory with automatic stock division and barcodes
 */
export async function createInventoryMasterIntakeAction(input: InventoryMasterIntakeInput) {
  try {
    const {
      name,
      categoryId,
      basePrice,
      costPrice,
      colorVariants,
      publishImmediately = false,
      warehouseId,
      notes,
    } = input;

    if (!name?.trim()) throw new Error("Product name is required.");
    if (!categoryId) throw new Error("Please select a category.");
    if (basePrice <= 0) throw new Error("Selling price must be greater than zero.");
    if (costPrice < 0) throw new Error("Cost price cannot be negative.");

    const warehouse = await ensureDefaultWarehouseId(warehouseId);

    // Fetch category for SKU/slug building
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, slug: true },
    });

    const prodSlugPart = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    // Unique slug generator
    let slug = prodSlugPart;
    let slugCounter = 1;
    while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${prodSlugPart}-${slugCounter++}`;
    }

    // Base SKU and Barcode (Short dynamic unique clothing brand style code e.g. AFPTS1)
    const baseSku = input.skuPrefix?.trim() || (await generateUniqueProductCode(name, category?.name || category?.slug));
    const baseBarcode = input.barcodeBase?.trim() || generateEAN13Sync();

    const status = publishImmediately ? "ACTIVE" : "DRAFT";

    // Pre-calculate all variant plans in memory before DB transaction
    interface PreparedVariant {
      sku: string;
      barcode: string;
      color: string;
      size: string;
      quantity: number;
    }
    const preparedVariants: PreparedVariant[] = [];

    for (const cv of colorVariants) {
      const colorName = cv.color.trim();

      for (const sz of cv.sizes) {
        const sizeName = sz.size.trim();
        const variantSku = sz.sku?.trim() || formatVariantSku(baseSku, colorName, sizeName);
        const variantBarcode = sz.barcode?.trim() || generateEAN13Sync();
        const qty = Math.max(0, Number(sz.quantity) || 0);

        preparedVariants.push({
          sku: variantSku,
          barcode: variantBarcode,
          color: colorName,
          size: sizeName,
          quantity: qty,
        });
      }
    }

    // 1. Create Master Product, ProductCategory, Variants and InventoryLevels in a single nested write
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug,
        basePrice,
        costPrice,
        sku: baseSku,
        barcode: baseBarcode,
        status,
        categoryId,
        isFeatured: false,
        isNewArrival: true,
        shortDescription: notes || `Master inventory intake of ${name.trim()}`,
        productCategories: {
          create: {
            categoryId,
          },
        },
        variants: {
          create: preparedVariants.map((pv) => ({
            sku: pv.sku,
            barcode: pv.barcode,
            priceOverride: basePrice,
            costPrice,
            attributes: {
              Color: pv.color,
              Size: pv.size,
            },
            isActive: true,
            inventoryLevels: {
              create: {
                warehouseId: warehouse,
                quantityAvailable: pv.quantity,
                quantityReserved: 0,
                reorderPoint: 5,
              },
            },
          })),
        },
      },
      include: {
        variants: {
          include: {
            inventoryLevels: true,
          },
        },
      },
    });

    // 2. Create StockMovements in bulk for variants with initial stock
    const movementRecords = product.variants
      .filter((v) => (v.inventoryLevels[0]?.quantityAvailable || 0) > 0)
      .map((v) => {
        const qty = v.inventoryLevels[0].quantityAvailable;
        const color = (v.attributes as any)?.Color || "";
        const size = (v.attributes as any)?.Size || "";
        return {
          variantId: v.id,
          warehouseId: warehouse,
          movementType: "IN" as const,
          quantity: qty,
          previousQuantity: 0,
          newQuantity: qty,
          referenceType: "INITIAL_INTAKE",
          referenceId: product.id,
          notes: `Initial stock intake: ${name} (${color} - ${size})`,
        };
      });

    if (movementRecords.length > 0) {
      await prisma.stockMovement.createMany({
        data: movementRecords,
      });
    }

    const createdVariants = product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode,
      color: (v.attributes as any)?.Color || "",
      size: (v.attributes as any)?.Size || "",
      quantity: v.inventoryLevels[0]?.quantityAvailable || 0,
    }));

    const totalCreatedVariants = createdVariants.length;
    const totalStockUnits = createdVariants.reduce((sum, v) => sum + v.quantity, 0);

    const result = {
      product,
      variants: createdVariants,
      totalCreatedVariants,
      totalStockUnits,
    };

    try {
      revalidatePath("/admin/inventory");
      revalidatePath("/admin/inventory/stock");
      revalidatePath("/admin/products");
      revalidatePath("/manager/inventory");
      revalidatePath("/shop");
      invalidateProductCache(result.product.slug);
    } catch (_) {}

    return {
      success: true,
      data: result,
      message: `Successfully created master product "${name}" with ${result.totalCreatedVariants} variants and ${result.totalStockUnits} stock units in Inventory.`,
    };
  } catch (error: any) {
    console.error("Error creating inventory master intake:", error);
    return {
      success: false,
      error: error?.message || "Failed to create master product intake.",
    };
  }
}

/**
 * Get inventory master items with stock, profit margins, and publish statuses
 */
export async function getInventoryMasterListAction(params?: {
  search?: string;
  status?: string;
  categoryId?: string;
  limit?: number;
  page?: number;
}) {
  try {
    const search = params?.search?.trim() || "";
    const status = params?.status || "ALL";
    const categoryId = params?.categoryId;
    const limit = params?.limit || 50;
    const page = params?.page || 1;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } },
        {
          variants: {
            some: {
              OR: [
                { sku: { contains: search, mode: "insensitive" } },
                { barcode: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    if (status !== "ALL") {
      where.status = status;
    }

    if (categoryId && categoryId !== "ALL") {
      // Find all subcategories under categoryId recursively
      const allCategories = await prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, parentId: true },
      });
      const matchingCategoryIds = new Set<string>([categoryId]);
      let added = true;
      while (added) {
        added = false;
        for (const cat of allCategories) {
          if (cat.parentId && matchingCategoryIds.has(cat.parentId) && !matchingCategoryIds.has(cat.id)) {
            matchingCategoryIds.add(cat.id);
            added = true;
          }
        }
      }
      const categoryIdList = Array.from(matchingCategoryIds);

      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { categoryId: { in: categoryIdList } },
            { productCategories: { some: { categoryId: { in: categoryIdList } } } },
          ],
        },
      ];
    }

    const [products, total, categoryGroupCounts] = await Promise.all([
      prisma.product.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              parentId: true,
              parent: { select: { id: true, name: true } },
            },
          },
          productCategories: {
            select: {
              categoryId: true,
              category: { select: { id: true, name: true } },
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              altText: true,
              isPrimary: true,
              mediaType: true,
              displayOrder: true,
            },
            orderBy: { displayOrder: "asc" },
          },
          variants: {
            include: {
              inventoryLevels: true,
              branchTransfers: {
                select: { quantity: true, status: true },
              },
              orderItems: {
                where: {
                  order: {
                    status: { not: "CANCELLED" },
                  },
                },
                select: {
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
                },
              },
            },
          },
        },
      }),
      prisma.product.count({ where }),
      prisma.product.groupBy({
        by: ["categoryId"],
        _count: { id: true },
        where: { deletedAt: null },
      }),
    ]);

    const categoryCounts: Record<string, number> = {};
    for (const group of categoryGroupCounts) {
      if (group.categoryId) {
        categoryCounts[group.categoryId] = group._count.id;
      }
    }

    const items = products.map((p) => {
      let totalAvailable = 0;
      let totalReserved = 0;
      let totalDispatched = 0;
      let totalSold = 0;
      let totalSoldRevenue = 0;

      for (const v of p.variants) {
        for (const l of v.inventoryLevels) {
          totalAvailable += l.quantityAvailable || 0;
          totalReserved += l.quantityReserved || 0;
        }
        for (const bt of v.branchTransfers) {
          if (bt.status === "DISPATCHED" || bt.status === "RECEIVED") {
            totalDispatched += bt.quantity || 0;
          }
        }
        for (const oi of (v as any).orderItems || []) {
          const qty = Number(oi.quantity || 0);
          totalSold += qty;
          totalSoldRevenue += Number(oi.totalPrice || (oi.unitPrice ? Number(oi.unitPrice) * qty : 0));
        }
      }

      const totalInflow = totalAvailable + totalReserved + totalDispatched + totalSold;
      const sellThroughRate = totalInflow > 0 ? Math.round((totalSold / totalInflow) * 1000) / 10 : 0;

      const sellingPrice = Number(p.basePrice || 0);
      const costPrice = Number(p.costPrice || 0);
      const unitProfit = sellingPrice - costPrice;
      const profitMarginPercent = sellingPrice > 0 ? (unitProfit / sellingPrice) * 100 : 0;

      const totalCostValue = totalAvailable * costPrice;
      const totalRetailValue = totalAvailable * sellingPrice;

      const categoryPath = p.category?.parent
        ? `${p.category.parent.name} › ${p.category.name}`
        : p.category?.name || "Uncategorized";

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku || "N/A",
        barcode: p.barcode || "N/A",
        status: p.status, // "DRAFT" = Inventory Intake only, "ACTIVE" = Published to Store
        category: p.category?.name || "Uncategorized",
        categoryId: p.categoryId,
        categoryPath,
        parentCategory: p.category?.parent ? p.category.parent.name : null,
        categoryIds: (p as any).productCategories?.length
          ? (p as any).productCategories.map((pc: any) => pc.categoryId).filter(Boolean)
          : p.categoryId
          ? [p.categoryId]
          : [],
        categories: (p as any).productCategories?.length
          ? (p as any).productCategories.map((pc: any) => pc.category?.name).filter(Boolean)
          : p.category?.name
          ? [p.category.name]
          : [],
        basePrice: sellingPrice,
        costPrice,
        unitProfit,
        profitMarginPercent: Math.round(profitMarginPercent * 10) / 10,
        totalAvailable,
        totalReserved,
        totalDispatched,
        totalSold,
        totalSoldRevenue,
        totalInflow,
        sellThroughRate,
        totalCostValue,
        totalRetailValue,
        media: p.media || [],
        variantCount: p.variants.length,
        variants: p.variants.map((v) => {
          const avail = v.inventoryLevels.reduce((s, l) => s + (l.quantityAvailable || 0), 0);
          const res = v.inventoryLevels.reduce((s, l) => s + (l.quantityReserved || 0), 0);
          const sold = ((v as any).orderItems || []).reduce((s: number, oi: any) => s + (Number(oi.quantity) || 0), 0);
          return {
            id: v.id,
            sku: v.sku,
            barcode: v.barcode,
            attributes: v.attributes,
            available: avail,
            reserved: res,
            sold,
            price: Number(v.priceOverride || p.basePrice || 0),
            cost: Number(v.costPrice || p.costPrice || 0),
          };
        }),
        createdAt: p.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        categoryCounts,
      },
    };
  } catch (error: any) {
    console.error("Error in getInventoryMasterListAction:", error);
    return {
      success: false,
      error: error?.message || "Failed to load master inventory list.",
    };
  }
}

/**
 * Dispatch stock transfer from warehouse to a retail branch
 */
export async function dispatchToBranchAction(input: {
  sourceWarehouseId: string;
  destinationBranchId: string;
  variantId: string;
  quantity: number;
  notes?: string;
  dispatchedBy?: string;
}) {
  try {
    const { sourceWarehouseId, destinationBranchId, variantId, quantity, notes, dispatchedBy } = input;

    if (!sourceWarehouseId) throw new Error("Source warehouse is required.");
    if (!destinationBranchId) throw new Error("Destination branch is required.");
    if (!variantId) throw new Error("Product variant is required.");
    if (!quantity || quantity <= 0) throw new Error("Quantity must be greater than zero.");

    // Check variant and inventory level
    const level = await prisma.inventoryLevel.findUnique({
      where: {
        variantId_warehouseId: {
          variantId,
          warehouseId: sourceWarehouseId,
        },
      },
      include: {
        variant: {
          include: {
            product: {
              select: { name: true, basePrice: true, costPrice: true },
            },
          },
        },
      },
    });

    if (!level) {
      throw new Error("Inventory record not found in the source warehouse.");
    }

    if (level.quantityAvailable < quantity) {
      throw new Error(
        `Insufficient available stock. Requested ${quantity}, but only ${level.quantityAvailable} units are available.`
      );
    }

    const branch = await prisma.branches.findUnique({
      where: { id: destinationBranchId },
      select: { id: true, name: true, code: true },
    });
    if (!branch) throw new Error("Destination branch not found.");

    const transferNumber = `TRF-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;
    const unitPrice = level.variant.priceOverride || level.variant.product.basePrice || 0;
    const unitCost = level.variant.costPrice || level.variant.product.costPrice || 0;

    const executeTransfer = () =>
      prisma.$transaction(
        async (tx) => {
          // 1. Decrement warehouse stock
          await tx.inventoryLevel.update({
            where: { id: level.id },
            data: {
              quantityAvailable: level.quantityAvailable - quantity,
            },
          });

          // 2. Create branch transfer record
          const transfer = await tx.branchTransfer.create({
            data: {
              transferNumber,
              sourceWarehouseId,
              destinationBranchId,
              variantId,
              quantity,
              status: "DISPATCHED",
              unitCost,
              unitPrice,
              notes: notes || `Dispatched to ${branch.name}`,
              dispatchedBy,
            },
            include: {
              branch: { select: { id: true, name: true, code: true } },
              variant: {
                select: {
                  sku: true,
                  barcode: true,
                  attributes: true,
                  product: { select: { name: true } },
                },
              },
            },
          });

          // 3. Log stock movement
          await tx.stockMovement.create({
            data: {
              variantId,
              warehouseId: sourceWarehouseId,
              movementType: "OUT",
              quantity: -quantity,
              previousQuantity: level.quantityAvailable,
              newQuantity: level.quantityAvailable - quantity,
              referenceType: "BRANCH_TRANSFER",
              referenceId: transfer.id,
              notes: `Sent ${quantity} units to branch: ${branch.name} (${transferNumber})`,
            },
          });

          return transfer;
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      );

    let result;
    try {
      result = await executeTransfer();
    } catch (txErr: any) {
      if (txErr?.code === "P2028" || txErr?.message?.includes("Transaction not found")) {
        console.warn("[dispatchToBranchAction] Pooler transaction timed out, retrying once...");
        result = await executeTransfer();
      } else {
        throw txErr;
      }
    }

    try {
      revalidatePath("/admin/inventory");
      revalidatePath("/admin/inventory/transfers");
      revalidatePath("/admin/inventory/stock");
    } catch (_) {}

    return {
      success: true,
      data: result,
      message: `Successfully transferred ${quantity} units to ${branch.name} (Transfer #${transferNumber}).`,
    };
  } catch (error: any) {
    console.error("Error dispatching branch transfer:", error);
    return {
      success: false,
      error: error?.message || "Failed to dispatch branch transfer.",
    };
  }
}

/**
 * Get Branch Dispatch Report (How many products sent to which branch)
 */
export async function getBranchTransfersReportAction(params?: {
  branchId?: string;
  limit?: number;
}) {
  try {
    const limit = params?.limit || 100;
    const branchWhere = params?.branchId ? { destinationBranchId: params.branchId } : undefined;

    const [transfers, allBranches] = await Promise.all([
      prisma.branchTransfer.findMany({
        where: branchWhere,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true, code: true, address: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          variant: {
            include: {
              product: { select: { id: true, name: true, basePrice: true, costPrice: true } },
            },
          },
        },
      }),
      prisma.branches.findMany({
        where: { is_active: true },
        select: { id: true, name: true, code: true, address: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // Aggregate summary per branch
    const branchMap = new Map<string, {
      branchId: string;
      branchName: string;
      branchCode: string;
      totalUnits: number;
      totalCostValue: number;
      totalRetailValue: number;
      transferCount: number;
      lastDispatchDate: string | null;
    }>();

    for (const b of allBranches) {
      branchMap.set(b.id, {
        branchId: b.id,
        branchName: b.name,
        branchCode: b.code || "BR",
        totalUnits: 0,
        totalCostValue: 0,
        totalRetailValue: 0,
        transferCount: 0,
        lastDispatchDate: null,
      });
    }

    let overallUnitsSent = 0;
    let overallCostSent = 0;
    let overallRetailSent = 0;

    for (const t of transfers) {
      const bInfo = branchMap.get(t.destinationBranchId);
      const cost = Number(t.unitCost || 0) * t.quantity;
      const retail = Number(t.unitPrice || 0) * t.quantity;

      overallUnitsSent += t.quantity;
      overallCostSent += cost;
      overallRetailSent += retail;

      if (bInfo) {
        bInfo.totalUnits += t.quantity;
        bInfo.totalCostValue += cost;
        bInfo.totalRetailValue += retail;
        bInfo.transferCount += 1;
        if (!bInfo.lastDispatchDate && t.dispatchedAt) {
          bInfo.lastDispatchDate = t.dispatchedAt.toISOString();
        }
      }
    }

    return {
      success: true,
      data: {
        summary: {
          overallUnitsSent,
          overallCostSent,
          overallRetailSent,
          totalTransfers: transfers.length,
          branchesCount: allBranches.length,
        },
        branchSummaries: Array.from(branchMap.values()).sort((a, b) => b.totalUnits - a.totalUnits),
        recentTransfers: transfers.map((t) => ({
          id: t.id,
          transferNumber: t.transferNumber,
          branchName: t.branch?.name || "Unknown Branch",
          warehouseName: t.warehouse?.name || "Central Warehouse",
          productName: t.variant?.product?.name || "Apparel Item",
          sku: t.variant?.sku || "",
          attributes: t.variant?.attributes,
          quantity: t.quantity,
          unitCost: Number(t.unitCost || 0),
          unitPrice: Number(t.unitPrice || 0),
          totalCost: Number(t.unitCost || 0) * t.quantity,
          totalRetail: Number(t.unitPrice || 0) * t.quantity,
          status: t.status,
          dispatchedAt: t.dispatchedAt ? t.dispatchedAt.toISOString() : null,
          notes: t.notes,
        })),
        branches: allBranches,
      },
    };
  } catch (error: any) {
    console.error("Error in getBranchTransfersReportAction:", error);
    return {
      success: false,
      error: error?.message || "Failed to load branch transfers report.",
    };
  }
}

/**
 * Get Comprehensive POS + Inventory Financial & Profit Valuation Report
 */
export async function getInventoryFinancialReportAction() {
  try {
    const [products, inventoryLevels, branchTransfers, orderItems] = await Promise.all([
      prisma.product.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          sku: true,
          status: true,
          basePrice: true,
          costPrice: true,
          category: { select: { name: true } },
          variants: {
            select: {
              id: true,
              sku: true,
              priceOverride: true,
              costPrice: true,
            },
          },
        },
      }),
      prisma.inventoryLevel.findMany({
        select: {
          variantId: true,
          quantityAvailable: true,
          quantityReserved: true,
        },
      }),
      prisma.branchTransfer.findMany({
        select: {
          variantId: true,
          quantity: true,
        },
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            status: { not: "CANCELLED" },
          },
        },
        select: {
          variantId: true,
          productId: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
        },
      }),
    ]);

    // Create variant stock map
    const stockMap = new Map<string, { available: number; reserved: number }>();
    for (const l of inventoryLevels) {
      const cur = stockMap.get(l.variantId) || { available: 0, reserved: 0 };
      stockMap.set(l.variantId, {
        available: cur.available + (l.quantityAvailable || 0),
        reserved: cur.reserved + (l.quantityReserved || 0),
      });
    }

    // Branch dispatched map
    const dispatchedMap = new Map<string, number>();
    for (const bt of branchTransfers) {
      dispatchedMap.set(bt.variantId, (dispatchedMap.get(bt.variantId) || 0) + bt.quantity);
    }

    // Sales map per variant
    const soldMap = new Map<string, { quantity: number; revenue: number }>();
    for (const oi of orderItems) {
      if (oi.variantId) {
        const cur = soldMap.get(oi.variantId) || { quantity: 0, revenue: 0 };
        const qty = Number(oi.quantity || 0);
        const rev = Number(oi.totalPrice || (oi.unitPrice ? Number(oi.unitPrice) * qty : 0));
        soldMap.set(oi.variantId, {
          quantity: cur.quantity + qty,
          revenue: cur.revenue + rev,
        });
      }
    }

    let totalStockUnits = 0;
    let totalReservedUnits = 0;
    let totalStockCostValue = 0;
    let totalStockRetailValue = 0;
    let totalDispatchedUnits = 0;
    let totalSoldUnits = 0;
    let totalRealizedRevenue = 0;
    let totalRealizedProfit = 0;

    const productBreakdown = products.map((p) => {
      let pAvailable = 0;
      let pReserved = 0;
      let pDispatched = 0;
      let pSold = 0;
      let pSoldRevenue = 0;

      for (const v of p.variants) {
        const s = stockMap.get(v.id) || { available: 0, reserved: 0 };
        pAvailable += s.available;
        pReserved += s.reserved;
        pDispatched += dispatchedMap.get(v.id) || 0;

        const soldInfo = soldMap.get(v.id) || { quantity: 0, revenue: 0 };
        pSold += soldInfo.quantity;
        pSoldRevenue += soldInfo.revenue;
      }

      const retail = Number(p.basePrice || 0);
      const cost = Number(p.costPrice || 0);
      const unitProfit = retail - cost;
      const marginPercent = retail > 0 ? (unitProfit / retail) * 100 : 0;
      const costValuation = pAvailable * cost;
      const retailValuation = pAvailable * retail;
      const pRealizedProfit = pSoldRevenue - (pSold * cost);

      const pTotalInflow = pAvailable + pReserved + pDispatched + pSold;
      const pSellThroughRate = pTotalInflow > 0 ? Math.round((pSold / pTotalInflow) * 1000) / 10 : 0;

      totalStockUnits += pAvailable;
      totalReservedUnits += pReserved;
      totalStockCostValue += costValuation;
      totalStockRetailValue += retailValuation;
      totalDispatchedUnits += pDispatched;
      totalSoldUnits += pSold;
      totalRealizedRevenue += pSoldRevenue;
      totalRealizedProfit += pRealizedProfit;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku || "N/A",
        category: p.category?.name || "General",
        status: p.status,
        basePrice: retail,
        costPrice: cost,
        unitProfit,
        marginPercent: Math.round(marginPercent * 10) / 10,
        inStock: pAvailable,
        reserved: pReserved,
        dispatched: pDispatched,
        soldUnits: pSold,
        soldRevenue: pSoldRevenue,
        realizedProfit: pRealizedProfit,
        totalInflow: pTotalInflow,
        sellThroughRate: pSellThroughRate,
        costValuation,
        retailValuation,
        projectedProfit: retailValuation - costValuation,
      };
    });

    const totalProjectedGrossProfit = totalStockRetailValue - totalStockCostValue;
    const overallGrossMargin = totalStockRetailValue > 0
      ? (totalProjectedGrossProfit / totalStockRetailValue) * 100
      : 0;

    const totalInflowAll = totalStockUnits + totalReservedUnits + totalDispatchedUnits + totalSoldUnits;
    const overallSellThroughRate = totalInflowAll > 0
      ? Math.round((totalSoldUnits / totalInflowAll) * 1000) / 10
      : 0;

    return {
      success: true,
      data: {
        summary: {
          totalProducts: products.length,
          totalInStockUnits: totalStockUnits,
          totalReservedUnits: totalReservedUnits,
          totalDispatchedUnits: totalDispatchedUnits,
          totalSoldUnits,
          totalRealizedRevenue,
          totalRealizedProfit,
          overallSellThroughRate,
          totalStockCostValue,
          totalStockRetailValue,
          totalProjectedGrossProfit,
          overallGrossMargin: Math.round(overallGrossMargin * 10) / 10,
        },
        products: productBreakdown.sort((a, b) => b.retailValuation - a.retailValuation),
      },
    };
  } catch (error: any) {
    console.error("Error in getInventoryFinancialReportAction:", error);
    return {
      success: false,
      error: error?.message || "Failed to generate financial report.",
    };
  }
}

/**
 * Toggle publish status of product (DRAFT <-> ACTIVE)
 */
export async function toggleProductPublishStatusAction(productId: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true, slug: true, name: true },
    });

    if (!product) throw new Error("Product not found.");

    const newStatus = product.status === "ACTIVE" ? "DRAFT" : "ACTIVE";

    await prisma.product.update({
      where: { id: productId },
      data: { status: newStatus },
      select: { id: true, status: true, name: true, slug: true },
    });

    try {
      revalidatePath("/admin/inventory");
      revalidatePath("/admin/products");
      revalidatePath("/manager/inventory");
      revalidatePath("/shop");
      invalidateProductCache(product.slug);
    } catch (_) {}

    return {
      success: true,
      status: newStatus,
      message: `Product "${product.name}" is now ${newStatus === "ACTIVE" ? "PUBLISHED (Live on Website)" : "DRAFT (Saved in Inventory)"}.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to update publish status.",
    };
  }
}
