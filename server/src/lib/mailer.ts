import dns from 'node:dns/promises';
import net from 'node:net';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

/**
 * SMTP delivery with network failover.
 *
 * Mail providers publish several IPs for their SMTP host. Some networks/ISPs cannot
 * reach every one of them (and IPv6 routes are often broken), which shows up as random
 * "Connection timeout" errors. We therefore resolve ALL IPv4 addresses, connect to them
 * directly (TLS still verified against the real hostname) and fail over to the next
 * address when one is unreachable, remembering bad IPs for 10 minutes.
 */

const BAD_IP_TTL_MS = 10 * 60_000;
const badIps = new Map<string, number>();
const transports = new Map<string, Transporter>();

async function candidateAddresses(): Promise<string[]> {
  const host = env.SMTP_HOST!;
  if (net.isIP(host)) return [host];
  let ips: string[] = [];
  try {
    ips = await dns.resolve4(host);
  } catch {
    try {
      ips = [(await dns.lookup(host, { family: 4 })).address];
    } catch {
      return [host]; // let nodemailer resolve it
    }
  }
  const now = Date.now();
  const good = ips.filter((ip) => (badIps.get(ip) ?? 0) < now);
  return good.length ? good : ips; // if all marked bad, retry them anyway
}

function transportFor(address: string): Transporter {
  let t = transports.get(address);
  if (!t) {
    t = nodemailer.createTransport({
      host: address,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      tls: { servername: env.SMTP_HOST },
      name: 'chillyflakes-api',
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 20_000,
    });
    transports.set(address, t);
  }
  return t;
}

const NETWORK_ERROR = /timeout|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|EAI_AGAIN|ESOCKET|ECONNECTION|socket/i;

/** Runs `fn` against each reachable SMTP address until one succeeds. */
async function withFailover<T>(label: string, fn: (t: Transporter) => Promise<T>): Promise<T> {
  const addresses = await candidateAddresses();
  let lastErr: unknown;
  for (const address of addresses) {
    try {
      return await fn(transportFor(address));
    } catch (err) {
      lastErr = err;
      const e = err as Error & { code?: string };
      if (!NETWORK_ERROR.test(`${e.code || ''} ${e.message}`)) throw err; // auth/content error — don't retry
      console.warn(`[mail] ${label}: ${address} unreachable (${e.code || e.message}) — trying next address`);
      badIps.set(address, Date.now() + BAD_IP_TTL_MS);
      transports.get(address)?.close();
      transports.delete(address);
    }
  }
  throw lastErr;
}

/** Verifies SMTP credentials at boot so misconfiguration is caught immediately. */
export async function verifyMailer(): Promise<void> {
  if (!env.smtpConfigured) {
    console.warn('⚠️  SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS) — emails & verification codes will be logged to this console.');
    return;
  }
  try {
    await withFailover('verify', (t) => t.verify());
    console.info(`✉️  SMTP ready (${env.SMTP_HOST}:${env.SMTP_PORT} as ${env.SMTP_USER})`);
  } catch (err) {
    const msg = `SMTP check failed — ${(err as Error).message}`;
    console.warn(`⚠️  ${msg} — falling back to console mail logging.`);
  }
}

export interface MailMessage {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Fake / reserved / test recipient domains. Mail to these can never be delivered and Gmail
 * bounces every attempt back to the SMTP account as "Delivery incomplete" notices.
 */
const UNDELIVERABLE_DOMAIN = /@(?:[^@]+\.)?(example\.(com|org|net)|test|invalid|localhost|local|testcraft\.in|mailinator\.com|test\.com)$/i;
const TEST_LOCALPART = /^(e2e\.|test\d|temp\.buyer|testbuyer_|artisan2?_audit_|buyer_audit_|kyctest)/i;

export function isUndeliverableTestAddress(to: string): boolean {
  const addr = to.trim().toLowerCase();
  return UNDELIVERABLE_DOMAIN.test(addr) || TEST_LOCALPART.test(addr);
}

export async function sendMail(msg: MailMessage): Promise<void> {
  if (isUndeliverableTestAddress(msg.to)) {
    console.info(`[mail] skipped (test/fake address) "${msg.subject}" → ${msg.to}`);
    return;
  }
  if (!env.smtpConfigured) {
    console.info(`\n──── ✉️  SIMULATED EMAIL (NO SMTP CONFIGURED) ────\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n────────────────────────────────────────────────\n`);
    return;
  }
  const mail = {
    from: env.MAIL_FROM || `${env.APP_NAME} <${env.SMTP_USER}>`,
    replyTo: msg.replyTo || env.SUPPORT_EMAIL || undefined,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  };

  // Two full passes over all addresses before giving up
  for (let pass = 1; pass <= 2; pass++) {
    try {
      const info = await withFailover('send', (t) => t.sendMail(mail));
      console.info(`[mail] sent "${msg.subject}" → ${msg.to} (${info.messageId})`);
      return;
    } catch (err) {
      const e = err as Error & { code?: string };
      if (pass === 2 || !NETWORK_ERROR.test(`${e.code || ''} ${e.message}`)) {
        console.error(`[mail] delivery failed: ${e.code || ''} ${e.message}`);
        throw err;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}
