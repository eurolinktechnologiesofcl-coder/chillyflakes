import { Router } from 'express';
import { z } from 'zod';
import { sendMail } from '../../lib/mailer.js';
import { emitToAdmin } from '../../socket.js';
import { env } from '../../config/env.js';
import {
  contactInquiryAdminTemplate,
  contactInquiryCustomerTemplate,
} from '../../emails/templates.js';

export const contactRouter = Router();

const contactSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  email: z.string().email('Please provide a valid email address'),
  phone: z.string().optional(),
  state: z.string().optional(),
  inquiryType: z.string().default('customer-support'),
  categoryInterest: z.string().optional(),
  preferredLanguage: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
});

contactRouter.post('/', async (req, res) => {
  const data = contactSchema.parse(req.body);

  const ticketId = `CF-TKT-${Math.floor(100000 + Math.random() * 900000)}`;

  const inquiry = {
    ticketId,
    fullName: data.fullName.trim(),
    email: data.email.toLowerCase().trim(),
    phone: data.phone?.trim(),
    state: data.state?.trim(),
    inquiryType: data.inquiryType,
    categoryInterest: data.categoryInterest,
    preferredLanguage: data.preferredLanguage,
    message: data.message.trim(),
  };

  // 1. Emit real-time notification to admin console
  emitToAdmin('admin:support_inquiry', {
    ticketId,
    fullName: inquiry.fullName,
    email: inquiry.email,
    inquiryType: inquiry.inquiryType,
    createdAt: new Date().toISOString(),
  });

  // 2. Respond immediately with success to ensure fast UI response (<50ms)
  res.status(201).json({
    success: true,
    ticketId,
    message: `Inquiry #${ticketId} submitted successfully! A confirmation email has been dispatched to ${inquiry.email}.`,
  });

  // 3. Dispatch emails asynchronously in background without blocking the HTTP response
  setImmediate(async () => {
    try {
      const custTpl = contactInquiryCustomerTemplate(inquiry);
      await sendMail({ to: inquiry.email, ...custTpl });
      console.log(`[contact:email] Sent inquiry confirmation to customer ${inquiry.email} for #${ticketId}`);
    } catch (err) {
      console.error(`[contact:email] Failed to send confirmation to customer ${inquiry.email}:`, (err as Error).message);
    }

    const adminEmail = env.SUPPORT_EMAIL || 'adityashvkmr@gmail.com';
    try {
      const adminTpl = contactInquiryAdminTemplate(inquiry);
      await sendMail({
        to: adminEmail,
        replyTo: inquiry.email,
        ...adminTpl,
      });
      console.log(`[contact:email] Sent inquiry alert to admin ${adminEmail} for #${ticketId}`);
    } catch (err) {
      console.error(`[contact:email] Failed to send alert to admin ${adminEmail}:`, (err as Error).message);
    }
  });
});
