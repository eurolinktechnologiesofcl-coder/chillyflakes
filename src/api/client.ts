import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { NormalizedApiError } from '../types/auth';

/**
 * Base URL resolution:
 * If VITE_USE_MOCKS !== 'false' (default), use relative URL '' so MSW intercepts on the current host.
 * If connecting to the backend, use VITE_API_BASE_URL or fallback to http://localhost:4000/api.
 */
const mocksEnabled = import.meta.env.VITE_USE_MOCKS !== 'false';
export const RAW_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : mocksEnabled
    ? ''
    : 'http://localhost:4000/api'
).trim().replace(/\/$/, '');

/**
 * In-memory CSRF token storage.
 * As the backend uses HttpOnly cookies for CSRF, document.cookie cannot read the token in JavaScript.
 * The backend exposes the CSRF token in the X-CSRFToken response header of GET /api/v1/csrf/.
 * It is kept strictly in-memory (never localStorage or sessionStorage).
 */
let inMemoryCsrfToken: string | null = null;
let csrfFetchPromise: Promise<string | null> | null = null;

function extractCsrfFromHeaders(headers: unknown): string | null {
  if (!headers || typeof headers !== 'object') return null;
  const h = headers as Record<string, unknown>;
  if (typeof h['x-csrftoken'] === 'string') return h['x-csrftoken'];
  if (typeof h['X-CSRFToken'] === 'string') return h['X-CSRFToken'];
  if (typeof (h as { get?: (k: string) => unknown }).get === 'function') {
    const val = (h as { get: (k: string) => unknown }).get('x-csrftoken');
    if (typeof val === 'string') return val;
  }
  for (const [k, v] of Object.entries(h)) {
    if (k.toLowerCase() === 'x-csrftoken' && typeof v === 'string') {
      return v;
    }
  }
  return null;
}

/**
 * Extracts the CSRF token (checks memory first, fallback to document.cookie).
 */
export function getCsrfToken(): string | null {
  if (inMemoryCsrfToken) return inMemoryCsrfToken;
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Updates the in-memory CSRF token.
 */
export function setCsrfToken(token: string | null): void {
  inMemoryCsrfToken = token;
}

/**
 * Fetches the CSRF token from the backend /api/v1/csrf/ endpoint and caches it in memory.
 * Shared in-flight promise guarantees only one fetch runs at a time.
 */
export async function fetchCsrfToken(reason?: string): Promise<string | null> {
  if (csrfFetchPromise) return csrfFetchPromise;

  if (import.meta.env.DEV) {
    console.info(`[CSRF] Fetching fresh token (reason: ${reason || 'unspecified'})...`);
  }

  csrfFetchPromise = (async () => {
    try {
      const res = await axiosClient.get<{ detail?: string }>('/api/v1/csrf/', {
        headers: {
          'X-Skip-Csrf': 'true',
        },
      });
      const token = extractCsrfFromHeaders(res.headers);
      if (token) {
        inMemoryCsrfToken = token;
      }
      return inMemoryCsrfToken;
    } catch (err) {
      console.warn('[CSRF] Failed to fetch CSRF token:', err);
      return null;
    } finally {
      csrfFetchPromise = null;
    }
  })();

  return csrfFetchPromise;
}

/**
 * Retrieves authentication token (JWT access token) if any.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (window.location.pathname.startsWith('/admin')) {
    return localStorage.getItem('cf_admin_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
  }
  return localStorage.getItem('auth_token') || localStorage.getItem('cf_admin_token') || localStorage.getItem('token');
}

/**
 * Saves authentication token in localStorage (used only by legacy buyer flows).
 */
export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
  }
}

let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorizedCallback(cb: (() => void) | null): void {
  onUnauthorizedCallback = cb;
}

/**
 * Configured Axios Client:
 * - baseURL from VITE_API_BASE_URL
 * - withCredentials: true
 * - request interceptor to prevent URL doubling (e.g. /api/api/v1/...) and attach CSRF
 * - response interceptor that normalizes every error to { code, message, fieldErrors? }
 */
export const axiosClient: AxiosInstance = axios.create({
  baseURL: RAW_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: prevent duplicate `/api/` prefixes and attach headers
axiosClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (config.url) {
    const baseEndsWithApi = (config.baseURL || '').replace(/\/$/, '').endsWith('/api');
    // If baseURL already ends with /api, strip redundant /api or api/ from url
    if (baseEndsWithApi && /^\/?api\//.test(config.url)) {
      config.url = config.url.replace(/^\/?api\//, '');
    }
  }

  const method = (config.method || 'get').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const skipCsrf = Boolean(config.headers?.['X-Skip-Csrf']);

  if (isMutating && !skipCsrf && !inMemoryCsrfToken) {
    await fetchCsrfToken();
  }

  // CSRF token
  const csrf = getCsrfToken();
  if (csrf && config.headers && !skipCsrf) {
    config.headers['X-CSRFToken'] = csrf;
  }

  if (config.headers?.['X-Skip-Csrf']) {
    delete config.headers['X-Skip-Csrf'];
  }

  // Attach token if present
  const token = getAuthToken();
  if (token && config.headers && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

// Response Interceptor: normalize error to { code: string, message: string, fieldErrors?: Record<string, string[]> }
axiosClient.interceptors.response.use(
  (response) => {
    // Reject HTML responses from static rewrites
    if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      return Promise.reject({
        code: 'html_response',
        message: 'Endpoint returned HTML instead of JSON.',
      });
    }

    const token = extractCsrfFromHeaders(response.headers);
    if (token) {
      inMemoryCsrfToken = token;
    }
    return response;
  },
  async (error: AxiosError<Record<string, unknown>>) => {
    if (error.response?.headers) {
      const token = extractCsrfFromHeaders(error.response.headers);
      if (token) {
        inMemoryCsrfToken = token;
      }
    }

    const originalRequest = error.config as (InternalAxiosRequestConfig & { _isCsrfRetry?: boolean }) | undefined;
    const isCsrfError =
      error.response?.status === 403 &&
      (typeof error.response.data === 'object' &&
        (String((error.response.data as Record<string, unknown>)?.message || '').toLowerCase().includes('csrf') ||
         (error.response.data as Record<string, unknown>)?.code === 'permission_denied'));

    // Requirement 4: On a 403 CSRF failure, fetch a fresh token and retry ONCE
    if (isCsrfError && originalRequest && !originalRequest._isCsrfRetry) {
      originalRequest._isCsrfRetry = true;
      inMemoryCsrfToken = null;
      const freshToken = await fetchCsrfToken('retry');
      if (freshToken && originalRequest.headers) {
        originalRequest.headers['X-CSRFToken'] = freshToken;
      }
      return axiosClient(originalRequest);
    }

    let normalized: NormalizedApiError = {
      code: 'network_error',
      message: 'Network error or server unreachable. Please check your connection.',
    };

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      let fieldErrors: Record<string, string[]> | undefined = undefined;

      if (data && typeof data === 'object') {
        if ('fieldErrors' in data && typeof data.fieldErrors === 'object' && data.fieldErrors !== null) {
          fieldErrors = data.fieldErrors as Record<string, string[]>;
        } else {
          // Fallback: flat field-error dictionary e.g. { email: ["already exists"] }
          const extracted: Record<string, string[]> = {};
          let foundField = false;
          for (const [key, val] of Object.entries(data)) {
            if (key !== 'code' && key !== 'message' && key !== 'detail') {
              if (Array.isArray(val) && val.every((item) => typeof item === 'string')) {
                extracted[key] = val;
                foundField = true;
              } else if (typeof val === 'string') {
                extracted[key] = [val];
                foundField = true;
              }
            }
          }
          if (foundField) {
            fieldErrors = extracted;
          }
        }
      }

      let retryAfterSeconds: number | undefined = undefined;
      if (typeof data?.retry_after_seconds === 'number') {
        retryAfterSeconds = data.retry_after_seconds;
      } else if (error.response.headers && error.response.headers['retry-after']) {
        const parsed = parseInt(String(error.response.headers['retry-after']), 10);
        if (!isNaN(parsed)) retryAfterSeconds = parsed;
      }

      const defaultMsg = status === 400 ? 'Please fix the validation errors.' : `Request failed with status ${status}`;
      let msg = typeof data?.message === 'string' 
        ? data.message 
        : typeof data?.detail === 'string' 
          ? data.detail 
          : defaultMsg;

      // Requirement 6: Never show raw "CSRF verification failed". Show friendly message and refresh token silently
      if (typeof msg === 'string' && msg.toLowerCase().includes('csrf')) {
        msg = 'Your session expired. Please try again.';
        void fetchCsrfToken('retry');
      }

      normalized = {
        code: (typeof data?.code === 'string' ? data.code : undefined) || `http_${status}`,
        message: msg,
        fieldErrors,
        retry_after_seconds: retryAfterSeconds,
        details: data && typeof data === 'object' ? (data as Record<string, unknown>) : undefined,
      };

      // On a 401 from any call OTHER than login and me, clear user session and redirect to /vendor/login without redirect loop
      if (status === 401) {
        const reqUrl = error.config?.url || '';
        const isAuthEndpoint =
          reqUrl.includes('/auth/login') || reqUrl.includes('/auth/me') || reqUrl.includes('/buyer/');
        if (!isAuthEndpoint) {
          if (onUnauthorizedCallback) {
            onUnauthorizedCallback();
          }
          if (typeof window !== 'undefined' && window.location.pathname !== '/vendor/login') {
            window.location.assign('/vendor/login');
          }
        }
      }
    } else if (error.request) {
      normalized = {
        code: 'no_response',
        message: 'No response received from server. Please check your network or try again.',
      };
    } else {
      normalized = {
        code: 'request_error',
        message: error.message || 'An unexpected error occurred.',
      };
    }

    return Promise.reject(normalized);
  }
);

/* -------------------------------------------------------------------------- */
/* Backward Compatibility Adapter for Existing Buyer Landing Page API Files  */
/* -------------------------------------------------------------------------- */

export interface ApiResponse<T> {
  data: T;
  status: number;
  isMock: boolean;
  error?: string | null;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export async function apiRequest<T>(
  endpoint: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string>; timeoutMs?: number } = {},
  fallbackData?: T
): Promise<ApiResponse<T>> {
  try {
    const response = await axiosClient.request<T>({
      url: endpoint,
      method: options.method || 'GET',
      data: options.body,
      headers: options.headers,
      timeout: options.timeoutMs ?? 4000,
    });

    const rawData = response.data;
    const isObject = rawData && typeof rawData === 'object';
    const hasResults = isObject && 'results' in (rawData as unknown as Record<string, unknown>);
    const results = hasResults ? (rawData as unknown as { results: unknown }).results : undefined;
    const data: T = Array.isArray(results) ? (results as T) : rawData;

    return {
      data,
      status: response.status,
      isMock: false,
    };
  } catch (error) {
    if (fallbackData !== undefined) {
      return {
        data: fallbackData,
        status: 200,
        isMock: true,
      };
    }

    const norm = error as NormalizedApiError;
    return {
      data: (null as unknown) as T,
      status: 500,
      isMock: false,
      error: norm?.message || 'Request failed',
    };
  }
}

export const apiClient = {
  get: <T>(endpoint: string, fallback?: T, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: 'GET', ...options }, fallback),

  post: <T>(endpoint: string, body?: unknown, fallback?: T, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: 'POST', body, ...options }, fallback),

  put: <T>(endpoint: string, body?: unknown, fallback?: T, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: 'PUT', body, ...options }, fallback),

  patch: <T>(endpoint: string, body?: unknown, fallback?: T, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body, ...options }, fallback),

  delete: <T>(endpoint: string, fallback?: T, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: 'DELETE', ...options }, fallback),
};

export default axiosClient;
