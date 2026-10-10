"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

export async function getSupplierProfiles() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("supplier_profiles")
    .select("id, company_name, contact_person, email, phone, status")
    .order("company_name", { ascending: true });
    
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: (data || []).map((s: any) => ({
      id: s.id,
      name: s.company_name,
      company_name: s.company_name,
      contact_person: s.contact_person || "",
      email: s.email || "",
      phone: s.phone || "",
      status: s.status || "ACTIVE",
    })),
  };
}

export async function createSupplierProfileAction(data: {
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  performance_score?: number;
  status?: string;
}) {
  try {
    const supabase = createAdminClient();
    const cleanCompany = data.company_name.trim();
    const cleanStatus = (data.status || "ACTIVE").toUpperCase();
    const cleanEmail = data.email?.trim() ? data.email.trim().toLowerCase() : null;

    // Check duplicate email beforehand to provide helpful message
    if (cleanEmail) {
      const { data: existingSupplier } = await supabase
        .from("supplier_profiles")
        .select("company_name, email")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (existingSupplier) {
        return {
          success: false,
          error: `A supplier with email "${cleanEmail}" already exists (${existingSupplier.company_name}). Please use a different email address.`,
        };
      }
    }

    const { data: supplier, error } = await supabase
      .from("supplier_profiles")
      .insert({
        company_name: cleanCompany,
        contact_person: data.contact_person?.trim() || null,
        email: cleanEmail,
        phone: data.phone?.trim() || null,
        performance_score: Number(data.performance_score) || 5.0,
        status: cleanStatus,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505" || error.message?.includes("supplier_profiles_email_key")) {
        return {
          success: false,
          error: `A supplier with this email already exists. Each supplier must have a unique email address.`,
        };
      }
      return { success: false, error: error.message };
    }

    // Also sync into `suppliers` table for compatibility
    try {
      await supabase.from("suppliers").upsert({
        id: supplier.id,
        name: cleanCompany,
        contact_email: cleanEmail,
        contact_phone: data.phone?.trim() || null,
        lead_time_days: 7,
        rating: Number(data.performance_score) || 5.0,
      });
    } catch {
      // ignore
    }

    try {
      revalidatePath("/admin/inventory/suppliers");
      revalidatePath("/admin/inventory/stock");
      revalidatePath("/admin/inventory/purchases");
    } catch {}

    return { success: true, data: supplier };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create supplier profile" };
  }
}

export async function updateSupplierProfileAction(
  id: string,
  data: Partial<{
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
    performance_score: number;
    status: string;
  }>
) {
  try {
    const supabase = createAdminClient();
    const cleanEmail =
      data.email !== undefined
        ? data.email?.trim()
          ? data.email.trim().toLowerCase()
          : null
        : undefined;

    // Check duplicate email across other suppliers
    if (cleanEmail) {
      const { data: existingSupplier } = await supabase
        .from("supplier_profiles")
        .select("id, company_name, email")
        .ilike("email", cleanEmail)
        .neq("id", id)
        .maybeSingle();

      if (existingSupplier) {
        return {
          success: false,
          error: `Another supplier (${existingSupplier.company_name}) is already using the email "${cleanEmail}". Please use a different email address.`,
        };
      }
    }

    const updatePayload: any = { ...data };
    if (cleanEmail !== undefined) {
      updatePayload.email = cleanEmail;
    }
    if (data.company_name) {
      updatePayload.company_name = data.company_name.trim();
    }
    if (data.status) {
      updatePayload.status = data.status.toUpperCase();
    }

    const { data: updated, error } = await supabase
      .from("supplier_profiles")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505" || error.message?.includes("supplier_profiles_email_key")) {
        return {
          success: false,
          error: `A supplier with this email already exists. Each supplier must have a unique email address.`,
        };
      }
      return { success: false, error: error.message };
    }

    // Sync to suppliers table as well
    try {
      await supabase.from("suppliers").update({
        name: data.company_name?.trim(),
        contact_email: cleanEmail,
        contact_phone: data.phone?.trim(),
        rating: data.performance_score,
      }).eq("id", id);
    } catch {}

    try {
      revalidatePath("/admin/inventory/suppliers");
    } catch {}

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update supplier profile" };
  }
}

export async function deleteSupplierProfileAction(id: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("supplier_profiles")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    try {
      await supabase.from("suppliers").delete().eq("id", id);
    } catch {}

    try {
      revalidatePath("/admin/inventory/suppliers");
    } catch {}

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete supplier profile" };
  }
}

export async function getWarehouses() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("warehouses")
    .select("id, name, warehouse_code, is_active")
    .order("name", { ascending: true });
    
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: (data || [])
      .filter((w) => w.is_active !== false)
      .map((w: any) => ({
        id: w.id,
        name: w.name,
        code: w.warehouse_code || "",
        warehouse_code: w.warehouse_code || "",
        is_active: w.is_active,
      })),
  };
}

export async function getVariants() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("variants")
    .select("id, sku, price_override, sale_price, attributes, product:products(id, name, base_price, cost_price)")
    .limit(300);
    
  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: (data || []).map((v: any) => {
      const pName = v.product?.name || "Product";
      const attrStr = v.attributes ? Object.values(v.attributes).filter(Boolean).join(" / ") : "";
      const label = attrStr ? `${pName} (${v.sku} - ${attrStr})` : `${pName} (${v.sku})`;
      const price = Number(v.sale_price || v.price_override || v.product?.base_price || 0);
      const costPrice = Number(v.product?.cost_price || (price ? price * 0.6 : 0));
      return {
        id: v.id,
        sku: v.sku,
        name: label,
        title: label,
        product_name: pName,
        price,
        cost_price: costPrice,
      };
    }),
  };
}

export async function createProcurementOrder(
  poData: {
    po_number?: string;
    supplier_id: string;
    destination_warehouse_id: string;
    expected_delivery_date?: string;
    tax_rate?: number;
    notes?: string;
  },
  items: Array<{
    variant_id: string;
    quantity_ordered: number;
    unit_cost: number;
  }>
) {
  try {
    const supabase = createAdminClient();

    const validItems = (items || []).filter(
      (i) => i.variant_id && Number(i.quantity_ordered) > 0 && Number(i.unit_cost) >= 0
    );

    if (validItems.length === 0) {
      return { success: false, error: "At least one item with a valid quantity and cost is required." };
    }

    // 1. Authoritative server-side calculation of line item totals
    const processedItems = validItems.map((item) => {
      const qty = Math.max(1, Math.floor(Number(item.quantity_ordered) || 1));
      const cost = Math.max(0, Number(item.unit_cost) || 0);
      const lineTotal = Number((qty * cost).toFixed(2));
      return {
        variant_id: item.variant_id,
        quantity_ordered: qty,
        unit_cost: cost,
        total_cost: lineTotal,
      };
    });

    // 2. Authoritative server-side calculation of subtotal, tax, and grand total
    const subtotal = processedItems.reduce((acc, item) => acc + item.total_cost, 0);
    const taxRate = typeof poData.tax_rate === "number" && poData.tax_rate >= 0 ? poData.tax_rate : 0.05;
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const grandTotal = Number((subtotal + taxAmount).toFixed(2));

    const poNumber = poData.po_number || `PO-${Date.now().toString().slice(-6)}`;

    // 3. Insert Procurement Order with authoritative grand total
    const { data: po, error: poError } = await supabase
      .from("procurement_orders")
      .insert({
        po_number: poNumber,
        supplier_id: poData.supplier_id,
        destination_warehouse_id: poData.destination_warehouse_id,
        expected_delivery_date: poData.expected_delivery_date || null,
        total_amount: grandTotal,
        notes: poData.notes || `Subtotal: BDT ${subtotal.toFixed(2)}, Tax (${(taxRate * 100).toFixed(0)}%): BDT ${taxAmount.toFixed(2)}, Grand Total: BDT ${grandTotal.toFixed(2)}`,
        status: "DRAFT",
      })
      .select()
      .single();

    if (poError) return { success: false, error: poError.message };

    // 4. Insert Items with line totals
    const itemsToInsert = processedItems.map((item) => ({
      po_id: po.id,
      variant_id: item.variant_id,
      quantity_ordered: item.quantity_ordered,
      unit_cost: item.unit_cost,
      total_cost: item.total_cost,
    }));

    const { error: itemsError } = await supabase
      .from("procurement_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.warn("Could not insert with total_cost column, retrying with base columns:", itemsError);
      await supabase.from("procurement_items").insert(
        processedItems.map((item) => ({
          po_id: po.id,
          variant_id: item.variant_id,
          quantity_ordered: item.quantity_ordered,
          unit_cost: item.unit_cost,
        }))
      );
    }

    revalidatePath("/admin/inventory/purchases");
    revalidatePath("/admin/operations/procurement/purchase-orders");
    return {
      success: true,
      data: {
        id: po.id,
        po_number: poNumber,
        subtotal,
        taxAmount,
        grandTotal,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create procurement order" };
  }
}

export async function getProcurementOrderDetails(poId: string) {
  try {
    const supabase = createAdminClient();
    const { data: po, error: poErr } = await supabase
      .from("procurement_orders")
      .select("*, supplier_profiles(*), warehouses(*)")
      .eq("id", poId)
      .single();

    if (poErr) return { success: false, error: poErr.message };

    const { data: items, error: itemsErr } = await supabase
      .from("procurement_items")
      .select("*, variants(id, sku, name)")
      .eq("po_id", poId);

    return {
      success: true,
      data: {
        ...po,
        items: items || [],
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch PO details" };
  }
}

export async function updateProcurementOrderStatus(
  poId: string,
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SENT" | "PARTIAL_RECEIPT" | "DELIVERED" | "CANCELLED"
) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("procurement_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", poId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/inventory/purchases");
    revalidatePath("/admin/operations/procurement/purchase-orders");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update PO status" };
  }
}

export async function receiveProcurementOrderAction(poId: string, notes?: string) {
  try {
    const supabase = createAdminClient();

    // 1. Fetch PO and items
    const { data: po, error: poErr } = await supabase
      .from("procurement_orders")
      .select("*, procurement_items(*)")
      .eq("id", poId)
      .single();

    if (poErr || !po) {
      return { success: false, error: "Purchase order not found" };
    }

    if (po.status === "DELIVERED" || po.status === "FULFILLED") {
      return { success: false, error: "This purchase order has already been received." };
    }

    const destinationWarehouseId = po.destination_warehouse_id;
    if (!destinationWarehouseId) {
      return { success: false, error: "No destination warehouse assigned to this PO." };
    }

    const items = po.procurement_items || [];
    if (items.length === 0) {
      return { success: false, error: "Purchase order has no items to receive." };
    }

    // 2. Increment stock in inventory_levels for each item
    for (const item of items) {
      const variantId = item.variant_id;
      const qtyReceived = Number(item.quantity_ordered) || 0;
      if (!variantId || qtyReceived <= 0) continue;

      const { data: existingLevel } = await supabase
        .from("inventory_levels")
        .select("id, quantity_available")
        .eq("variant_id", variantId)
        .eq("warehouse_id", destinationWarehouseId)
        .maybeSingle();

      const previousQty = existingLevel?.quantity_available || 0;
      const newQty = previousQty + qtyReceived;

      if (existingLevel) {
        await supabase
          .from("inventory_levels")
          .update({
            quantity_available: newQty,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLevel.id);
      } else {
        await supabase.from("inventory_levels").insert({
          variant_id: variantId,
          warehouse_id: destinationWarehouseId,
          quantity_available: newQty,
          quantity_reserved: 0,
        });
      }

      // Record stock movement
      try {
        await supabase.from("stock_movements").insert({
          variant_id: variantId,
          warehouse_id: destinationWarehouseId,
          quantity_change: qtyReceived,
          reason: notes || `Goods received from PO: ${po.po_number || poId}`,
          reason_code: "PURCHASE_RECEIPT",
          reference_id: po.po_number || poId,
        });
      } catch (e: any) {
        console.warn("Could not insert stock_movements log:", e?.message);
      }
    }

    // 3. Mark PO as DELIVERED / FULFILLED
    await supabase
      .from("procurement_orders")
      .update({
        status: "DELIVERED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", poId);

    revalidatePath("/admin/inventory/purchases");
    revalidatePath("/admin/operations/procurement/purchase-orders");
    revalidatePath("/admin/inventory/stock");
    revalidatePath("/admin/inventory/movement");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to receive goods" };
  }
}

