import type { NextFunction, Request, Response } from 'express';
import type { User, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { sha256 } from '../lib/crypto.js';
import { ApiError } from '../lib/errors.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    sessionId?: string;
  }
}

export function bearerToken(req: Request): string | null {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() || null : null;
}

/** Loads the session for the bearer token; rejects expired/suspended/deleted accounts. */
export function requireAuth(...roles: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = bearerToken(req);
    if (!token) throw new ApiError(401, 'not_authenticated', 'Please sign in to continue.');

    const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      throw new ApiError(401, 'session_expired', 'Your session has expired. Please sign in again.');
    }
    const { user } = session;
    if (user.deletedAt || user.status !== 'ACTIVE') {
      await prisma.session.deleteMany({ where: { userId: user.id } });
      throw new ApiError(403, 'account_suspended', 'Your account has been suspended. Please contact support.');
    }
    if (roles.length && !roles.includes(user.role) && user.role !== 'ADMIN') {
      throw new ApiError(403, 'forbidden', 'You do not have access to this resource.');
    }

    // Touch lastUsedAt at most once every 5 minutes
    if (Date.now() - session.lastUsedAt.getTime() > 5 * 60_000) {
      void prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    }

    req.user = user;
    req.sessionId = session.id;
    next();
  };
}

/** Extracts session and attaches req.user if a valid Bearer token is provided, without blocking unauthenticated requests. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) return next();

  void (async () => {
    try {
      const session = await prisma.session.findUnique({
        where: { tokenHash: sha256(token) },
        include: { user: true },
      });
      if (session && session.expiresAt > new Date() && !session.user.deletedAt && session.user.status === 'ACTIVE') {
        req.user = session.user;
        req.sessionId = session.id;
      }
    } catch {}
    next();
  })();
}
