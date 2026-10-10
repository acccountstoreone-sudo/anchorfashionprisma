export const EmailTemplates = {
  welcomeAdmin: (name: string, role: string, loginUrl: string, password?: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">Anchor Fashion</h1>
        <p style="color: #888; font-size: 12px; margin-top: 5px; letter-spacing: 1px;">Admin Dashboard Access</p>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #333; font-size: 20px; margin-top: 0;">Welcome, ${name}!</h2>
        <p style="color: #555; line-height: 1.6; font-size: 15px;">
          You have been added as an <strong>${role}</strong> at Anchor Fashion. You can now log in to the admin dashboard to manage the store.
        </p>
        ${
          password
            ? `<div style="background-color: #fff; padding: 15px; border-left: 4px solid #C9A86A; margin: 20px 0;">
                <p style="margin: 0; color: #666; font-size: 14px;">Your temporary password is:</p>
                <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; letter-spacing: 1px; color: #1a1a1a;">${password}</p>
                <p style="margin: 5px 0 0; color: #e50000; font-size: 12px;">Please change this password immediately after logging in.</p>
               </div>`
            : ""
        }
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #1a1a1a; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">Log In to Dashboard</a>
        </div>
      </div>
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
        <p style="color: #999; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Anchor Fashion. All rights reserved.</p>
      </div>
    </div>
  `,

  orderConfirmed: (order: any, storeUrl: string) => {
    const formatPrice = (amount: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(amount).replace('BDT', '৳');

    const itemsHtml = (order.order_items || []).map((item: any) => `
      <tr>
        <td style="padding: 15px 0; border-bottom: 1px solid #eaeaea;">
          <p style="margin: 0; font-weight: bold; color: #1a1a1a;">${item.product_name}</p>
          ${item.variant_sku ? `<p style="margin: 4px 0 0; font-size: 12px; color: #888;">SKU: ${item.variant_sku}</p>` : ""}
        </td>
        <td style="padding: 15px 0; border-bottom: 1px solid #eaeaea; text-align: center; color: #555;">${item.quantity}</td>
        <td style="padding: 15px 0; border-bottom: 1px solid #eaeaea; text-align: right; color: #1a1a1a; font-weight: bold;">${formatPrice(item.unit_price * item.quantity)}</td>
      </tr>
    `).join("");

    const invoiceUrl = `${storeUrl}/account/orders/${order.id || order.order_id}/invoice`;

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1a1a1a;">
        <h1 style="color: #1a1a1a; margin: 0; font-size: 28px; letter-spacing: 2px; text-transform: uppercase;">Anchor Fashion</h1>
        <p style="color: #888; font-size: 13px; margin-top: 8px; letter-spacing: 1px;">ORDER CONFIRMATION</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="color: #333; font-size: 20px; margin-top: 0;">Thank you for your order!</h2>
        <p style="color: #555; line-height: 1.6; font-size: 15px;">
          Hi there, we've received your order <strong>#${order.order_number}</strong> and it is now confirmed. We will notify you once it has been shipped.
        </p>
      </div>

      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #888;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr>
              <th style="text-align: left; padding-bottom: 10px; border-bottom: 2px solid #eaeaea; color: #333;">Item</th>
              <th style="text-align: center; padding-bottom: 10px; border-bottom: 2px solid #eaeaea; color: #333;">Qty</th>
              <th style="text-align: right; padding-bottom: 10px; border-bottom: 2px solid #eaeaea; color: #333;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 15px 0 5px; text-align: right; color: #555;">Subtotal:</td>
              <td style="padding: 15px 0 5px; text-align: right; color: #1a1a1a;">${formatPrice(order.subtotal || order.total_amount)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 5px 0; text-align: right; color: #555;">Shipping:</td>
              <td style="padding: 5px 0; text-align: right; color: #1a1a1a;">${formatPrice(order.shipping_cost || 0)}</td>
            </tr>
            ${order.discount_amount ? `<tr>
              <td colspan="2" style="padding: 5px 0; text-align: right; color: #e50000;">Discount:</td>
              <td style="padding: 5px 0; text-align: right; color: #e50000;">-${formatPrice(order.discount_amount)}</td>
            </tr>` : ''}
            <tr>
              <td colspan="2" style="padding: 15px 0 0; text-align: right; font-weight: bold; color: #1a1a1a; border-top: 2px solid #eaeaea;">Total:</td>
              <td style="padding: 15px 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #C9A86A; border-top: 2px solid #eaeaea;">${formatPrice(order.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${invoiceUrl}" style="background-color: #1a1a1a; color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">View / Download Invoice PDF</a>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
        <p style="color: #999; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Anchor Fashion. All rights reserved.</p>
        <p style="color: #aaa; font-size: 11px; margin-top: 5px;">If you have any questions, reply to this email or contact our support team.</p>
      </div>
    </div>
    `;
  },

  taskAssigned: (taskTitle: string, assignedBy: string, dueDate: string, dashboardUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #ffffff;">
      <div style="padding: 20px; background-color: #f4f6f8; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">New Task Assigned</h2>
        <p style="color: #475569; line-height: 1.6; font-size: 15px;">
          You have been assigned a new task by <strong>${assignedBy}</strong>.
        </p>
        <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-weight: bold; color: #0f172a; font-size: 16px;">${taskTitle}</p>
          <p style="margin: 8px 0 0; color: #64748b; font-size: 13px;">Due Date: ${dueDate}</p>
        </div>
        <a href="${dashboardUrl}" style="color: #2563eb; font-weight: bold; text-decoration: none; font-size: 14px;">View Task in Dashboard &rarr;</a>
      </div>
    </div>
  `
};
