import React from "react";
import { getOrderDetailsAction } from "@/app/actions/oms/order.actions";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAFF_ROLES } from "@/lib/constants/auth";
import { ClientBarcode } from "@/components/ui/ClientBarcode";
import { ClientQRCode } from "@/components/ui/ClientQRCode";
import { AutoPrint } from "@/components/print/auto-print";

export default async function AdminPrintShippingLabelPage(props: { params: Promise<{ id: string }> }) {
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

  // Fetch the active shipment for this order
  const { data: shipments } = await supabase
    .from("shipments")
    .select("*, courier_providers(name)")
    .eq("order_id", order.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1);
    
  const shipment = shipments?.[0];

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
        <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Shipping Label Unavailable</h2>
          <p className="text-slate-600 mb-6">No active courier shipment has been created for this order yet.</p>
          <button 
            type="button"
            className="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800"
          >
            Close Window (Press Ctrl+W)
          </button>
        </div>
      </div>
    );
  }

  const formatAddress = (addr: any) => {
    if (!addr) return "Not provided";
    const line1 = addr.address_line_1 || addr.street || "";
    const line2 = addr.address_line_2 ? `, ${addr.address_line_2}` : "";
    const city = addr.city ? `, ${addr.city}` : "";
    const zip = addr.zip || addr.postal_code ? ` - ${addr.zip || addr.postal_code}` : "";
    return `${line1}${line2}${city}${zip}`.replace(/^,\s*/, "") || "Address not provided";
  };

  const recipientName = order.shippingAddress?.recipient_name || order.customer?.full_name || "Customer";
  const recipientPhone = order.shippingAddress?.phone || order.customer?.phone || "N/A";
  const addressString = formatAddress(order.shippingAddress);
  const courierName = shipment.courier_providers?.name || shipment.provider_id.toUpperCase();
  const trackingNumber = shipment.tracking_number || shipment.provider_shipment_id;
  const isCod = order.payment_method === "COD" && order.status !== "paid" && !order.paid_at;
  const codAmount = isCod ? shipment.cod_amount : 0;
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://anchorfashion.com"}/track-order?ref=${trackingNumber}`;

  return (
    <div className="w-full bg-white text-slate-900 p-4 sm:p-8 print:p-0 max-w-[400px] mx-auto min-h-screen flex flex-col items-center justify-center">
      {/* Auto-print: window.print() */}
      <AutoPrint />
      
      {/* 4x6 Thermal Label Standard size container */}
      <div className="w-[100mm] h-[150mm] border-2 border-black p-4 bg-white flex flex-col relative print:border-none print:w-full print:h-auto overflow-hidden">
        
        {/* Top Header - Courier Info */}
        <div className="flex justify-between items-start border-b-2 border-black pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Carrier</p>
            <h1 className="text-xl font-black uppercase tracking-tight">{courierName}</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Method</p>
            <p className="text-lg font-bold">STANDARD</p>
          </div>
        </div>

        {/* Sender & QR */}
        <div className="flex justify-between items-start border-b-2 border-black py-3">
          <div className="pr-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">From</p>
            <p className="text-xs font-bold">Anchor Fashion Ltd</p>
            <p className="text-[10px] leading-tight">Plot 42, Road 11, Block D<br/>Banani, Dhaka 1213<br/>Phone: 1800-ANCHOR</p>
          </div>
          <div className="shrink-0 p-1 border border-slate-300">
            <ClientQRCode value={trackingUrl} size={50} level="L" />
          </div>
        </div>

        {/* Recipient */}
        <div className="py-4 border-b-2 border-black min-h-[120px]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Deliver To</p>
          <h2 className="text-xl font-black leading-tight uppercase">{recipientName}</h2>
          <p className="text-sm font-bold mt-1 mb-2">Phone: {recipientPhone}</p>
          <p className="text-sm font-medium leading-snug">{addressString}</p>
        </div>

        {/* COD & Order Info */}
        <div className="flex border-b-2 border-black">
          <div className="w-1/2 border-r-2 border-black p-3 text-center bg-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">Order Ref</p>
            <p className="text-sm font-bold truncate">{order.order_number}</p>
          </div>
          <div className="w-1/2 p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">COD Amount</p>
            <p className="text-xl font-black">{codAmount > 0 ? `৳${codAmount}` : "PREPAID"}</p>
          </div>
        </div>

        {/* Barcode Footer */}
        <div className="flex-1 flex flex-col items-center justify-center pt-4 pb-2">
          {trackingNumber ? (
            <div className="flex flex-col items-center">
              <ClientBarcode 
                value={trackingNumber} 
                format="CODE128" 
                width={1.8} 
                height={60} 
                fontSize={14} 
                background="transparent" 
                displayValue={true} 
                margin={0}
              />
              <p className="text-[10px] text-slate-500 mt-2 font-mono">TRACKING ID: {trackingNumber}</p>
            </div>
          ) : (
            <p className="text-sm font-bold text-slate-400">NO TRACKING NUMBER ASSIGNED</p>
          )}
        </div>
        
      </div>
    </div>
  );
}
