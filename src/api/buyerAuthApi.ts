import { axiosClient } from './client';
import type { NormalizedApiError } from '../types/auth';

/** Buyer session token key — deliberately separate from the vendor `auth_token`. */
export const BUYER_TOKEN_KEY = 'cf_buyer_token';

export interface BuyerAuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  email_verified?: boolean;
}

/** Returned when an email still has to be confirmed with a 6-digit code. */
export interface VerificationChallenge {
  verification_required?: boolean;
  email: string;
  message?: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
  /** Only present in local development (never in production). */
  dev_code?: string;
}

export interface BuyerAuthResponse {
  user: BuyerAuthUser;
  token: string;
}

export interface BuyerRegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface ForgotRequestResponse {
  message: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
  /** Only returned by the mock backend (no mail server) so the flow is testable. */
  dev_code?: string;
}

export function getBuyerToken(): string | null {
  try {
    return localStorage.getItem(BUYER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setBuyerToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(BUYER_TOKEN_KEY, token);
    else localStorage.removeItem(BUYER_TOKEN_KEY);
  } catch {
    // storage unavailable
  }
}

function authHeaders(): Record<string, string> {
  const token = getBuyerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Normalised error helper for UI code. */
export function toApiError(err: unknown): NormalizedApiError {
  if (err && typeof err === 'object' && 'message' in err) return err as NormalizedApiError;
  return { code: 'unknown', message: 'Something went wrong. Please try again.' };
}

const BASE = '/api/v1/buyer/auth';

export const buyerAuthApi = {
  async register(payload: BuyerRegisterPayload): Promise<VerificationChallenge> {
    const { data } = await axiosClient.post<VerificationChallenge>(`${BASE}/register/`, payload, { headers: authHeaders() });
    return data;
  },

  async verifyEmail(email: string, code: string): Promise<BuyerAuthResponse> {
    const { data } = await axiosClient.post<BuyerAuthResponse>(`${BASE}/verify-email/`, { email, code }, { headers: authHeaders() });
    return data;
  },

  async resendVerification(email: string): Promise<VerificationChallenge> {
    const { data } = await axiosClient.post<Omit<VerificationChallenge, 'email'>>(`${BASE}/verify-email/resend/`, { email }, { headers: authHeaders() });
    return { ...data, email };
  },

  async login(identifier: string, password: string): Promise<BuyerAuthResponse> {
    const { data } = await axiosClient.post<BuyerAuthResponse>(`${BASE}/login/`, { identifier, password }, { headers: authHeaders() });
    return data;
  },

  async me(): Promise<BuyerAuthUser> {
    const { data } = await axiosClient.get<{ user: BuyerAuthUser }>(`${BASE}/me/`, { headers: authHeaders() });
    return data.user;
  },

  async logout(): Promise<void> {
    await axiosClient.post(`${BASE}/logout/`, {}, { headers: authHeaders() });
  },

  async updateProfile(patch: Partial<Pick<BuyerAuthUser, 'name' | 'phone'>>): Promise<BuyerAuthUser> {
    const { data } = await axiosClient.patch<{ user: BuyerAuthUser }>(`${BASE}/profile/`, patch, { headers: authHeaders() });
    return data.user;
  },

  async requestPasswordReset(email: string): Promise<ForgotRequestResponse> {
    const { data } = await axiosClient.post<ForgotRequestResponse>(`${BASE}/forgot-password/request/`, { email }, { headers: authHeaders() });
    return data;
  },

  async verifyPasswordReset(email: string, code: string): Promise<string> {
    const { data } = await axiosClient.post<{ reset_token: string }>(`${BASE}/forgot-password/verify/`, { email, code }, { headers: authHeaders() });
    return data.reset_token;
  },

  async resetPassword(email: string, resetToken: string, password: string): Promise<void> {
    await axiosClient.post(`${BASE}/forgot-password/reset/`, { email, reset_token: resetToken, password }, { headers: authHeaders() });
  },
};
