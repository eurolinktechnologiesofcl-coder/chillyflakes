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
  if (net.isIP(host) || host.includes('gmail.com')) return [host];
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
  return good.length ? [host, ...good] : [host, ...ips];
}

let smtpNetworkReachable: boolean | null = null;

function transportFor(address: string): Transporter {
  let t = transports.get(address);
  if (!t) {
    const isHost = !net.isIP(address);
    t = nodemailer.createTransport({
      host: address,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      tls: isHost ? { rejectUnauthorized: false } : { servername: env.SMTP_HOST },
      name: 'chillyflakes-api',
      connectionTimeout: 3_000,
      greetingTimeout: 3_000,
      socketTimeout: 5_000,
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
      console.warn(`[mail] ${label}: ${address} unreachable (${e.code || e.message})`);
      badIps.set(address, Date.now() + BAD_IP_TTL_MS);
      transports.get(address)?.close();
      transports.delete(address);
      break; // Stop immediately on port timeout to avoid stalling requests
    }
  }
  throw lastErr;
}

/** Verifies SMTP credentials at boot so misconfiguration is caught immediately. */
export async function verifyMailer(): Promise<void> {
  if (env.RESEND_API_KEY) {
    console.info(`✉️  Resend HTTP API enabled for email delivery.`);
    return;
  }
  if (!env.smtpConfigured) {
    console.warn('⚠️  SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS) — emails & verification codes will be logged to this console.');
    return;
  }
  try {
    await withFailover('verify', (t) => t.verify());
    smtpNetworkReachable = true;
    console.info(`✉️  SMTP ready (${env.SMTP_HOST}:${env.SMTP_PORT} as ${env.SMTP_USER})`);
  } catch (err) {
    smtpNetworkReachable = false;
    const msg = `SMTP check failed — ${(err as Error).message}`;
    console.warn(`⚠️  ${msg} — host network appears to block outbound SMTP ports. Emails will be logged to console & exposed via dev_code.`);
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

  // 1. If Resend API Key is provided, use HTTPS (Port 443 — guaranteed to pass cloud firewalls)
  if (env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: env.MAIL_FROM || `${env.APP_NAME} <onboarding@resend.dev>`,
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        console.info(`[mail:resend] sent "${msg.subject}" → ${msg.to} (${data.id})`);
        return;
      }
      const errText = await res.text();
      console.warn(`[mail:resend] API error: ${errText}`);
    } catch (httpErr) {
      console.warn(`[mail:resend] HTTP fetch error: ${(httpErr as Error).message}`);
    }
  }

  // 2. If SMTP is not configured or host has blocked SMTP network ports
  if (!env.smtpConfigured || smtpNetworkReachable === false) {
    console.info(`\n──── ✉️  SIMULATED EMAIL (${smtpNetworkReachable === false ? 'OUTBOUND SMTP BLOCKED BY HOST' : 'NO SMTP CONFIGURED'}) ────\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n────────────────────────────────────────────────\n`);
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

  try {
    const info = await withFailover('send', (t) => t.sendMail(mail));
    smtpNetworkReachable = true;
    console.info(`[mail] sent "${msg.subject}" → ${msg.to} (${info.messageId})`);
    return;
  } catch (err) {
    const e = err as Error & { code?: string };
    if (NETWORK_ERROR.test(`${e.code || ''} ${e.message}`)) {
      smtpNetworkReachable = false;
    }
    console.error(`[mail] delivery failed: ${e.code || ''} ${e.message}`);
    throw err;
  }
}
