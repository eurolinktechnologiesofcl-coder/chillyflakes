import { z } from 'zod';

const normalizePhone = (raw: string) => {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};

export const email = z
  .string({ error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254);

export const phone = z
  .string({ error: 'Mobile number is required.' })
  .transform(normalizePhone)
  .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number.');

export const password = z
  .string({ error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must contain at least one letter and one number.');

export const code = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name.').max(80),
  email,
  phone,
  password,
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or mobile number.').max(254),
  password: z.string().min(1, 'Enter your password.').max(128),
});

export const emailOnlySchema = z.object({ email });
export const verifyCodeSchema = z.object({ email, code });
export const resetSchema = z.object({ email, reset_token: z.string().min(10), password });
export const profileSchema = z
  .object({ name: z.string().trim().min(2, 'Please enter your full name.').max(80).optional(), phone: phone.optional() })
  .refine((v) => v.name !== undefined || v.phone !== undefined, 'Nothing to update.');

export { normalizePhone };
