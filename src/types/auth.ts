export const ALLOWED_CATEGORY_IDS = [
  'natural-products',
  'handmade-products',
  'jewelry',
  'clothes-fashion',
  'home-living',
  'retail-products',
  'services',
  'books',
] as const;

export type CategoryId = (typeof ALLOWED_CATEGORY_IDS)[number];

export type VendorStatus =
  | 'pending_verification'
  | 'onboarding_incomplete'
  | 'under_review'
  | 'resubmission_requested'
  | 'rejected'
  | 'suspended'
  | 'approved';

export interface VendorUser {
  id: string;
  full_name: string;
  email: string;
  mobile_masked: string;
  vendor_status: VendorStatus;
  status?: VendorStatus;
  store_name?: string;
  email_verified?: boolean;
}

export interface VendorRegisterPayload {
  full_name: string;
  email: string;
  mobile: string;
  business_name?: string;
  categories: string[]; // Allowed values: ALLOWED_CATEGORY_IDS
  wholesale_enabled: boolean;
  state: string;
  city: string;
  password: string;
  confirm_password?: string;
  agree_terms: boolean;
}

export interface VendorRegisterResponse {
  message: string;
  masked_email: string;
  masked_mobile: string;
  token?: string;
  user?: VendorUser;
}

export type OtpChannel = 'mobile' | 'email';

export interface CheckAvailabilityPayload {
  channel: OtpChannel;
  value: string;
}

export interface CheckAvailabilityResponse {
  available: boolean;
}

export interface VerificationChannelStatus {
  masked: string;
  email?: string;
  verified: boolean;
  resend_available_in: number;
  dev_code?: string;
}

export interface VerificationStatusResponse {
  mobile: VerificationChannelStatus;
  email: VerificationChannelStatus;
  all_verified: boolean;
  dev_code?: string;
}

export interface VerifyOtpPayload {
  channel: OtpChannel;
  otp: string;
}

export interface VerifyOtpResponse {
  channel: OtpChannel;
  verified: boolean;
  all_verified: boolean;
}

export interface ResendOtpPayload {
  channel: OtpChannel;
}

export interface ResendOtpResponse {
  resend_available_in: number;
  dev_code?: string;
}

export interface VendorLoginPayload {
  identifier: string; // Email or 10-digit Indian mobile
  password: string;
}

export interface VendorLoginResponse {
  message: string;
  vendor_status: VendorStatus;
  user: VendorUser;
  token?: string;
}

export interface NormalizedApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  retry_after_seconds?: number;
  /** Raw error body from the server (extra context such as `email`, `resend_after_seconds`). */
  details?: Record<string, unknown>;
}

export interface PasswordResetRequestPayload {
  identifier: string;
}

export interface PasswordResetRequestResponse {
  masked: string;
  resend_available_in: number;
}

export interface PasswordResetVerifyPayload {
  otp: string;
}

export interface PasswordResetVerifyResponse {
  verified: boolean;
}

export interface PasswordResetResendResponse {
  resend_available_in: number;
}

export interface PasswordResetConfirmPayload {
  new_password: string;
  confirm_password: string;
}

export interface PasswordResetConfirmResponse {
  message: string;
}

export type PasswordResetStep = 'none' | 'verify' | 'new_password';

export interface PasswordResetStatusResponse {
  step: PasswordResetStep;
}


