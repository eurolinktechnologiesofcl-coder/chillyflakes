import { Router, type Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError, badRequest } from '../../lib/errors.js';
import { sha256, randomToken } from '../../lib/crypto.js';
import { requireAuth, bearerToken } from '../../middleware/auth.js';
import { loginLimiter, registerLimiter, codeLimiter } from '../../middleware/rateLimit.js';
import {
  registerSchema,
  loginSchema,
  emailOnlySchema,
  verifyCodeSchema,
  resetSchema,
  profileSchema,
  normalizePhone,
} from './schemas.js';
import {
  hashPassword,
  checkPassword,
  burnTime,
  publicUser,
  isBlocked,
  createSession,
  issueCode,
  consumeCode,
  notifyPasswordChanged,
  CODE_TTL_MIN,
  RESEND_COOLDOWN_SEC,
  MAX_FAILED_LOGINS,
  LOCK_MINUTES,
} from './service.js';

const meta = (req: Request) => ({ ip: req.ip, userAgent: req.get('user-agent') });

/** Issue a code but treat the resend cooldown as "already sent". */
async function issueOrCooldown(user: Parameters<typeof issueCode>[0], purpose: Parameters<typeof issueCode>[1]) {
  try {
    return await issueCode(user, purpose);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'rate_limited') {
      return {
        expires_in_seconds: CODE_TTL_MIN * 60,
        resend_after_seconds: Number(err.extra?.retry_after_seconds) || RESEND_COOLDOWN_SEC,
      };
    }
    throw err;
  }
}

export const buyerAuthRouter = Router();

/* ------------------------------- REGISTER -------------------------------- */
buyerAuthRouter.post('/register/', registerLimiter, async (req, res) => {
  const body = registerSchema.parse(req.body);

  const [byEmail, byPhone] = await Promise.all([
    prisma.user.findUnique({ where: { email: body.email } }),
    prisma.user.findUnique({ where: { phone: body.phone } }),
  ]);

  if (byEmail && (byEmail.emailVerifiedAt || byEmail.role !== 'CUSTOMER')) {
    throw badRequest('Please correct the highlighted fields.', {
      email: ['An account with this email already exists. Please sign in.'],
    });
  }
  if (byPhone && byPhone.id !== byEmail?.id) {
    throw badRequest('Please correct the highlighted fields.', { phone: ['This mobile number is already registered.'] });
  }
  if (byEmail && isBlocked(byEmail)) {
    throw new ApiError(403, 'account_suspended', 'This email has been suspended. Please contact support.');
  }

  const passwordHash = await hashPassword(body.password);
  let user;
  try {
    user = byEmail
      ? // Unverified sign-up retried: refresh details
        await prisma.user.update({ where: { id: byEmail.id }, data: { name: body.name, phone: body.phone, passwordHash } })
      : await prisma.user.create({
          data: { role: 'CUSTOMER', name: body.name, email: body.email, phone: body.phone, passwordHash },
        });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw badRequest('Please correct the highlighted fields.', { email: ['This email or mobile number is already registered.'] });
    }
    throw err;
  }

  const issued = await issueOrCooldown(user, 'EMAIL_VERIFY');
  res.status(201).json({
    verification_required: true,
    email: user.email,
    message: `We've sent a 6-digit code to ${user.email}.`,
    ...issued,
  });
});

/* ----------------------------- VERIFY EMAIL ------------------------------ */
buyerAuthRouter.post('/verify-email/', codeLimiter, async (req, res) => {
  const { email, code } = verifyCodeSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== 'CUSTOMER') throw new ApiError(400, 'invalid_code', 'Invalid or expired code. Please request a new one.');
  if (isBlocked(user)) throw new ApiError(403, 'account_suspended', 'Your account has been suspended. Please contact support.');
  if (user.emailVerifiedAt) throw new ApiError(400, 'already_verified', 'This email is already verified. Please sign in.');

  const record = await consumeCode(user, 'EMAIL_VERIFY', code);
  const [verified] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date(), lastLoginAt: new Date() } }),
    prisma.verificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
  ]);
  const token = await createSession(user.id, meta(req));
  res.json({ user: publicUser(verified), token });
});

buyerAuthRouter.post('/verify-email/resend/', codeLimiter, async (req, res) => {
  const { email } = emailOnlySchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  const generic = { message: 'If this email is awaiting verification, a new code has been sent.', expires_in_seconds: CODE_TTL_MIN * 60, resend_after_seconds: RESEND_COOLDOWN_SEC };
  if (!user || user.role !== 'CUSTOMER' || user.emailVerifiedAt || isBlocked(user)) {
    res.json(generic);
    return;
  }
  const issued = await issueCode(user, 'EMAIL_VERIFY');
  res.json({ ...generic, ...issued });
});

/* --------------------------------- LOGIN --------------------------------- */
buyerAuthRouter.post('/login/', loginLimiter, async (req, res) => {
  const { identifier, password } = loginSchema.parse(req.body);
  const id = identifier.toLowerCase();
  const user = id.includes('@')
    ? await prisma.user.findUnique({ where: { email: id } })
    : await prisma.user.findUnique({ where: { phone: normalizePhone(id) } });

  const invalid = (msg = 'Incorrect password. Please verify your credentials or reset your password.') =>
    new ApiError(401, 'invalid_credentials', msg);

  if (!user || user.deletedAt) {
    await burnTime(password);
    throw new ApiError(
      401,
      'not_registered',
      'This email or mobile number is not registered with us. Please sign up or create an account first.'
    );
  }

  if (user.role !== 'CUSTOMER') {
    await burnTime(password);
    throw new ApiError(
      403,
      'wrong_portal',
      `This account is registered as a ${user.role === 'VENDOR' ? 'seller' : 'staff member'}. Please use the corresponding sign-in portal.`
    );
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw new ApiError(423, 'account_locked', `Too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''} or reset your password.`, undefined, {
      retry_after_seconds: mins * 60,
    });
  }

  if (!(await checkPassword(password, user.passwordHash))) {
    const failed = user.failedLoginCount + 1;
    if (failed >= MAX_FAILED_LOGINS) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) },
      });
      throw new ApiError(423, 'account_locked', `Too many failed attempts. Your account is locked for ${LOCK_MINUTES} minutes.`, undefined, {
        retry_after_seconds: LOCK_MINUTES * 60,
      });
    }
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: failed } });
    const left = MAX_FAILED_LOGINS - failed;
    throw invalid(`Incorrect password. Please verify your credentials or reset your password. (${left} attempt${left > 1 ? 's' : ''} left)`);
  }

  if (isBlocked(user)) throw new ApiError(403, 'account_suspended', 'Your account has been suspended. Please contact support.');

  if (!user.emailVerifiedAt) {
    const issued = await issueOrCooldown(user, 'EMAIL_VERIFY');
    throw new ApiError(403, 'email_not_verified', `Please verify your email. We've sent a code to ${user.email}.`, undefined, {
      email: user.email,
      ...issued,
    });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  const token = await createSession(user.id, meta(req));
  res.json({ user: publicUser(updated), token });
});

/* ------------------------------ SESSION/ME ------------------------------- */
buyerAuthRouter.get('/me/', requireAuth('CUSTOMER'), async (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

buyerAuthRouter.post('/logout/', async (req, res) => {
  const token = bearerToken(req);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  res.status(204).end();
});

buyerAuthRouter.patch('/profile/', requireAuth('CUSTOMER'), async (req, res) => {
  const patch = profileSchema.parse(req.body);
  if (patch.phone) {
    const taken = await prisma.user.findFirst({ where: { phone: patch.phone, NOT: { id: req.user!.id } } });
    if (taken) throw badRequest('Please correct the highlighted fields.', { phone: ['This mobile number is already registered.'] });
  }
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: patch });
  res.json({ user: publicUser(user) });
});

/* ---------------------------- FORGOT PASSWORD ---------------------------- */
buyerAuthRouter.post('/forgot-password/request/', codeLimiter, async (req, res) => {
  const { email } = emailOnlySchema.parse(req.body);
  const generic = {
    message: 'If an account exists for this email, a 6-digit verification code has been sent.',
    expires_in_seconds: CODE_TTL_MIN * 60,
    resend_after_seconds: RESEND_COOLDOWN_SEC,
  };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== 'CUSTOMER' || isBlocked(user)) {
    res.json(generic); // never reveal whether an account exists
    return;
  }
  const issued = await issueCode(user, 'PASSWORD_RESET');
  res.json({ ...generic, ...issued });
});

buyerAuthRouter.post('/forgot-password/verify/', codeLimiter, async (req, res) => {
  const { email, code } = verifyCodeSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== 'CUSTOMER') throw new ApiError(400, 'invalid_code', 'Invalid or expired code. Please request a new one.');

  const record = await consumeCode(user, 'PASSWORD_RESET', code);
  const resetToken = randomToken(32);
  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date(), resetTokenHash: sha256(resetToken), expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000) },
  });
  res.json({ reset_token: resetToken });
});

buyerAuthRouter.post('/forgot-password/reset/', codeLimiter, async (req, res) => {
  const { email, reset_token, password } = resetSchema.parse(req.body);
  const record = await prisma.verificationCode.findUnique({
    where: { resetTokenHash: sha256(reset_token) },
    include: { user: true },
  });
  if (!record || record.purpose !== 'PASSWORD_RESET' || record.expiresAt < new Date() || record.user.email !== email) {
    throw new ApiError(400, 'invalid_token', 'Your reset session has expired. Please start again.');
  }
  const { user } = record;
  if (await checkPassword(password, user.passwordHash)) {
    throw badRequest('New password must be different from your current password.', {
      password: ['New password must be different from your current password.'],
    });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        failedLoginCount: 0,
        lockedUntil: null,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(), // reset proves inbox ownership
      },
    }),
    prisma.verificationCode.update({ where: { id: record.id }, data: { resetTokenHash: null } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  void notifyPasswordChanged(user);

  res.json({ message: 'Password updated. Please sign in with your new password.' });
});
