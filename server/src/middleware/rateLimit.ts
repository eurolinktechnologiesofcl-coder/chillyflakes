import rateLimit, { type Options } from 'express-rate-limit';

const handler: Options['handler'] = (_req, res, _next, options) => {
  res.status(429).json({
    code: 'rate_limited',
    message: 'Too many requests. Please wait a moment and try again.',
    retry_after_seconds: Math.ceil(options.windowMs / 1000),
  });
};

const base: Partial<Options> = { standardHeaders: 'draft-7', legacyHeaders: false, handler };

/** Credential endpoints (login) — per IP. */
export const loginLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 30 });

/** Account creation — per IP. */
export const registerLimiter = rateLimit({ ...base, windowMs: 60 * 60_000, limit: 15 });

/** Anything that sends an email or checks a one-time code — per IP. */
export const codeLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 25 });

/** Global safety net. */
export const apiLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 300 });
