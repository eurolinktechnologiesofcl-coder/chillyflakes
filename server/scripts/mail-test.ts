/**
 * Sends a real test email using the SMTP settings in server/.env.
 *   npm run mail:test -- you@example.com
 */
import { env } from '../src/config/env.js';
import { verifyMailer, sendMail } from '../src/lib/mailer.js';
import { verifyEmailTemplate } from '../src/emails/templates.js';

const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run mail:test -- you@example.com');
  process.exit(1);
}
if (!env.smtpConfigured) {
  console.error('❌ SMTP_HOST / SMTP_USER / SMTP_PASS are empty in server/.env');
  process.exit(1);
}

await verifyMailer();
try {
  await sendMail({ to, ...verifyEmailTemplate('there', '123456', 10) });
  console.info(`✅ Test email sent to ${to} — check inbox (and spam).`);
  process.exit(0);
} catch (err) {
  console.error('❌ Send failed:', (err as Error).message);
  process.exit(1);
}
