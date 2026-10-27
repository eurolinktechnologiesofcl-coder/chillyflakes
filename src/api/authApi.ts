import { apiClient, setAuthToken, type ApiResponse } from './client';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isLoggedIn: boolean;
}

export interface AuthResponse {
  token?: string;
  access?: string; // Standard SimpleJWT access token
  refresh?: string; // Standard SimpleJWT refresh token
  user: UserProfile;
}

/**
 * Authentication API Service
 * Compatible with token-based (JWT) authentication.
 * Maps to backend endpoints:
 * - POST /api/auth/login/ (or /api/token/)
 * - POST /api/auth/register/
 * - GET  /api/auth/user/
 * - POST /api/auth/logout/
 * - POST /api/auth/verify-otp/
 */
export const authApi = {
  /**
   * Login with email, phone, or OTP via the backend.
   */
  async login(identifier: string, otpOrPassword = '1234'): Promise<ApiResponse<AuthResponse>> {
    const fallbackUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: identifier.includes('@') ? identifier.split('@')[0] : 'Conscious Shopper',
      email: identifier.includes('@') ? identifier : undefined,
      phone: !identifier.includes('@') ? identifier : undefined,
      isLoggedIn: true,
    };

    const fallback: AuthResponse = {
      token: `mock_token_${Date.now()}`,
      access: `jwt_access_${Date.now()}`,
      user: fallbackUser,
    };

    const res = await apiClient.post<AuthResponse>(
      'auth/login/',
      { username: identifier, password: otpOrPassword },
      fallback
    );

    if (res.data?.token || res.data?.access) {
      setAuthToken(res.data.token || res.data.access || null);
    }

    return res;
  },

  /**
   * Request OTP via the backend SMS/Email gateway.
   */
  async sendOtp(phoneOrEmail: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const fallback = {
      success: true,
      message: `OTP sent to ${phoneOrEmail}. Default code is 1234.`,
    };

    return apiClient.post<{ success: boolean; message: string }>(
      'auth/send-otp/',
      { recipient: phoneOrEmail },
      fallback
    );
  },

  /**
   * Fetch current authenticated user from the backend.
   */
  async getCurrentUser(): Promise<ApiResponse<UserProfile | null>> {
    return apiClient.get<UserProfile | null>('auth/user/', null);
  },

  /**
   * Logout user and clear tokens.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('auth/logout/', {});
    } catch {
      // ignore
    } finally {
      setAuthToken(null);
    }
  },
};
