import bcrypt from 'bcryptjs';
import type { CodePurpose, User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../lib/errors.js';
import { randomToken, sha256, sixDigitCode, safeEqual } from '../../lib/crypto.js';
import { sendMail } from '../../lib/mailer.js';
import { verifyEmailTemplate, resetPasswordTemplate, passwordChangedTemplate } from '../../emails/templates.js';

export const CODE_TTL_MIN = 10;
export const RESEND_COOLDOWN_SEC = 30;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

export const hashPassword = (pw: string) => bcrypt.hash(pw, BCRYPT_ROUNDS);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

/** Dummy hash so unknown-account logins take the same time as real ones. */
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-password', BCRYPT_ROUNDS);
export const burnTime = (pw: string) => bcrypt.compare(pw, DUMMY_HASH);

export function publicUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || '',
    role: u.role.toLowerCase(),
    email_verified: Boolean(u.emailVerifiedAt),
    created_at: u.createdAt.toISOString(),
  };
}

export function isBlocked(u: User) {
  return Boolean(u.deletedAt) || u.status !== 'ACTIVE';
}

/* -------------------------------- sessions -------------------------------- */

export async function createSession(userId: string, meta: { ip?: string; userAgent?: string }) {
  const token = `cfs_${randomToken(32)}`;
  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      ip: meta.ip?.slice(0, 64),
      userAgent: meta.userAgent?.slice(0, 255),
      expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000),
    },
  });
  return token;
}

/* ---------------------------- one-time codes ----------------------------- */

interface IssuedCode {
  expires_in_seconds: number;
  resend_after_seconds: number;
  dev_code?: string;
}

/**
 * Issues a fresh code for `purpose`, enforcing the resend cooldown, and emails it.
 * Previous unconsumed codes for the same purpose are invalidated.
 */
export async function issueCode(user: User, purpose: CodePurpose): Promise<IssuedCode> {
  const latest = await prisma.verificationCode.findFirst({
    where: { userId: user.id, purpose },
    orderBy: { createdAt: 'desc' },
  });
  if (latest) {
    const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SEC) {
      const wait = Math.ceil(RESEND_COOLDOWN_SEC - elapsed);
      throw new ApiError(429, 'rate_limited', `Please wait ${wait}s before requesting a new code.`, undefined, {
        retry_after_seconds: wait,
      });
    }
  }

  const code = sixDigitCode();
  await prisma.$transaction([
    prisma.verificationCode.updateMany({
      where: { userId: user.id, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.verificationCode.create({
      data: {
        userId: user.id,
        purpose,
        codeHash: sha256(`${user.id}:${code}`),
        expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000),
      },
    }),
  ]);

  const tpl = purpose === 'EMAIL_VERIFY' ? verifyEmailTemplate(user.name, code, CODE_TTL_MIN) : resetPasswordTemplate(user.name, code, CODE_TTL_MIN);
  try {
    await sendMail({ to: user.email, ...tpl });
  } catch (err) {
    console.error('[mail] delivery failed:', (err as Error).message);
    throw new ApiError(503, 'email_unavailable', 'We could not send the email right now. Please try again in a few minutes.');
  }

  return {
    expires_in_seconds: CODE_TTL_MIN * 60,
    resend_after_seconds: RESEND_COOLDOWN_SEC,
    ...(env.exposeDevCodes ? { dev_code: code } : {}),
  };
}

/** Validates a code; on success marks it consumed and returns the record. */
export async function consumeCode(user: User, purpose: CodePurpose, code: string) {
  const record = await prisma.verificationCode.findFirst({
    where: { userId: user.id, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw new ApiError(400, 'invalid_code', 'Invalid or expired code. Please request a new one.');
  if (record.expiresAt < new Date()) {
    await prisma.verificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    throw new ApiError(400, 'code_expired', 'This code has expired. Please request a new one.');
  }
  if (record.attempts >= MAX_CODE_ATTEMPTS) {
    await prisma.verificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    throw new ApiError(429, 'too_many_attempts', 'Too many incorrect attempts. Please request a new code.');
  }
  if (!safeEqual(record.codeHash, sha256(`${user.id}:${code}`))) {
    const updated = await prisma.verificationCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    const left = MAX_CODE_ATTEMPTS - updated.attempts;
    throw new ApiError(400, 'invalid_code', `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`, { code: ['Incorrect code.'] });
  }
  return record;
}

export async function notifyPasswordChanged(user: User) {
  try {
    await sendMail({ to: user.email, ...passwordChangedTemplate(user.name) });
  } catch (err) {
    console.error('[mail] password-changed notice failed:', (err as Error).message);
  }
}
