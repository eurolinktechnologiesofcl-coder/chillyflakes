import { env } from '../config/env.js';
import type { MailMessage } from '../lib/mailer.js';

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;background:#FAF7F2;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#223B28">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #EAE5DB;border-radius:20px;overflow:hidden">
        <tr><td style="background:#243F29;padding:22px 28px">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#FAF7F2">${escape(env.APP_NAME)}</span>
          <div style="font-size:10px;letter-spacing:2px;color:#A3B8A5;margin-top:2px">NATURAL • HANDMADE • UNIQUE</div>
        </td></tr>
        <tr><td style="padding:28px">${bodyHtml}</td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #EEEAE2;font-size:11px;color:#7E8F80">
          You received this email because of activity on your ${escape(env.APP_NAME)} account.
          If this wasn't you, you can safely ignore it${env.SUPPORT_EMAIL ? ` or contact <a href="mailto:${escape(env.SUPPORT_EMAIL)}" style="color:#2E4D34">${escape(env.SUPPORT_EMAIL)}</a>` : ''}.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function codeBlock(code: string): string {
  return `<div style="margin:22px 0;text-align:center">
    <span style="display:inline-block;font-family:Menlo,Consolas,monospace;font-size:30px;font-weight:bold;letter-spacing:10px;color:#223B28;background:#F4F1EA;border:1px solid #E3DDD1;border-radius:14px;padding:14px 22px">${code}</span>
  </div>`;
}

export function verifyEmailTemplate(name: string, code: string, minutes: number): Omit<MailMessage, 'to'> {
  const subject = `${code} is your ${env.APP_NAME} verification code`;
  const html = layout(
    subject,
    `<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 10px">Verify your email</h1>
     <p style="font-size:14px;line-height:1.6;margin:0;color:#4A5A4C">Hi ${escape(name)}, welcome to ${escape(env.APP_NAME)}! Enter this code to verify your email and finish creating your account.</p>
     ${codeBlock(code)}
     <p style="font-size:12px;color:#7E8F80;margin:0">This code expires in ${minutes} minutes. Never share it with anyone.</p>`
  );
  const text = `Hi ${name},\n\nYour ${env.APP_NAME} verification code is: ${code}\nIt expires in ${minutes} minutes.\n\nIf you didn't create an account, ignore this email.`;
  return { subject, html, text };
}

export function resetPasswordTemplate(name: string, code: string, minutes: number): Omit<MailMessage, 'to'> {
  const subject = `${code} is your ${env.APP_NAME} password reset code`;
  const html = layout(
    subject,
    `<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 10px">Reset your password</h1>
     <p style="font-size:14px;line-height:1.6;margin:0;color:#4A5A4C">Hi ${escape(name)}, we received a request to reset your password. Use this code to continue:</p>
     ${codeBlock(code)}
     <p style="font-size:12px;color:#7E8F80;margin:0">This code expires in ${minutes} minutes. If you didn't request a reset, your password is still safe — no action needed.</p>`
  );
  const text = `Hi ${name},\n\nYour ${env.APP_NAME} password reset code is: ${code}\nIt expires in ${minutes} minutes.\n\nIf you didn't request this, ignore this email.`;
  return { subject, html, text };
}

export function passwordChangedTemplate(name: string): Omit<MailMessage, 'to'> {
  const subject = `Your ${env.APP_NAME} password was changed`;
  const html = layout(
    subject,
    `<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 10px">Password changed</h1>
     <p style="font-size:14px;line-height:1.6;margin:0;color:#4A5A4C">Hi ${escape(name)}, your password was just changed and all other devices were signed out.</p>
     <p style="font-size:14px;line-height:1.6;color:#4A5A4C">If this wasn't you, reset your password immediately at <a href="${escape(env.APP_URL)}/forgot-password" style="color:#2E4D34">${escape(env.APP_URL)}/forgot-password</a>.</p>`
  );
  const text = `Hi ${name},\n\nYour ${env.APP_NAME} password was changed and other devices were signed out.\nIf this wasn't you, reset it now: ${env.APP_URL}/forgot-password`;
  return { subject, html, text };
}

export function orderConfirmationEmailTemplate(order: any): Omit<MailMessage, 'to'> {
  const subject = `Order Confirmation #${order.orderNumber} — ${env.APP_NAME}`;
  const address = typeof order.shippingAddress === 'object' && order.shippingAddress ? order.shippingAddress : {};
  const addrText = [
    address.name || order.customerName,
    address.street,
    address.landmark,
    `${address.city || ''} ${address.state || ''} ${address.pincode || ''}`.trim(),
    address.country || 'India',
  ].filter(Boolean).join(', ');

  const itemsHtml = (order.items || []).map((it: any) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #EEEAE2;font-size:13px;color:#223B28">
        <strong>${escape(it.title || it.name || 'Artisan Product')}</strong>
        <div style="font-size:11px;color:#7E8F80">Qty: ${it.quantity} × ₹${it.unitPrice || it.price}</div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #EEEAE2;text-align:right;font-size:13px;font-weight:600;color:#223B28">
        ₹${(it.totalPrice || (it.price * it.quantity))}
      </td>
    </tr>
  `).join('');

  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 12px;border-radius:20px;background:#EAF1EA;color:#2E4D34;font-size:11px;font-weight:bold;letter-spacing:1px">ORDER CONFIRMED</span>
       <h1 style="font-family:Georgia,serif;font-size:24px;margin:10px 0 4px;color:#223B28">Thank You For Your Order!</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Order Reference: <strong>#${escape(order.orderNumber)}</strong></p>
     </div>

     <div style="background:#FAF7F2;padding:16px;border-radius:12px;margin-bottom:20px;font-size:12px;line-height:1.6;color:#4A5A4C">
       <div><strong>Recipient:</strong> ${escape(order.customerName)} (${escape(order.customerEmail)})</div>
       <div><strong>Delivery Option:</strong> Standard Delivery (3-4 business days)</div>
       <div><strong>Shipping Address:</strong> ${escape(addrText)}</div>
       <div><strong>Payment:</strong> ${escape(String(order.paymentMethod || 'cod').toUpperCase())}</div>
     </div>

     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
       <thead>
         <tr>
           <th align="left" style="font-size:11px;text-transform:uppercase;color:#7E8F80;padding-bottom:8px;border-bottom:2px solid #EAE5DB">Items</th>
           <th align="right" style="font-size:11px;text-transform:uppercase;color:#7E8F80;padding-bottom:8px;border-bottom:2px solid #EAE5DB">Price</th>
         </tr>
       </thead>
       <tbody>
         ${itemsHtml}
       </tbody>
     </table>

     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.8;color:#506052">
       ${order.discountAmount > 0 ? `
         <tr>
           <td>Coupon Discount ${order.couponCode ? `(${escape(order.couponCode)})` : ''}</td>
           <td align="right" style="color:#D82C20;font-weight:600">- ₹${order.discountAmount}</td>
         </tr>
       ` : ''}
       <tr>
         <td>Delivery Charge</td>
         <td align="right" style="font-weight:600">${order.shippingFee === 0 ? '<span style="color:#2E4D34">FREE</span>' : `₹${order.shippingFee}`}</td>
       </tr>
       <tr style="border-top:2px solid #243F29;font-size:16px;font-weight:bold;color:#223B28">
         <td style="padding-top:8px">Total Payable</td>
         <td align="right" style="padding-top:8px;color:#243F29">₹${order.totalAmount}</td>
       </tr>
     </table>

     <p style="font-size:12px;color:#7E8F80;margin:24px 0 0;text-align:center">
       Our verified artisans are preparing your package. You will receive real-time updates as your shipment progresses.
     </p>`
  );

  const text = `Thank you for your order #${order.orderNumber}!\n` +
    `Total: ₹${order.totalAmount}\n` +
    `Delivery: Standard Delivery\n` +
    `Shipping Address: ${addrText}\n\n` +
    `We will notify you once dispatched.`;

  return { subject, html, text };
}

export function orderStatusChangedTemplate(order: any, newStatus: string, reason?: string): Omit<MailMessage, 'to'> {
  const statusLabels: Record<string, { label: string; desc: string }> = {
    PENDING_DISPATCH: { label: 'Pending Dispatch', desc: 'Your artisan order is currently being packed with care.' },
    IN_TRANSIT: { label: 'In Transit', desc: 'Your order has been dispatched and is on its way to your delivery address.' },
    DELIVERED: { label: 'Delivered', desc: 'Your package has been safely delivered. We hope you love your handmade finds!' },
    CANCELLED: { label: 'Cancelled', desc: 'Your order has been cancelled and any inventory has been released.' },
    RETURN_REQUESTED: { label: 'Return Requested', desc: 'Your return request has been submitted and is being reviewed by our team.' },
    REFUNDED: { label: 'Refund Processed', desc: 'Your refund has been approved and processed back to your original source.' },
  };

  const current = statusLabels[newStatus] || { label: newStatus, desc: `Your order status has been updated to ${newStatus}.` };
  const subject = `Update on Order #${order.orderNumber}: ${current.label} — ${env.APP_NAME}`;

  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:#243F29;color:#FAF7F2;font-size:11px;font-weight:bold;letter-spacing:1px">${escape(current.label.toUpperCase())}</span>
       <h1 style="font-family:Georgia,serif;font-size:22px;margin:12px 0 4px;color:#223B28">Shipment Status Updated</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Order Reference: <strong>#${escape(order.orderNumber)}</strong></p>
     </div>

     <p style="font-size:14px;line-height:1.6;color:#4A5A4C;margin-bottom:16px">
       Hi ${escape(order.customerName)}, ${current.desc}
     </p>

     ${order.trackingNumber ? `
       <div style="background:#FAF7F2;padding:16px;border-radius:12px;margin-bottom:20px;font-size:13px;color:#223B28;border:1px solid #EAE5DB">
         <div><strong>Courier Partner:</strong> ${escape(order.courierPartner || 'National Express Logistics')}</div>
         <div><strong>Tracking Number:</strong> <code style="font-weight:bold;background:#F4F1EA;padding:2px 6px;border-radius:4px">${escape(order.trackingNumber)}</code></div>
       </div>
     ` : ''}

     ${reason ? `<p style="font-size:12px;color:#7E8F80;font-style:italic">Note from operations: ${escape(reason)}</p>` : ''}

     <p style="font-size:12px;color:#7E8F80;margin:20px 0 0;text-align:center">
       Track your order anytime by visiting <a href="${escape(env.APP_URL)}/orders" style="color:#2E4D34;font-weight:bold">My Account</a>.
     </p>`
  );

  const text = `Order #${order.orderNumber} Status Update: ${current.label}\n\n${current.desc}\n` +
    (order.trackingNumber ? `Tracking: ${order.trackingNumber} (${order.courierPartner || 'Logistics'})\n` : '');

  return { subject, html, text };
}

export function serviceBookingCustomerTemplate(booking: any): Omit<MailMessage, 'to'> {
  const subject = `Service Booking Confirmed #${booking.bookingRef} — ${booking.serviceTitle}`;
  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:#EAF1EA;color:#2E4D34;font-size:11px;font-weight:bold;letter-spacing:1px">APPOINTMENT REQUESTED</span>
       <h1 style="font-family:Georgia,serif;font-size:24px;margin:10px 0 4px;color:#223B28">Your Booking is Registered!</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Reference ID: <strong>#${escape(booking.bookingRef)}</strong></p>
     </div>

     <p style="font-size:14px;line-height:1.6;color:#4A5A4C;margin-bottom:16px">
       Hi ${escape(booking.customerName)}, thank you for booking a community artisan service with ${escape(env.APP_NAME)}. Our specialist will review your request and reach out promptly.
     </p>

     <div style="background:#FAF7F2;padding:18px;border-radius:14px;margin-bottom:20px;font-size:13px;line-height:1.7;color:#223B28;border:1px solid #EAE5DB">
       <div><strong>Service:</strong> ${escape(booking.serviceTitle)}</div>
       <div><strong>Scheduled Date:</strong> ${escape(booking.preferredDate)}</div>
       <div><strong>Preferred Slot:</strong> ${escape(booking.preferredTime)}</div>
       <div><strong>Client Name:</strong> ${escape(booking.customerName)}</div>
       <div><strong>Client Contact:</strong> ${escape(booking.customerEmail || booking.customerPhone || 'On File')}</div>
       ${booking.notes ? `<div><strong>Notes:</strong> ${escape(booking.notes)}</div>` : ''}
       <div><strong>Status:</strong> <span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#EAF1EA;color:#2E4D34;font-size:11px;font-weight:bold">Pending Confirmation</span></div>
     </div>

     <p style="font-size:12px;color:#7E8F80;margin:24px 0 0;text-align:center">
       If you need to reschedule or have questions, reply directly to this email or reach us at <a href="mailto:${escape(env.SUPPORT_EMAIL || 'adityashvkmr@gmail.com')}" style="color:#2E4D34;font-weight:bold">${escape(env.SUPPORT_EMAIL || 'adityashvkmr@gmail.com')}</a>.
     </p>`
  );

  const text = `Service Booking Confirmed #${booking.bookingRef}\n\n` +
    `Service: ${booking.serviceTitle}\n` +
    `Date: ${booking.preferredDate}\n` +
    `Time: ${booking.preferredTime}\n` +
    `Client: ${booking.customerName}\n\n` +
    `Our specialist artisan will reach out to finalize the appointment.`;

  return { subject, html, text };
}

export function serviceBookingAdminTemplate(booking: any): Omit<MailMessage, 'to'> {
  const subject = `🔔 New Service Booking: ${booking.serviceTitle} (#${booking.bookingRef})`;
  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:#243F29;color:#FAF7F2;font-size:11px;font-weight:bold;letter-spacing:1px">NEW APPOINTMENT ALERT</span>
       <h1 style="font-family:Georgia,serif;font-size:22px;margin:12px 0 4px;color:#223B28">New Service Booking Received</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Reference ID: <strong>#${escape(booking.bookingRef)}</strong></p>
     </div>

     <p style="font-size:14px;line-height:1.6;color:#4A5A4C;margin-bottom:16px">
       A client has submitted a new service appointment request on the platform:
     </p>

     <div style="background:#FAF7F2;padding:18px;border-radius:14px;margin-bottom:20px;font-size:13px;line-height:1.7;color:#223B28;border:1px solid #EAE5DB">
       <div><strong>Requested Service:</strong> ${escape(booking.serviceTitle)}</div>
       <div><strong>Client Name:</strong> ${escape(booking.customerName)}</div>
       <div><strong>Client Email:</strong> <a href="mailto:${escape(booking.customerEmail)}" style="color:#2E4D34">${escape(booking.customerEmail)}</a></div>
       <div><strong>Client Phone:</strong> ${escape(booking.customerPhone || 'Not provided')}</div>
       <div><strong>Preferred Date:</strong> ${escape(booking.preferredDate)}</div>
       <div><strong>Preferred Time Slot:</strong> ${escape(booking.preferredTime)}</div>
       ${booking.notes ? `<div><strong>Client Notes:</strong> ${escape(booking.notes)}</div>` : ''}
       <div><strong>Submitted At:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
     </div>

     <div style="text-align:center;margin:24px 0">
       <a href="${escape(env.APP_URL)}/admin/services" style="display:inline-block;background:#243F29;color:#FAF7F2;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:bold">View Bookings in Admin Console</a>
     </div>`
  );

  const text = `New Service Booking Received: #${booking.bookingRef}\n\n` +
    `Service: ${booking.serviceTitle}\n` +
    `Client: ${booking.customerName} (${booking.customerEmail})\n` +
    `Phone: ${booking.customerPhone || 'N/A'}\n` +
    `Date & Time: ${booking.preferredDate} at ${booking.preferredTime}\n\n` +
    `Manage at: ${env.APP_URL}/admin/services`;

  return { subject, html, text };
}

export function orderAdminNotificationTemplate(order: any): Omit<MailMessage, 'to'> {
  const subject = `🛒 New Customer Order: #${order.orderNumber} — ₹${order.totalAmount}`;
  const address = typeof order.shippingAddress === 'object' && order.shippingAddress ? order.shippingAddress : {};
  const addrText = [
    address.name || order.customerName,
    address.street,
    address.landmark,
    `${address.city || ''} ${address.state || ''} ${address.pincode || ''}`.trim(),
    address.country || 'India',
  ].filter(Boolean).join(', ');

  const itemsList = (order.items || []).map((it: any) => `
    <li style="margin-bottom:6px;font-size:13px;color:#223B28">
      <strong>${escape(it.title || 'Product')}</strong> × ${it.quantity} (₹${it.totalPrice || it.unitPrice * it.quantity})
    </li>
  `).join('');

  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:#243F29;color:#FAF7F2;font-size:11px;font-weight:bold;letter-spacing:1px">NEW ORDER ALERT</span>
       <h1 style="font-family:Georgia,serif;font-size:22px;margin:12px 0 4px;color:#223B28">Customer Order Placed</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Order Reference: <strong>#${escape(order.orderNumber)}</strong></p>
     </div>

     <p style="font-size:14px;line-height:1.6;color:#4A5A4C;margin-bottom:16px">
       A new customer order has been placed on ${escape(env.APP_NAME)}:
     </p>

     <div style="background:#FAF7F2;padding:18px;border-radius:14px;margin-bottom:20px;font-size:13px;line-height:1.7;color:#223B28;border:1px solid #EAE5DB">
       <div><strong>Customer:</strong> ${escape(order.customerName)} (<a href="mailto:${escape(order.customerEmail)}" style="color:#2E4D34">${escape(order.customerEmail)}</a>)</div>
       <div><strong>Phone:</strong> ${escape(order.customerPhone || 'Not provided')}</div>
       <div><strong>Delivery Address:</strong> ${escape(addrText)}</div>
       <div><strong>Payment Method:</strong> ${escape(String(order.paymentMethod || 'cod').toUpperCase())}</div>
       <div><strong>Total Amount:</strong> <strong style="color:#243F29">₹${order.totalAmount}</strong></div>
     </div>

     <h4 style="margin:16px 0 8px;font-size:13px;color:#223B28;text-transform:uppercase">Ordered Items</h4>
     <ul style="padding-left:20px;margin-top:0">${itemsList}</ul>

     <div style="text-align:center;margin:24px 0">
       <a href="${escape(env.APP_URL)}/admin/orders" style="display:inline-block;background:#243F29;color:#FAF7F2;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:bold">View Order in Admin Console</a>
     </div>`
  );

  const text = `New Customer Order #${order.orderNumber} placed!\n\n` +
    `Customer: ${order.customerName} (${order.customerEmail})\n` +
    `Amount: ₹${order.totalAmount}\n` +
    `Delivery: Standard Delivery\n` +
    `Shipping Address: ${addrText}\n\n` +
    `Manage at: ${env.APP_URL}/admin/orders`;

  return { subject, html, text };
}

export function contactInquiryAdminTemplate(inquiry: {
  ticketId: string;
  fullName: string;
  email: string;
  phone?: string;
  state?: string;
  inquiryType: string;
  categoryInterest?: string;
  preferredLanguage?: string;
  message: string;
}): Omit<MailMessage, 'to'> {
  const subject = `📩 New Support Inquiry #${inquiry.ticketId} from ${inquiry.fullName} — ${env.APP_NAME}`;
  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:#243F29;color:#FAF7F2;font-size:11px;font-weight:bold;letter-spacing:1px">NEW INQUIRY</span>
       <h1 style="font-family:Georgia,serif;font-size:22px;margin:10px 0 4px;color:#223B28">Customer Support Ticket</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Ticket ID: <strong>#${escape(inquiry.ticketId)}</strong></p>
     </div>

     <div style="background:#FAF7F2;padding:18px;border-radius:14px;margin-bottom:20px;font-size:13px;line-height:1.7;color:#223B28;border:1px solid #EAE5DB">
       <div><strong>Sender Name:</strong> ${escape(inquiry.fullName)}</div>
       <div><strong>Email:</strong> <a href="mailto:${escape(inquiry.email)}" style="color:#2E4D34;font-weight:bold">${escape(inquiry.email)}</a></div>
       ${inquiry.phone ? `<div><strong>Phone:</strong> ${escape(inquiry.phone)}</div>` : ''}
       ${inquiry.state ? `<div><strong>State / Region:</strong> ${escape(inquiry.state)}</div>` : ''}
       <div><strong>Inquiry Type:</strong> <span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#EAF1EA;color:#2E4D34;font-size:11px;font-weight:bold">${escape(inquiry.inquiryType)}</span></div>
       ${inquiry.categoryInterest ? `<div><strong>Category of Interest:</strong> ${escape(inquiry.categoryInterest)}</div>` : ''}
       ${inquiry.preferredLanguage ? `<div><strong>Preferred Language:</strong> ${escape(inquiry.preferredLanguage)}</div>` : ''}
     </div>

     <div style="background:#FFFFFF;padding:16px;border-radius:12px;border:1px solid #EAE5DB;margin-bottom:20px">
       <div style="font-size:11px;text-transform:uppercase;color:#7E8F80;font-weight:bold;margin-bottom:8px">Customer Message:</div>
       <p style="font-size:13px;line-height:1.7;color:#223B28;margin:0;white-space:pre-wrap">${escape(inquiry.message)}</p>
     </div>

     <div style="text-align:center;margin:24px 0 0">
       <a href="mailto:${escape(inquiry.email)}?subject=Re:%20Inquiry%20%23${escape(inquiry.ticketId)}" style="display:inline-block;background:#243F29;color:#FAF7F2;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:bold">Reply Directly to Customer</a>
     </div>`
  );

  const text = `New Support Ticket #${inquiry.ticketId}\n\n` +
    `From: ${inquiry.fullName} (${inquiry.email})\n` +
    (inquiry.phone ? `Phone: ${inquiry.phone}\n` : '') +
    (inquiry.state ? `State: ${inquiry.state}\n` : '') +
    `Type: ${inquiry.inquiryType}\n\n` +
    `Message:\n${inquiry.message}`;

  return { subject, html, text };
}

export function contactInquiryCustomerTemplate(inquiry: {
  ticketId: string;
  fullName: string;
  message: string;
}): Omit<MailMessage, 'to'> {
  const subject = `We received your inquiry #${inquiry.ticketId} — ${env.APP_NAME}`;
  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:#EAF1EA;color:#2E4D34;font-size:11px;font-weight:bold;letter-spacing:1px">TICKET REGISTERED</span>
       <h1 style="font-family:Georgia,serif;font-size:24px;margin:10px 0 4px;color:#223B28">Thank You For Contacting Us!</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Ticket Reference: <strong>#${escape(inquiry.ticketId)}</strong></p>
     </div>

     <p style="font-size:14px;line-height:1.6;color:#4A5A4C;margin-bottom:16px">
       Hi ${escape(inquiry.fullName)}, thank you for reaching out to ${escape(env.APP_NAME)}. We have received your inquiry and our community care team is reviewing it. We aim to respond within 24 hours.
     </p>

     <div style="background:#FAF7F2;padding:16px;border-radius:12px;border:1px solid #EAE5DB;margin-bottom:20px">
       <div style="font-size:11px;text-transform:uppercase;color:#7E8F80;font-weight:bold;margin-bottom:8px">Your Message Summary:</div>
       <p style="font-size:13px;line-height:1.6;color:#506052;margin:0;white-space:pre-wrap">${escape(inquiry.message)}</p>
     </div>

     <p style="font-size:12px;color:#7E8F80;margin:20px 0 0;text-align:center">
       If you have any urgent details to add, simply reply directly to this email.
     </p>`
  );

  const text = `Hi ${inquiry.fullName},\n\nWe received your inquiry #${inquiry.ticketId}!\n\nOur team is reviewing your message and will respond promptly within 24 hours.\n\nYour message:\n${inquiry.message}\n\n— Team ${env.APP_NAME}`;
  return { subject, html, text };
}

export function serviceBookingStatusUpdateCustomerTemplate(
  booking: any,
  newStatus: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
  notes?: string
): Omit<MailMessage, 'to'> {
  const isConfirmed = newStatus === 'CONFIRMED';
  const isCancelled = newStatus === 'CANCELLED';
  const isCompleted = newStatus === 'COMPLETED';

  let subject = `Service Booking #${booking.bookingRef} Status Update — ${booking.serviceTitle}`;
  let badgeText = 'STATUS UPDATED';
  let badgeBg = '#EAF1EA';
  let badgeColor = '#2E4D34';
  let title = 'Appointment Status Updated';
  let introMessage = `Hi ${escape(booking.customerName)}, your service booking status has been updated to ${newStatus}.`;

  if (isConfirmed) {
    subject = `✅ Appointment Confirmed #${booking.bookingRef} — ${booking.serviceTitle}`;
    badgeText = 'APPOINTMENT CONFIRMED';
    badgeBg = '#EAF1EA';
    badgeColor = '#2E4D34';
    title = 'Your Appointment is Confirmed!';
    introMessage = `Great news, ${escape(booking.customerName)}! Your appointment request for <strong>${escape(booking.serviceTitle)}</strong> has been approved and confirmed.`;
  } else if (isCancelled) {
    subject = `❌ Appointment Cancelled #${booking.bookingRef} — ${booking.serviceTitle}`;
    badgeText = 'APPOINTMENT CANCELLED';
    badgeBg = '#FDF2F2';
    badgeColor = '#9E2A2B';
    title = 'Appointment Cancelled';
    introMessage = `Hi ${escape(booking.customerName)}, we regret to inform you that your appointment request for <strong>${escape(booking.serviceTitle)}</strong> has been cancelled.`;
  } else if (isCompleted) {
    subject = `🌟 Service Completed #${booking.bookingRef} — Thank You for Choosing ${env.APP_NAME}`;
    badgeText = 'SERVICE COMPLETED';
    badgeBg = '#EAF1EA';
    badgeColor = '#1F4E38';
    title = 'Service Session Completed';
    introMessage = `Hi ${escape(booking.customerName)}, your service session for <strong>${escape(booking.serviceTitle)}</strong> has been successfully completed. We hope you had a rejuvenating experience!`;
  }

  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:${badgeBg};color:${badgeColor};font-size:11px;font-weight:bold;letter-spacing:1px">${badgeText}</span>
       <h1 style="font-family:Georgia,serif;font-size:24px;margin:10px 0 4px;color:#223B28">${title}</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Booking Reference: <strong>#${escape(booking.bookingRef)}</strong></p>
     </div>

     <p style="font-size:14px;line-height:1.6;color:#4A5A4C;margin-bottom:16px">
       ${introMessage}
     </p>

     <div style="background:#FAF7F2;padding:18px;border-radius:14px;margin-bottom:20px;font-size:13px;line-height:1.7;color:#223B28;border:1px solid #EAE5DB">
       <div><strong>Service:</strong> ${escape(booking.serviceTitle)}</div>
       <div><strong>Date:</strong> ${escape(booking.preferredDate)}</div>
       <div><strong>Time Slot:</strong> ${escape(booking.preferredTime)}</div>
       <div><strong>Client:</strong> ${escape(booking.customerName)}</div>
       <div><strong>Status:</strong> <span style="display:inline-block;padding:2px 8px;border-radius:6px;background:${badgeBg};color:${badgeColor};font-size:11px;font-weight:bold">${newStatus}</span></div>
       ${notes ? `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #D5C9B3"><strong>Administrator Note:</strong> ${escape(notes)}</div>` : ''}
     </div>

     <p style="font-size:12px;color:#7E8F80;margin:24px 0 0;text-align:center">
       If you have any questions or wish to reschedule, reply directly to this email or contact us at <a href="mailto:${escape(env.SUPPORT_EMAIL || 'adityashvkmr@gmail.com')}" style="color:#2E4D34;font-weight:bold">${escape(env.SUPPORT_EMAIL || 'adityashvkmr@gmail.com')}</a>.
     </p>`
  );

  const text = `${title} #${booking.bookingRef}\n\n` +
    `Service: ${booking.serviceTitle}\n` +
    `Date: ${booking.preferredDate}\n` +
    `Time: ${booking.preferredTime}\n` +
    `Status: ${newStatus}\n` +
    (notes ? `Note: ${notes}\n` : '') +
    `\nThank you for choosing ${env.APP_NAME}.`;

  return { subject, html, text };
}

export function orderVendorNotificationTemplate(order: any, vendor: any, vendorItems: any[]): Omit<MailMessage, 'to'> {
  const subject = `🛍️ New Order Received: #${order.orderNumber} for ${vendor.storeName || 'Your Store'}`;
  const address = typeof order.shippingAddress === 'object' && order.shippingAddress ? order.shippingAddress : {};
  const cityState = [address.city, address.state, address.pincode].filter(Boolean).join(', ') || 'India';

  const itemsList = vendorItems.map((it: any) => `
    <li style="margin-bottom:8px;font-size:13px;color:#223B28">
      <strong>${escape(it.title || 'Product')}</strong> × ${it.quantity} — <span style="color:#2E4D34;font-weight:600">₹${it.totalPrice || it.unitPrice * it.quantity}</span>
    </li>
  `).join('');

  const totalVendorAmount = vendorItems.reduce((acc: number, it: any) => acc + (it.totalPrice || it.unitPrice * it.quantity), 0);

  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:#2E4D34;color:#FAF7F2;font-size:11px;font-weight:bold;letter-spacing:1px">VENDOR DISPATCH ALERT</span>
       <h1 style="font-family:Georgia,serif;font-size:22px;margin:12px 0 4px;color:#223B28">New Order Received!</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Order Reference: <strong>#${escape(order.orderNumber)}</strong></p>
     </div>

     <p style="font-size:14px;line-height:1.6;color:#4A5A4C;margin-bottom:16px">
       Hello <strong>${escape(vendor.storeName || vendor.contactPerson || 'Artisan Partner')}</strong>, an order containing items from your store has just been placed on ${escape(env.APP_NAME)}.
     </p>

     <div style="background:#FAF7F2;padding:18px;border-radius:14px;margin-bottom:20px;font-size:13px;line-height:1.7;color:#223B28;border:1px solid #EAE5DB">
       <div><strong>Store:</strong> ${escape(vendor.storeName)}</div>
       <div><strong>Order #:</strong> ${escape(order.orderNumber)}</div>
       <div><strong>Ship To:</strong> ${escape(address.name || order.customerName)} (${escape(cityState)})</div>
       <div><strong>Delivery Speed:</strong> ${escape(order.deliverySpeed || 'Standard')} Delivery</div>
       <div><strong>Your Items Subtotal:</strong> <strong style="color:#243F29">₹${totalVendorAmount}</strong></div>
     </div>

     <h4 style="margin:16px 0 8px;font-size:13px;color:#223B28;text-transform:uppercase">Items to Pack</h4>
     <ul style="padding-left:20px;margin-top:0">${itemsList}</ul>

     <p style="font-size:13px;color:#506052;margin-top:16px">
       Please prepare and securely package these handcrafted products for courier handover.
     </p>

     <div style="text-align:center;margin:24px 0">
       <a href="${escape(env.APP_URL)}/vendor/orders" style="display:inline-block;background:#243F29;color:#FAF7F2;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:bold">View Order in Seller Hub</a>
     </div>`
  );

  const text = `New Order #${order.orderNumber} received for ${vendor.storeName}!\n\n` +
    `Items Total: ₹${totalVendorAmount}\n` +
    `Ship To: ${cityState}\n\n` +
    `Please log in to your Seller Hub to view consignment details: ${env.APP_URL}/vendor/orders`;

  return { subject, html, text };
}

export function orderCancellationAdminTemplate(order: any, reason?: string): Omit<MailMessage, 'to'> {
  const subject = `⚠️ Customer Order Cancelled: #${order.orderNumber} (₹${order.totalAmount})`;
  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:#FAF0ED;color:#D82C20;font-size:11px;font-weight:bold;letter-spacing:1px">ORDER CANCELLED</span>
       <h1 style="font-family:Georgia,serif;font-size:22px;margin:12px 0 4px;color:#223B28">Customer Cancelled Order</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Order Reference: <strong>#${escape(order.orderNumber)}</strong></p>
     </div>

     <p style="font-size:14px;line-height:1.6;color:#4A5A4C;margin-bottom:16px">
       Customer <strong>${escape(order.customerName)}</strong> (${escape(order.customerEmail)}) has cancelled order #${escape(order.orderNumber)}.
     </p>

     <div style="background:#FAF7F2;padding:18px;border-radius:14px;margin-bottom:20px;font-size:13px;line-height:1.7;color:#223B28;border:1px solid #EAE5DB">
       <div><strong>Order #:</strong> ${escape(order.orderNumber)}</div>
       <div><strong>Amount:</strong> ₹${order.totalAmount}</div>
       <div><strong>Reason:</strong> ${escape(reason || 'Customer requested cancellation from account page')}</div>
       <div><strong>Inventory Status:</strong> Restocked automatically in database</div>
     </div>

     <div style="text-align:center;margin:24px 0">
       <a href="${escape(env.APP_URL)}/admin/orders" style="display:inline-block;background:#243F29;color:#FAF7F2;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:bold">Open Orders in Admin Console</a>
     </div>`
  );

  const text = `Order #${order.orderNumber} cancelled by customer ${order.customerName}.\n` +
    `Reason: ${reason || 'N/A'}\n` +
    `Inventory has been restocked automatically.\n` +
    `Admin Console: ${env.APP_URL}/admin/orders`;

  return { subject, html, text };
}

export function serviceBookingCancellationAdminTemplate(booking: any, reason?: string): Omit<MailMessage, 'to'> {
  const subject = `⚠️ Service Booking Cancelled: #${booking.bookingRef} — ${booking.serviceTitle}`;
  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:#FAF0ED;color:#D82C20;font-size:11px;font-weight:bold;letter-spacing:1px">BOOKING CANCELLED</span>
       <h1 style="font-family:Georgia,serif;font-size:22px;margin:12px 0 4px;color:#223B28">Service Appointment Cancelled</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Reference ID: <strong>#${escape(booking.bookingRef)}</strong></p>
     </div>

     <p style="font-size:14px;line-height:1.6;color:#4A5A4C;margin-bottom:16px">
       Client <strong>${escape(booking.customerName)}</strong> (${escape(booking.customerEmail)}) has cancelled their service booking.
     </p>

     <div style="background:#FAF7F2;padding:18px;border-radius:14px;margin-bottom:20px;font-size:13px;line-height:1.7;color:#223B28;border:1px solid #EAE5DB">
       <div><strong>Service:</strong> ${escape(booking.serviceTitle)}</div>
       <div><strong>Scheduled Date:</strong> ${escape(booking.preferredDate)} at ${escape(booking.preferredTime)}</div>
       <div><strong>Reason:</strong> ${escape(reason || 'Client cancelled appointment from dashboard')}</div>
     </div>

     <div style="text-align:center;margin:24px 0">
       <a href="${escape(env.APP_URL)}/admin/services" style="display:inline-block;background:#243F29;color:#FAF7F2;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:bold">Open Services in Admin Console</a>
     </div>`
  );

  const text = `Service booking #${booking.bookingRef} (${booking.serviceTitle}) was cancelled by client ${booking.customerName}.\n` +
    `Scheduled: ${booking.preferredDate} at ${booking.preferredTime}\n` +
    `Reason: ${reason || 'N/A'}\n` +
    `Admin Console: ${env.APP_URL}/admin/services`;

  return { subject, html, text };
}

export function supportTicketAdminNotificationTemplate(ticket: {
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  vendorStoreName: string;
  vendorLegalName?: string;
  vendorEmail?: string;
  message: string;
}): Omit<MailMessage, 'to'> {
  const priorityUpper = (ticket.priority || 'medium').toUpperCase();
  const priorityColor =
    priorityUpper === 'URGENT' ? '#B3261E' :
    priorityUpper === 'HIGH' ? '#C25E00' :
    priorityUpper === 'MEDIUM' ? '#2E4D34' : '#5F6D61';
  const priorityBg =
    priorityUpper === 'URGENT' ? '#FEE2E2' :
    priorityUpper === 'HIGH' ? '#FEF3C7' :
    priorityUpper === 'MEDIUM' ? '#EAF1EA' : '#F3F4F6';

  const subject = `[${priorityUpper} PRIORITY] Support Ticket #${ticket.ticketNumber} from ${ticket.vendorStoreName}`;

  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:${priorityBg};color:${priorityColor};font-size:11px;font-weight:bold;letter-spacing:1px">${priorityUpper} PRIORITY</span>
       <h1 style="font-family:Georgia,serif;font-size:22px;margin:12px 0 4px;color:#223B28">Artisan Seller Support Request</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Ticket: <strong>#${escape(ticket.ticketNumber)}</strong></p>
     </div>

     <p style="font-size:14px;line-height:1.6;color:#4A5A4C;margin-bottom:16px">
       A seller has submitted a new support ticket that requires attention from the support desk:
     </p>

     <div style="background:#FAF7F2;padding:18px;border-radius:14px;margin-bottom:20px;font-size:13px;line-height:1.7;color:#223B28;border:1px solid #EAE5DB">
       <div><strong>Store Name:</strong> ${escape(ticket.vendorStoreName)}</div>
       ${ticket.vendorLegalName ? `<div><strong>Legal Name:</strong> ${escape(ticket.vendorLegalName)}</div>` : ''}
       ${ticket.vendorEmail ? `<div><strong>Vendor Email:</strong> <a href="mailto:${escape(ticket.vendorEmail)}" style="color:#2E4D34">${escape(ticket.vendorEmail)}</a></div>` : ''}
       <div><strong>Category:</strong> <span style="text-transform:uppercase;font-weight:bold">${escape(ticket.category)}</span></div>
       <div><strong>Priority:</strong> <span style="color:${priorityColor};font-weight:bold">${priorityUpper}</span></div>
       <div><strong>Subject:</strong> <strong>${escape(ticket.subject)}</strong></div>
       <div><strong>Submitted At:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
     </div>

     <div style="background:#FFFFFF;padding:16px;border-radius:12px;border:1px solid #EAE5DB;margin-bottom:20px">
       <div style="font-size:11px;text-transform:uppercase;color:#7E8F80;font-weight:bold;margin-bottom:8px">Artisan's Message:</div>
       <p style="font-size:13px;line-height:1.7;color:#223B28;margin:0;white-space:pre-wrap">${escape(ticket.message)}</p>
     </div>

     <div style="text-align:center;margin:24px 0">
       <a href="${escape(env.APP_URL)}/admin/support" style="display:inline-block;background:#243F29;color:#FAF7F2;text-decoration:none;padding:11px 26px;border-radius:10px;font-size:13px;font-weight:bold">Open Support Desk to Reply</a>
     </div>`
  );

  const text = `New [${priorityUpper}] Support Ticket #${ticket.ticketNumber} from ${ticket.vendorStoreName}\n\n` +
    `Subject: ${ticket.subject}\n` +
    `Category: ${ticket.category}\n` +
    `Priority: ${priorityUpper}\n\n` +
    `Message:\n${ticket.message}\n\n` +
    `Manage and reply at: ${env.APP_URL}/admin/support`;

  return { subject, html, text };
}

export function serviceBookingVendorTemplate(booking: any, vendor: any): Omit<MailMessage, 'to'> {
  const subject = `📅 New Workshop / Service Booking: #${booking.bookingRef} — ${booking.serviceTitle}`;

  const html = layout(
    subject,
    `<div style="text-align:center;margin-bottom:20px">
       <span style="display:inline-block;padding:4px 14px;border-radius:20px;background:#2E4D34;color:#FAF7F2;font-size:11px;font-weight:bold;letter-spacing:1px">NEW SERVICE BOOKING</span>
       <h1 style="font-family:Georgia,serif;font-size:22px;margin:12px 0 4px;color:#223B28">New Appointment Received!</h1>
       <p style="font-size:13px;color:#6C7B6D;margin:0">Booking Reference: <strong>#${escape(booking.bookingRef)}</strong></p>
     </div>

     <p style="font-size:14px;line-height:1.6;color:#4A5A4C;margin-bottom:16px">
       Hello <strong>${escape(vendor.storeName || vendor.contactPerson || 'Artisan Partner')}</strong>, a customer has booked your workshop/service experience on ${escape(env.APP_NAME)}.
     </p>

     <div style="background:#FAF7F2;padding:18px;border-radius:14px;margin-bottom:20px;font-size:13px;line-height:1.7;color:#223B28;border:1px solid #EAE5DB">
       <div><strong>Service / Workshop:</strong> ${escape(booking.serviceTitle)}</div>
       <div><strong>Scheduled Date:</strong> <strong style="color:#243F29">${escape(booking.preferredDate)}</strong></div>
       <div><strong>Time Slot:</strong> <strong style="color:#243F29">${escape(booking.preferredTime)}</strong></div>
       <div><strong>Customer Name:</strong> ${escape(booking.customerName)}</div>
       <div><strong>Customer Contact:</strong> ${escape(booking.customerEmail)} ${booking.customerPhone ? `(${escape(booking.customerPhone)})` : ''}</div>
       ${booking.notes ? `<div><strong>Customer Notes:</strong> ${escape(booking.notes)}</div>` : ''}
       <div><strong>Booking Status:</strong> <span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#FEF3C7;color:#92400E;font-size:11px;font-weight:bold">Pending Confirmation</span></div>
     </div>

     <p style="font-size:13px;color:#506052;margin-top:16px">
       Please review the appointment details in your seller portal and confirm the slot for the customer.
     </p>

     <div style="text-align:center;margin:24px 0">
       <a href="${escape(env.APP_URL)}/vendor/services" style="display:inline-block;background:#243F29;color:#FAF7F2;text-decoration:none;padding:11px 26px;border-radius:10px;font-size:13px;font-weight:bold">Manage Bookings in Seller Hub</a>
     </div>`
  );

  const text = `New Workshop/Service Booking #${booking.bookingRef} received for ${vendor.storeName}!\n\n` +
    `Service: ${booking.serviceTitle}\n` +
    `Date & Time: ${booking.preferredDate} at ${booking.preferredTime}\n` +
    `Customer: ${booking.customerName} (${booking.customerEmail})\n\n` +
    `Manage your bookings at: ${env.APP_URL}/vendor/services`;

  return { subject, html, text };
}
