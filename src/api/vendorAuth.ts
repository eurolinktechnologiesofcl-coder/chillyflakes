import axiosClient from './client';
import type {
  VendorRegisterPayload,
  VendorRegisterResponse,
  VendorLoginPayload,
  VendorLoginResponse,
  VendorUser,
  CheckAvailabilityPayload,
  CheckAvailabilityResponse,
  VerificationStatusResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
  ResendOtpPayload,
  ResendOtpResponse,
  PasswordResetRequestPayload,
  PasswordResetRequestResponse,
  PasswordResetVerifyPayload,
  PasswordResetVerifyResponse,
  PasswordResetResendResponse,
  PasswordResetConfirmPayload,
  PasswordResetConfirmResponse,
  PasswordResetStatusResponse,
} from '../types/auth';

/**
 * Calls POST /api/v1/vendor/auth/check-availability/
 */
export async function checkAvailability(
  payload: CheckAvailabilityPayload
): Promise<CheckAvailabilityResponse> {
  const response = await axiosClient.post<CheckAvailabilityResponse>(
    '/api/v1/vendor/auth/check-availability/',
    payload
  );
  return response.data;
}

/**
 * Calls POST /api/v1/vendor/auth/register/
 */
export async function registerVendor(
  payload: VendorRegisterPayload
): Promise<VendorRegisterResponse> {
  const response = await axiosClient.post<VendorRegisterResponse>(
    '/api/v1/vendor/auth/register/',
    payload
  );
  return response.data;
}

/**
 * Calls GET /api/v1/vendor/auth/verification-status/
 */
export async function getVerificationStatus(): Promise<VerificationStatusResponse> {
  const response = await axiosClient.get<VerificationStatusResponse>(
    '/api/v1/vendor/auth/verification-status/'
  );
  return response.data;
}

/**
 * Calls POST /api/v1/vendor/auth/verify-otp/
 */
export async function verifyOtp(
  payload: VerifyOtpPayload
): Promise<VerifyOtpResponse> {
  const response = await axiosClient.post<VerifyOtpResponse>(
    '/api/v1/vendor/auth/verify-otp/',
    payload
  );
  return response.data;
}

/**
 * Calls POST /api/v1/vendor/auth/resend-otp/
 */
export async function resendOtp(
  payload: ResendOtpPayload
): Promise<ResendOtpResponse> {
  const response = await axiosClient.post<ResendOtpResponse>(
    '/api/v1/vendor/auth/resend-otp/',
    payload
  );
  return response.data;
}

/**
 * Calls POST /api/v1/vendor/auth/password-reset/request/
 */
export async function requestPasswordReset(
  payload: PasswordResetRequestPayload
): Promise<PasswordResetRequestResponse> {
  const response = await axiosClient.post<PasswordResetRequestResponse>(
    '/api/v1/vendor/auth/password-reset/request/',
    payload
  );
  return response.data;
}

/**
 * Calls POST /api/v1/vendor/auth/password-reset/verify/
 */
export async function verifyPasswordResetOtp(
  payload: PasswordResetVerifyPayload
): Promise<PasswordResetVerifyResponse> {
  const response = await axiosClient.post<PasswordResetVerifyResponse>(
    '/api/v1/vendor/auth/password-reset/verify/',
    payload
  );
  return response.data;
}

/**
 * Calls POST /api/v1/vendor/auth/password-reset/resend/
 */
export async function resendPasswordResetOtp(): Promise<PasswordResetResendResponse> {
  const response = await axiosClient.post<PasswordResetResendResponse>(
    '/api/v1/vendor/auth/password-reset/resend/'
  );
  return response.data;
}

/**
 * Calls POST /api/v1/vendor/auth/password-reset/confirm/
 */
export async function confirmPasswordReset(
  payload: PasswordResetConfirmPayload
): Promise<PasswordResetConfirmResponse> {
  const response = await axiosClient.post<PasswordResetConfirmResponse>(
    '/api/v1/vendor/auth/password-reset/confirm/',
    payload
  );
  return response.data;
}

/**
 * Calls GET /api/v1/vendor/auth/password-reset/status/
 */
export async function getPasswordResetStatus(): Promise<PasswordResetStatusResponse> {
  const response = await axiosClient.get<PasswordResetStatusResponse>(
    '/api/v1/vendor/auth/password-reset/status/'
  );
  return response.data;
}

/**
 * Calls POST /api/v1/vendor/auth/login/
 */
export async function loginVendor(payload: VendorLoginPayload): Promise<VendorLoginResponse> {
  const response = await axiosClient.post<VendorLoginResponse>(
    '/api/v1/vendor/auth/login/',
    payload
  );
  return response.data;
}

/**
 * Calls GET /api/v1/vendor/auth/me/
 */
export async function getVendorMe(): Promise<VendorUser> {
  // Real backend: only ever identify a seller with the seller token — never fall back to the
  // admin token (on /admin pages getAuthToken() prefers cf_admin_token, which made admins look
  // like vendors). Mock/demo modes keep the session in memory and send no token.
  const usingRealBackend =
    import.meta.env.VITE_USE_MOCKS === 'false' && import.meta.env.VITE_DEMO_MODE !== 'true';
  if (!usingRealBackend) {
    const response = await axiosClient.get<VendorUser>('/api/v1/vendor/auth/me/');
    return response.data;
  }

  const vendorToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!vendorToken) {
    throw { code: 'not_authenticated', message: 'No seller session.' };
  }
  const response = await axiosClient.get<VendorUser>('/api/v1/vendor/auth/me/', {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  return response.data;
}

/**
 * Calls POST /api/v1/vendor/auth/logout/
 */
export async function logoutVendor(): Promise<{ message: string }> {
  const response = await axiosClient.post<{ message: string }>('/api/v1/vendor/auth/logout/');
  return response.data;
}

