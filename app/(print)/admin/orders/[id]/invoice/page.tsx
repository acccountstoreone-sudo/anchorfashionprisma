import React from "react";
import { getOrderDetailsAction } from "@/app/actions/oms/order.actions";
import { notFound, redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { STAFF_ROLES } from "@/lib/constants/auth";
import { InvoiceToolbar } from "@/components/print/invoice-toolbar";
import { InvoiceSheet, InvoiceData } from "@/components/print/invoice-sheet";

export default async function AdminPrintInvoicePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/admin");
  }

  // Basic authorization check
  let role = user.user_metadata?.role || user.app_metadata?.role;
  if (!role) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("roles(name)")
      .eq("id", user.id)
      .single();
    role = (profile?.roles as any)?.name || "CUSTOMER";
  }

  if (!STAFF_ROLES.includes(role)) {
    redirect("/account/profile");
  }

  const result = await getOrderDetailsAction(params.id);
  if (!result.success || !result.data) {
    return notFound();
  }

  const order = result.data as any;

  // Fetch courier shipments if available
  let activeShipment: any = null;
  try {
    const adminSupabase = await createAdminClient();
    const { data: shipments } = await adminSupabase
      .from("shipments")
      .select("*, courier_providers(name, logo_url)")
      .eq("order_id", order.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1);
    activeShipment = shipments?.[0] || null;
  } catch {
    // Non-critical, fallback
  }

  const items = (order.order_items && order.order_items.length > 0)
    ? order.order_items
    : (order.items || []);

  const shippingAddress =
    order.order_addresses?.find((a: any) => a.address_type === "SHIPPING") ||
    order.shippingAddress ||
    order.order_addresses?.[0] ||
    null;

  const invoiceNumber = order.invoice_number || (order.order_number ? order.order_number.replace(/^ORD-/, "INV-") : "INV-ADMIN");
  const orderNumber = order.order_number || order.id?.slice(0, 8).toUpperCase() || "ORD-0000";

  const orderDateObj = new Date(order.created_at || Date.now());
  const day = String(orderDateObj.getDate()).padStart(2, "0");
  const month = String(orderDateObj.getMonth() + 1).padStart(2, "0");
  const year = orderDateObj.getFullYear();
  const orderDate = `${day}-${month}-${year}`;

  const hours = String(orderDateObj.getHours()).padStart(2, "0");
  const minutes = String(orderDateObj.getMinutes()).padStart(2, "0");
  const seconds = String(orderDateObj.getSeconds()).padStart(2, "0");
  const orderTime = `${hours}:${minutes}:${seconds}`;

  const cleanNumericDigits = (order.id || "").replace(/\D/g, "").slice(0, 10);
  const barcodeValue = `${year.toString().slice(-2)}${month}${day}${cleanNumericDigits.padEnd(10, "0")}`;

  const printDate = `${day}-${month}-${year} ${orderTime}`;

  const customerName =
    order.customer?.full_name ||
    shippingAddress?.recipient_name ||
    (order.customer?.first_name ? `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim() : "") ||
    "Valued Customer";

  const customerPhone =
    shippingAddress?.phone ||
    order.customer?.phone ||
    "N/A";

  const customerEmail =
    order.customer?.email ||
    shippingAddress?.email ||
    "N/A";

  const recipientName = shippingAddress?.recipient_name || customerName;
  const recipientPhone = shippingAddress?.phone || customerPhone;

  const formatAddress = (addr: any) => {
    if (!addr) return "Standard Delivery Address";
    const line1 = addr.address_line_1 || addr.street || "";
    const line2 = addr.address_line_2 ? `, ${addr.address_line_2}` : "";
    const city = addr.city ? `, ${addr.city}` : "";
    const zip = addr.zip || addr.postal_code ? ` - ${addr.zip || addr.postal_code}` : "";
    const country = addr.country ? `, ${addr.country}` : ", Bangladesh";
    const full = `${line1}${line2}${city}${zip}${country}`.replace(/^,\s*/, "");
    return full || "Banani, Dhaka, Bangladesh";
  };

  const deliveryAddress = formatAddress(shippingAddress);

  const statusLower = (order.status || "").toLowerCase();
  const paymentStatusLower = (order.payment_status || "").toLowerCase();
  const isPaid = paymentStatusLower === "paid" || statusLower === "paid" || !!order.paid_at;
  const isCod = (order.payment_method || "").toUpperCase() === "COD" || !isPaid;

  const subtotal = Number(order.subtotal ?? items.reduce((acc: number, it: any) => acc + (Number(it.line_total ?? it.total_price ?? (Number(it.unit_price) * Number(it.quantity)))), 0));
  const grandTotal = Number(order.grand_total ?? order.total_amount ?? subtotal);

  const courierName = activeShipment?.courier_providers?.name || activeShipment?.courier_provider_code || "Anchor Express Delivery";
  const trackingNumber = activeShipment?.tracking_number || null;

  const invoiceData: InvoiceData = {
    invoiceNumber,
    orderNumber,
    orderDate,
    orderTime,
    printDate,
    barcodeValue,
    customer: {
      name: recipientName,
      phone: recipientPhone,
      email: customerEmail,
      address: deliveryAddress,
    },
    order: {
      paymentMethod: order.payment_intent_id ? "MFS - Online Payment" : isCod ? "COD - Cash on Delivery" : (order.payment_method || "Prepaid"),
      paymentStatus: isPaid ? "Paid Online" : "COD Pending",
      isPaid,
      isCod,
      courierName,
      trackingNumber,
      subtotal,
      shippingTotal: Number(order.shipping_total || 0),
      discountTotal: Number(order.discount_total || 0),
      taxTotal: Number(order.tax_total || 0),
      grandTotal,
      servedBy: "Shojol Mia",
      cashier: "Web",
      branchName: "Dhaka Branch",
      branchAddress: "H-271, Station road, Jahaj company mor, Rangpur , 5400",
    },
    items: items.map((it: any) => ({
      id: it.id,
      product_name: it.product_name,
      variant_name: it.variant_name,
      sku: it.sku,
      quantity: it.quantity,
      unit_price: it.unit_price,
      line_total: it.line_total,
      total_price: it.total_price,
    })),
  };

  return (
    <div className="min-h-screen bg-slate-100 py-4 sm:py-8 print:py-0 print:bg-white text-slate-900 font-sans antialiased">
      {/* Screen Toolbar & AutoPrint */}
      <InvoiceToolbar
        backUrl={`/admin/orders/${order.id}`}
        backLabel="Back to Order Management"
      />

      {/* Printable 1-Page Sheet */}
      <InvoiceSheet data={invoiceData} />
    </div>
  );
}
