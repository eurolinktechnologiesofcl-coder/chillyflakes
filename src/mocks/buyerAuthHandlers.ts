/**
 * Buyer (shopper) authentication — mock backend.
 *
 * Mirrors a production auth service contract:
 *   POST /api/v1/buyer/auth/register/                 → { user, token }
 *   POST /api/v1/buyer/auth/login/                    → { user, token }
 *   GET  /api/v1/buyer/auth/me/                       → { user }          (Bearer token)
 *   POST /api/v1/buyer/auth/logout/                   → 204               (Bearer token)
 *   PATCH /api/v1/buyer/auth/profile/                 → { user }          (Bearer token)
 *   POST /api/v1/buyer/auth/forgot-password/request/  → generic 200 (no account enumeration)
 *   POST /api/v1/buyer/auth/forgot-password/verify/   → { reset_token }
 *   POST /api/v1/buyer/auth/forgot-password/reset/    → 200 (revokes all sessions)
 *
 * Passwords are stored as salted SHA-256 hashes, sessions are opaque random
 * tokens, brute-force is throttled (5 attempts → 15 min lock) and accounts
 * suspended/deleted by Super Admin cannot sign in.
 */
import { http, HttpResponse, delay } from 'msw';
import { loadPersisted, registerPersisted } from './persist';
import { activeUsers } from './adminHandlers';
import { registerBuyerCustomer } from '../utils/platformSync';

const BASE = '*/api/v1/buyer/auth';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const RESET_CODE_TTL_MIN = 10;
const RESET_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 30;
const SESSION_TTL_DAYS = 30;

interface BuyerAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  salt: string;
  created_at: string;
  last_login: string | null;
  failed_attempts: number;
  locked_until: string | null;
  /** false until the emailed code is confirmed (undefined = legacy, treated as verified) */
  email_verified?: boolean;
}

interface BuyerSession {
  account_id: string;
  expires_at: string;
}

interface ResetRecord {
  account_id: string;
  code: string;
  expires_at: string;
  attempts: number;
  sent_at: string;
  reset_token?: string;
}

const accounts: BuyerAccount[] = loadPersisted<BuyerAccount[]>('buyer_accounts', []);
let sessions: Record<string, BuyerSession> = loadPersisted<Record<string, BuyerSession>>('buyer_sessions', {});
const resets: Record<string, ResetRecord> = loadPersisted<Record<string, ResetRecord>>('buyer_password_resets', {});

registerPersisted('buyer_accounts', () => accounts);
registerPersisted('buyer_sessions', () => sessions);
registerPersisted('buyer_password_resets', () => resets);

interface VerifyRecord {
  code: string;
  expires_at: string;
  sent_at: string;
  attempts: number;
}
const verifications: Record<string, VerifyRecord> = loadPersisted<Record<string, VerifyRecord>>('buyer_email_verifications', {});
registerPersisted('buyer_email_verifications', () => verifications);

/** Issues an email-verification code (mock has no mail server, so the code is returned as dev_code). */
function issueVerifyCode(email: string) {
  const prev = verifications[email];
  if (prev && Date.now() - new Date(prev.sent_at).getTime() < 30_000) {
    return {
      expires_in_seconds: 600,
      resend_after_seconds: Math.ceil(30 - (Date.now() - new Date(prev.sent_at).getTime()) / 1000),
      dev_code: prev.code,
    };
  }
  const code = sixDigitCode();
  verifications[email] = {
    code,
    attempts: 0,
    sent_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  };
  return { expires_in_seconds: 600, resend_after_seconds: 30, dev_code: code };
}

/* ------------------------------- helpers -------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function sixDigitCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, '0');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  if (crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Non-secure context fallback (FNV-1a) — only used when SubtleCrypto is unavailable
  let h = 0x811c9dc5;
  data.forEach((b) => {
    h ^= b;
    h = Math.imul(h, 0x01000193);
  });
  return (h >>> 0).toString(16);
}

function normalizePhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

function passwordIssue(pw: string): string | null {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain at least one letter and one number.';
  return null;
}

function publicUser(a: BuyerAccount) {
  return { id: a.id, name: a.name, email: a.email, phone: a.phone, created_at: a.created_at };
}

function error(status: number, code: string, message: string, fieldErrors?: Record<string, string[]>) {
  return HttpResponse.json({ code, message, ...(fieldErrors ? { fieldErrors } : {}) }, { status });
}

function findByIdentifier(identifier: string): BuyerAccount | undefined {
  const id = identifier.trim().toLowerCase();
  if (id.includes('@')) return accounts.find((a) => a.email === id);
  const phone = normalizePhone(id);
  return accounts.find((a) => a.phone === phone);
}

/** Suspended / banned / deleted by Super Admin. */
function isBlocked(email: string): boolean {
  const match = activeUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  return Boolean(match && (match.is_deleted || match.status !== 'active'));
}

function createSession(accountId: string): string {
  const token = `cfb_${randomToken()}`;
  sessions[token] = {
    account_id: accountId,
    expires_at: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString(),
  };
  return token;
}

function revokeSessionsFor(accountId: string) {
  sessions = Object.fromEntries(Object.entries(sessions).filter(([, s]) => s.account_id !== accountId));
}

function accountFromRequest(request: Request): { account: BuyerAccount; token: string } | null {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = token ? sessions[token] : undefined;
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    delete sessions[token];
    return null;
  }
  const account = accounts.find((a) => a.id === session.account_id);
  return account ? { account, token } : null;
}

/* ------------------------------- handlers ------------------------------- */

export const buyerAuthHandlers = [
  // REGISTER
  http.post(`${BASE}/register/`, async ({ request }) => {
    await delay(500);
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = normalizePhone(body.phone);
    const password = String(body.password || '');

    const fieldErrors: Record<string, string[]> = {};
    if (name.length < 2) fieldErrors.name = ['Please enter your full name.'];
    if (!EMAIL_RE.test(email)) fieldErrors.email = ['Enter a valid email address.'];
    if (!PHONE_RE.test(phone)) fieldErrors.phone = ['Enter a valid 10-digit Indian mobile number.'];
    const pwIssue = passwordIssue(password);
    if (pwIssue) fieldErrors.password = [pwIssue];
    if (!fieldErrors.email && accounts.some((a) => a.email === email && a.email_verified !== false)) {
      fieldErrors.email = ['An account with this email already exists. Please sign in.'];
    }
    if (!fieldErrors.phone && accounts.some((a) => a.phone === phone && a.email !== email)) {
      fieldErrors.phone = ['This mobile number is already registered.'];
    }
    if (Object.keys(fieldErrors).length) {
      return error(400, 'validation_error', 'Please correct the highlighted fields.', fieldErrors);
    }
    if (isBlocked(email)) {
      return error(403, 'account_suspended', 'This email has been suspended. Please contact support.');
    }

    const existing = accounts.find((a) => a.email === email);
    const salt = randomToken(16);
    const now = new Date().toISOString();
    let account: BuyerAccount;
    if (existing && existing.email_verified === false) {
      // Unverified sign-up retried: refresh details
      existing.name = name;
      existing.phone = phone;
      existing.salt = salt;
      existing.password_hash = await hashPassword(password, salt);
      account = existing;
    } else {
      account = {
        id: `buyer_${Date.now()}_${randomToken(3)}`,
        name,
        email,
        phone,
        salt,
        password_hash: await hashPassword(password, salt),
        created_at: now,
        last_login: null,
        failed_attempts: 0,
        locked_until: null,
        email_verified: false,
      };
      accounts.push(account);
    }

    return HttpResponse.json(
      { verification_required: true, email, message: `We've sent a 6-digit code to ${email}.`, ...issueVerifyCode(email) },
      { status: 201 }
    );
  }),

  // VERIFY EMAIL
  http.post(`${BASE}/verify-email/`, async ({ request }) => {
    await delay(400);
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    const account = accounts.find((a) => a.email === email);
    const record = verifications[email];
    if (!account || !record) return error(400, 'invalid_code', 'Invalid or expired code. Please request a new one.');
    if (account.email_verified !== false) return error(400, 'already_verified', 'This email is already verified. Please sign in.');
    if (new Date(record.expires_at).getTime() < Date.now()) {
      delete verifications[email];
      return error(400, 'code_expired', 'This code has expired. Please request a new one.');
    }
    if (record.attempts >= RESET_MAX_ATTEMPTS) {
      delete verifications[email];
      return error(429, 'too_many_attempts', 'Too many incorrect attempts. Please request a new code.');
    }
    if (record.code !== code) {
      record.attempts += 1;
      const left = RESET_MAX_ATTEMPTS - record.attempts;
      return error(400, 'invalid_code', `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`);
    }
    delete verifications[email];
    account.email_verified = true;
    account.last_login = new Date().toISOString();
    registerBuyerCustomer({ name: account.name, email: account.email, phone: account.phone });
    return HttpResponse.json({ user: publicUser(account), token: createSession(account.id) });
  }),

  http.post(`${BASE}/verify-email/resend/`, async ({ request }) => {
    await delay(400);
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const email = String(body.email || '').trim().toLowerCase();
    const generic = { message: 'If this email is awaiting verification, a new code has been sent.', expires_in_seconds: RESET_CODE_TTL_MIN * 60, resend_after_seconds: RESEND_COOLDOWN_SEC };
    const account = accounts.find((a) => a.email === email);
    if (!account || account.email_verified !== false) return HttpResponse.json(generic);
    const prev = verifications[email];
    if (prev && Date.now() - new Date(prev.sent_at).getTime() < RESEND_COOLDOWN_SEC * 1000) {
      const wait = Math.ceil(RESEND_COOLDOWN_SEC - (Date.now() - new Date(prev.sent_at).getTime()) / 1000);
      return HttpResponse.json({ code: 'rate_limited', message: `Please wait ${wait}s before requesting a new code.`, retry_after_seconds: wait }, { status: 429 });
    }
    return HttpResponse.json({ ...generic, ...issueVerifyCode(email) });
  }),

  // LOGIN
  http.post(`${BASE}/login/`, async ({ request }) => {
    await delay(500);
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const identifier = String(body.identifier || '').trim();
    const password = String(body.password || '');

    if (!identifier || !password) {
      return error(400, 'validation_error', 'Enter your email / mobile number and password.');
    }

    const account = findByIdentifier(identifier);
    if (!account) {
      return error(401, 'not_registered', 'This email or mobile number is not registered with us. Please sign up or create an account first.');
    }

    if (account.locked_until && new Date(account.locked_until).getTime() > Date.now()) {
      const mins = Math.ceil((new Date(account.locked_until).getTime() - Date.now()) / 60_000);
      return error(423, 'account_locked', `Too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''} or reset your password.`);
    }

    const hash = await hashPassword(password, account.salt);
    if (hash !== account.password_hash) {
      account.failed_attempts += 1;
      if (account.failed_attempts >= MAX_FAILED_ATTEMPTS) {
        account.locked_until = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
        account.failed_attempts = 0;
        return error(423, 'account_locked', `Too many failed attempts. Your account is locked for ${LOCK_MINUTES} minutes.`);
      }
      const left = MAX_FAILED_ATTEMPTS - account.failed_attempts;
      return error(401, 'invalid_credentials', `Incorrect password. Please verify your credentials or reset your password. (${left} attempt${left > 1 ? 's' : ''} left)`);
    }

    if (isBlocked(account.email)) {
      return error(403, 'account_suspended', 'Your account has been suspended. Please contact support.');
    }

    if (account.email_verified === false) {
      return HttpResponse.json(
        {
          code: 'email_not_verified',
          message: `Please verify your email. We've sent a code to ${account.email}.`,
          email: account.email,
          ...issueVerifyCode(account.email),
        },
        { status: 403 }
      );
    }

    account.failed_attempts = 0;
    account.locked_until = null;
    account.last_login = new Date().toISOString();
    registerBuyerCustomer({ name: account.name, email: account.email, phone: account.phone });

    return HttpResponse.json({ user: publicUser(account), token: createSession(account.id) });
  }),

  // CURRENT USER
  http.get(`${BASE}/me/`, async ({ request }) => {
    const ctx = accountFromRequest(request);
    if (!ctx) return error(401, 'not_authenticated', 'Your session has expired. Please sign in again.');
    if (isBlocked(ctx.account.email)) {
      delete sessions[ctx.token];
      return error(403, 'account_suspended', 'Your account has been suspended. Please contact support.');
    }
    return HttpResponse.json({ user: publicUser(ctx.account) });
  }),

  // LOGOUT
  http.post(`${BASE}/logout/`, async ({ request }) => {
    const ctx = accountFromRequest(request);
    if (ctx) delete sessions[ctx.token];
    return new HttpResponse(null, { status: 204 });
  }),

  // UPDATE PROFILE
  http.patch(`${BASE}/profile/`, async ({ request }) => {
    await delay(300);
    const ctx = accountFromRequest(request);
    if (!ctx) return error(401, 'not_authenticated', 'Please sign in again.');
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const fieldErrors: Record<string, string[]> = {};
    if (body.name !== undefined && String(body.name).trim().length < 2) fieldErrors.name = ['Please enter your full name.'];
    if (body.phone !== undefined) {
      const phone = normalizePhone(body.phone);
      if (!PHONE_RE.test(phone)) fieldErrors.phone = ['Enter a valid 10-digit Indian mobile number.'];
      else if (accounts.some((a) => a.phone === phone && a.id !== ctx.account.id)) fieldErrors.phone = ['This mobile number is already registered.'];
    }
    if (Object.keys(fieldErrors).length) return error(400, 'validation_error', 'Please correct the highlighted fields.', fieldErrors);
    if (body.name !== undefined) ctx.account.name = String(body.name).trim();
    if (body.phone !== undefined) ctx.account.phone = normalizePhone(body.phone);
    registerBuyerCustomer({ name: ctx.account.name, email: ctx.account.email, phone: ctx.account.phone });
    return HttpResponse.json({ user: publicUser(ctx.account) });
  }),

  // FORGOT PASSWORD — request code
  http.post(`${BASE}/forgot-password/request/`, async ({ request }) => {
    await delay(500);
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return error(400, 'validation_error', 'Enter a valid email address.', { email: ['Enter a valid email address.'] });
    }

    const generic = {
      message: 'If an account exists for this email, a 6-digit verification code has been sent.',
      expires_in_seconds: RESET_CODE_TTL_MIN * 60,
      resend_after_seconds: RESEND_COOLDOWN_SEC,
    };

    const account = accounts.find((a) => a.email === email);
    if (!account) return HttpResponse.json(generic);

    const prev = resets[email];
    if (prev && Date.now() - new Date(prev.sent_at).getTime() < RESEND_COOLDOWN_SEC * 1000) {
      const wait = Math.ceil(RESEND_COOLDOWN_SEC - (Date.now() - new Date(prev.sent_at).getTime()) / 1000);
      return error(429, 'rate_limited', `Please wait ${wait}s before requesting a new code.`);
    }

    const code = sixDigitCode();
    resets[email] = {
      account_id: account.id,
      code,
      attempts: 0,
      sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + RESET_CODE_TTL_MIN * 60_000).toISOString(),
    };
    // No mail server in the mock backend — expose the code so the flow is testable.
    return HttpResponse.json({ ...generic, dev_code: code });
  }),

  // FORGOT PASSWORD — verify code
  http.post(`${BASE}/forgot-password/verify/`, async ({ request }) => {
    await delay(400);
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    const record = resets[email];

    if (!record) return error(400, 'invalid_code', 'Invalid or expired code. Please request a new one.');
    if (new Date(record.expires_at).getTime() < Date.now()) {
      delete resets[email];
      return error(400, 'code_expired', 'This code has expired. Please request a new one.');
    }
    if (record.attempts >= RESET_MAX_ATTEMPTS) {
      delete resets[email];
      return error(429, 'too_many_attempts', 'Too many incorrect attempts. Please request a new code.');
    }
    if (record.code !== code) {
      record.attempts += 1;
      const left = RESET_MAX_ATTEMPTS - record.attempts;
      return error(400, 'invalid_code', `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`, { code: ['Incorrect code.'] });
    }

    record.reset_token = randomToken();
    return HttpResponse.json({ reset_token: record.reset_token });
  }),

  // FORGOT PASSWORD — set new password
  http.post(`${BASE}/forgot-password/reset/`, async ({ request }) => {
    await delay(500);
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const email = String(body.email || '').trim().toLowerCase();
    const resetToken = String(body.reset_token || '');
    const password = String(body.password || '');
    const record = resets[email];

    if (!record || !record.reset_token || record.reset_token !== resetToken || new Date(record.expires_at).getTime() < Date.now()) {
      return error(400, 'invalid_token', 'Your reset session has expired. Please start again.');
    }
    const pwIssue = passwordIssue(password);
    if (pwIssue) return error(400, 'validation_error', pwIssue, { password: [pwIssue] });

    const account = accounts.find((a) => a.id === record.account_id);
    if (!account) return error(400, 'invalid_token', 'Your reset session has expired. Please start again.');

    if ((await hashPassword(password, account.salt)) === account.password_hash) {
      return error(400, 'validation_error', 'New password must be different from your current password.', {
        password: ['New password must be different from your current password.'],
      });
    }

    account.salt = randomToken(16);
    account.password_hash = await hashPassword(password, account.salt);
    account.failed_attempts = 0;
    account.locked_until = null;
    delete resets[email];
    revokeSessionsFor(account.id);

    return HttpResponse.json({ message: 'Password updated. Please sign in with your new password.' });
  }),
];
