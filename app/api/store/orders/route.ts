import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { AlphaSmsService } from '@/lib/services/sms/alpha-sms.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      customer_email,
      delivery_address,
      city,
      payment_method,
      total_amount,
      delivery_fee,
      items,
      user_id,
    } = body;

    // Validate required fields
    if (
      !customer_name ||
      !customer_phone ||
      !delivery_address ||
      !city ||
      !payment_method ||
      !total_amount ||
      !items ||
      items.length === 0
    ) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Generate unique order ID and human-friendly Order Number
    const orderId = uuidv4();
    const orderNumber = `AF-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const subtotal = (items || []).reduce(
      (sum: number, it: any) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
      0
    );
    const shippingTotal = Number(delivery_fee) || (city === 'Dhaka' ? 80 : 150);
    const grandTotal = Number(total_amount) || subtotal + shippingTotal;
    const nowIso = new Date().toISOString();

    // 1. Insert into orders table
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        order_number: orderNumber,
        customer_id: user_id || null,
        status: 'confirmed',
        payment_status: payment_method === 'COD' ? 'PENDING' : 'PENDING_VERIFICATION',
        payment_method: payment_method,
        subtotal,
        shipping_total: shippingTotal,
        grand_total: grandTotal,
        currency: 'BDT',
        order_source: 'ONLINE',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .single();

    if (orderErr) {
      console.error('[Store Orders API] Error inserting into orders:', orderErr);
      return NextResponse.json({ error: 'Failed to create order record' }, { status: 500 });
    }

    // 2. Insert into order_addresses table
    const nameParts = (customer_name || '').trim().split(' ');
    const firstName = nameParts[0] || customer_name;
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      await supabase.from('order_addresses').insert({
        order_id: orderId,
        address_type: 'SHIPPING',
        first_name: firstName,
        last_name: lastName,
        phone: customer_phone,
        email: customer_email || null,
        address_line_1: delivery_address,
        city: city,
        postal_code: '1200',
        country: 'Bangladesh',
        created_at: nowIso,
      });
    } catch (addrErr) {
      console.warn('[Store Orders API] Warning inserting order_addresses:', addrErr);
    }

    // 3. Insert into order_items table
    try {
      const orderItemsRows = (items || []).map((it: any, idx: number) => ({
        order_id: orderId,
        product_id: it.id && it.id.length === 36 ? it.id : null,
        sku: it.id || `AF-ITEM-${idx + 1}`,
        product_name: it.name || 'Fashion Product',
        variant_name: [it.size, it.color].filter(Boolean).join(' / ') || null,
        unit_price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1,
        line_total: (Number(it.price) || 0) * (Number(it.quantity) || 1),
        created_at: nowIso,
      }));

      if (orderItemsRows.length > 0) {
        await supabase.from('order_items').insert(orderItemsRows);
      }
    } catch (itemsErr) {
      console.warn('[Store Orders API] Warning inserting order_items:', itemsErr);
    }

    // 4. Asynchronously send rich confirmation SMS to customer with complete details
    try {
      AlphaSmsService.triggerOrderConfirmationSmsAsync(orderId);
    } catch (smsErr) {
      console.error('[Store Orders API] SMS trigger error:', smsErr);
    }

    return NextResponse.json({
      message: 'Order created successfully',
      order: {
        ...order,
        items,
        delivery_address,
        city,
        customer_name,
        customer_phone,
      },
    });
  } catch (error) {
    console.error('[Store Orders API] Unexpected error creating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
