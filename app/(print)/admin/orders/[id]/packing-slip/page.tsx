import React from "react";
import { getOrderDetailsAction } from "@/app/actions/oms/order.actions";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAFF_ROLES } from "@/lib/constants/auth";
import { ClientBarcode } from "@/components/ui/ClientBarcode";
import { AutoPrint } from "@/components/print/auto-print";

export default async function AdminPrintPackingSlipPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/admin");
  }

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
  const packDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const customerName =
    order.customer?.full_name ||
    order.shippingAddress?.recipient_name ||
    "Guest Customer";

  const customerPhone =
    order.customer?.phone ||
    order.shippingAddress?.phone ||
    "N/A";

  const formatAddress = (addr: any) => {
    if (!addr) return "Not provided";
    const line1 = addr.address_line_1 || addr.street || "";
    const line2 = addr.address_line_2 ? `, ${addr.address_line_2}` : "";
    const city = addr.city ? `, ${addr.city}` : "";
    const zip = addr.zip || addr.postal_code ? ` - ${addr.zip || addr.postal_code}` : "";
    const country = addr.country ? `, ${addr.country}` : "";
    return `${line1}${line2}${city}${zip}${country}`.replace(/^,\s*/, "") || "Address not provided";
  };

  const totalItemsCount =
    order.items?.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0) || 0;

  return (
    <div className="w-full bg-white text-slate-900 p-8 sm:p-12 print:p-8 max-w-4xl mx-auto min-h-screen">
      {/* Auto-print: window.print() */}
      <AutoPrint />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b-2 border-slate-900 gap-6">
        <div>
          <span className="text-2xl font-black tracking-wider text-slate-950 uppercase">
            ANCHOR FASHION
          </span>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
            Fulfillment & Distribution Logistics
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Warehouse Hub: Central Logistics Facility (Banani Hub #1)
          </p>
        </div>

        <div className="text-left sm:text-right flex flex-col items-end">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">
            PACKING SLIP
          </h2>
          
          <div className="mt-4 mb-2">
            <ClientBarcode value={order.order_number} format="CODE128" width={2} height={40} fontSize={14} background="transparent" />
          </div>

          <div className="text-xs text-slate-600 mt-2 space-y-0.5 text-right">
            <p>Pack Date: {packDate}</p>
            <p>Total Items: <span className="font-bold">{totalItemsCount} units</span></p>
          </div>
        </div>
      </div>

      {/* Shipping Destination */}
      <div className="py-6 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
        <div className="p-4 bg-slate-50 rounded border border-slate-200">
          <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
            Deliver To:
          </h3>
          <p className="text-sm font-bold text-slate-900">
            {order.shippingAddress?.recipient_name || customerName}
          </p>
          <p className="text-slate-600 mt-0.5 font-mono">Contact: {customerPhone}</p>
          <p className="text-slate-700 mt-1 leading-relaxed">
            {formatAddress(order.shippingAddress)}
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
              Dispatch Details:
            </h3>
            <p className="text-slate-700">
              Courier Carrier: <span className="font-semibold">Standard Courier / Anchor Express</span>
            </p>
            <p className="text-slate-700 mt-0.5">
              Current Fulfillment Status: <span className="font-bold text-slate-900 uppercase">{order.status.replace(/_/g, " ")}</span>
            </p>
          </div>
          <p className="text-[10px] text-slate-500 italic mt-3">
            Note: Verify garment seal tags and barcode before sealing package.
          </p>
        </div>
      </div>

      {/* Item Checklist Table */}
      <div className="py-6 min-h-[300px]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-800 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-2 w-10 text-center">Item</th>
              <th className="py-3 px-2">Product Description</th>
              <th className="py-3 px-2">SKU / Variant</th>
              <th className="py-3 px-2 text-center w-20">Ordered</th>
              <th className="py-3 px-2 text-center w-20">Picked [✓]</th>
              <th className="py-3 px-2 text-center w-20">Packed [✓]</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {order.items?.map((item: any, idx: number) => (
              <tr key={item.id || idx} className="text-slate-800">
                <td className="py-3 px-2 text-center text-slate-500 font-mono">
                  {idx + 1}
                </td>
                <td className="py-3 px-2">
                  <p className="font-bold text-slate-900">{item.product_name}</p>
                  {item.variant_name && (
                    <p className="text-[11px] text-slate-500">
                      Attribute: {item.variant_name}
                    </p>
                  )}
                </td>
                <td className="py-3 px-2 font-mono text-slate-600">
                  {item.sku || "—"}
                </td>
                <td className="py-3 px-2 text-center font-bold text-sm">
                  {item.quantity}
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="inline-block w-5 h-5 border border-slate-400 rounded"></div>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="inline-block w-5 h-5 border border-slate-400 rounded"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Packing Sign-off */}
      <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-xs text-slate-600 page-break-inside-avoid">
        <div>
          <p className="font-semibold text-slate-800 mb-6">Picker Name & Signature:</p>
          <div className="border-b border-slate-300 w-full mb-1"></div>
          <p className="text-[10px] text-slate-400">Date: _______________</p>
        </div>
        <div>
          <p className="font-semibold text-slate-800 mb-6">Packer Name & Signature:</p>
          <div className="border-b border-slate-300 w-full mb-1"></div>
          <p className="text-[10px] text-slate-400">Date: _______________</p>
        </div>
        <div>
          <p className="font-semibold text-slate-800 mb-6">Quality Control Inspection:</p>
          <div className="border-b border-slate-300 w-full mb-1"></div>
          <p className="text-[10px] text-slate-400">Status: PASS / FAIL</p>
        </div>
      </div>
    </div>
  );
}
