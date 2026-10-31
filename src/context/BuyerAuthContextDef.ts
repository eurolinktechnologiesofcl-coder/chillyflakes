import { createContext, useContext } from 'react';
import type {
  BuyerAuthUser,
  BuyerRegisterPayload,
  ForgotRequestResponse,
  VerificationChallenge,
} from '../api/buyerAuthApi';

export type BuyerAuthStatus = 'loading' | 'authenticated' | 'guest';

export interface BuyerAuthContextValue {
  user: BuyerAuthUser | null;
  status: BuyerAuthStatus;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<BuyerAuthUser>;
  /** Creates the account and emails a verification code (no session yet). */
  register: (payload: BuyerRegisterPayload) => Promise<VerificationChallenge>;
  /** Confirms the emailed code and signs the shopper in. */
  verifyEmail: (email: string, code: string) => Promise<BuyerAuthUser>;
  resendVerification: (email: string) => Promise<VerificationChallenge>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<BuyerAuthUser, 'name' | 'phone'>>) => Promise<BuyerAuthUser>;
  requestPasswordReset: (email: string) => Promise<ForgotRequestResponse>;
  verifyPasswordReset: (email: string, code: string) => Promise<string>;
  resetPassword: (email: string, resetToken: string, password: string) => Promise<void>;
}

export const BuyerAuthContext = createContext<BuyerAuthContextValue | undefined>(undefined);

export function useBuyerAuth(): BuyerAuthContextValue {
  const ctx = useContext(BuyerAuthContext);
  if (!ctx) throw new Error('useBuyerAuth must be used within a BuyerAuthProvider');
  return ctx;
}
