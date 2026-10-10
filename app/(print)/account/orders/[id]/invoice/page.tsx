import React from "react";
import { notFound, redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { InvoiceToolbar } from "@/components/print/invoice-toolbar";
import { InvoiceSheet, InvoiceData } from "@/components/print/invoice-sheet";

export default async function CustomerPrintInvoicePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/account/orders");
  }

  const adminSupabase = await createAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);

  let orderQuery = adminSupabase
    .from("orders")
    .select(
      `
      *,
      order_items(*),
      order_status_history(*)
    `
    );

  if (isUuid) {
    orderQuery = orderQuery.eq("id", params.id);
  } else {
    orderQuery = orderQuery.eq("order_number", params.id);
  }

  const { data: order, error } = await orderQuery.maybeSingle();

  if (error || !order) {
    return notFound();
  }

  // Fetch order addresses separately
  const { data: orderAddresses } = await adminSupabase
    .from("order_addresses")
    .select("*")
    .eq("order_id", order.id);

  order.order_addresses = orderAddresses || [];

  const shippingAddress =
    order.order_addresses?.find((a: any) => a.address_type === "SHIPPING") ||
    order.shippingAddress ||
    order.order_addresses?.[0] ||
    null;

  // Fetch customer profile if customer_id is present
  let customer: any = null;
  if (order.customer_id) {
    try {
      const { data: cProfile } = await adminSupabase
        .from("customer_profiles")
        .select("first_name, last_name, email, phone")
        .eq("id", order.customer_id)
        .maybeSingle();
      const { data: pProfile } = await adminSupabase
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("id", order.customer_id)
        .maybeSingle();
      const fn = cProfile?.first_name || pProfile?.first_name || "";
      const ln = cProfile?.last_name || pProfile?.last_name || "";
      const full = [fn, ln].filter(Boolean).join(" ");
      customer = {
        full_name: full || null,
        first_name: fn,
        last_name: ln,
        phone: cProfile?.phone || pProfile?.phone || null,
        email: cProfile?.email || null,
      };
    } catch {
      // ignore
    }
  }

  // Authorization: Order owner, staff/management, or matching customer email can view invoice
  if (order.customer_id && order.customer_id !== user.id) {
    let role = user.user_metadata?.role || user.app_metadata?.role;
    if (!role) {
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("roles(name)")
        .eq("id", user.id)
        .maybeSingle();
      role = String(
        Array.isArray(profile?.roles)
          ? profile?.roles[0]?.name
          : (profile?.roles as any)?.name || ""
      );
    }
    const roleUpper = String(role || "").toUpperCase();
    const isStaff = [
      "SUPERADMIN",
      "ADMIN",
      "MANAGER",
      "WAREHOUSE_MANAGER",
      "MARKETING_MANAGER",
      "FINANCE_MANAGER",
      "STAFF",
      "SUPPORT",
    ].includes(roleUpper);

    const isEmailOwner = Boolean(
      user.email &&
      (
        (shippingAddress?.email && user.email.toLowerCase() === shippingAddress.email.toLowerCase()) ||
        (customer?.email && user.email.toLowerCase() === customer.email.toLowerCase())
      )
    );

    if (!isStaff && !isEmailOwner) {
      return notFound();
    }
  }

  // Fetch courier shipments if available
  let activeShipment: any = null;
  try {
    const { data: shipments } = await adminSupabase
      .from("shipments")
      .select("*, courier_providers(name, logo_url)")
      .eq("order_id", order.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1);
    activeShipment = shipments?.[0] || null;
  } catch {
    // Non-critical, fallback to standard shipping
  }

  const items = (order.order_items && order.order_items.length > 0)
    ? order.order_items
    : (order.items || []);

  const invoiceNumber = order.invoice_number || (order.order_number ? order.order_number.replace(/^ORD-/, "INV-") : "INV-ONLINE");
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

  const addressFullName = shippingAddress
    ? [shippingAddress.first_name, shippingAddress.last_name].filter(Boolean).join(" ")
    : "";

  const customerName =
    customer?.full_name ||
    order.customer?.full_name ||
    addressFullName ||
    shippingAddress?.recipient_name ||
    (customer?.first_name ? `${customer.first_name} ${customer.last_name || ""}`.trim() : "") ||
    "Valued Customer";

  const customerPhone =
    shippingAddress?.phone ||
    customer?.phone ||
    order.customer?.phone ||
    "N/A";

  const customerEmail =
    customer?.email ||
    order.customer?.email ||
    shippingAddress?.email ||
    "N/A";

  const recipientName = addressFullName || shippingAddress?.recipient_name || customerName;
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
        backUrl={`/account/orders/${order.id}`}
        backLabel="Back to Order Details"
      />

      {/* Printable Sheet */}
      <InvoiceSheet data={invoiceData} />
    </div>
  );
}
