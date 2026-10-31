import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  /** Comma-separated list of allowed browser origins, e.g. https://chillyflakes.in,https://www.chillyflakes.in */
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  /** Public storefront URL used in emails. */
  APP_URL: z.string().default('http://localhost:5173'),
  APP_NAME: z.string().default('ChillyFlakes'),

  SESSION_TTL_DAYS: z.coerce.number().default(30),
  TRUST_PROXY: bool,

  // SMTP (Gmail app password, Zoho, Hostinger, SES, Brevo, Resend SMTP …)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: bool,
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  SUPPORT_EMAIL: z.string().optional(),

  /** Return one-time codes in API responses (local testing only). Ignored in production. */
  EXPOSE_DEV_CODES: bool,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  smtpConfigured: Boolean(parsed.data.SMTP_HOST && parsed.data.SMTP_USER && parsed.data.SMTP_PASS),
  exposeDevCodes: Boolean(parsed.data.EXPOSE_DEV_CODES) || !Boolean(parsed.data.SMTP_HOST && parsed.data.SMTP_USER && parsed.data.SMTP_PASS) || parsed.data.NODE_ENV !== 'production',
};
