/** Shared, framework-free helpers for the buyer auth screens. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^[6-9]\d{9}$/;

/** Only allow same-origin relative paths to avoid open-redirects. */
export function safeRedirect(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (/^\/(login|register|forgot-password)(\/|\?|$)/.test(raw)) return fallback;
  return raw;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  checks: { label: string; ok: boolean }[];
}

export function passwordStrength(pw: string): StrengthResult {
  const checks = [
    { label: 'At least 8 characters', ok: pw.length >= 8 },
    { label: 'A letter (a–z)', ok: /[A-Za-z]/.test(pw) },
    { label: 'A number (0–9)', ok: /\d/.test(pw) },
    { label: 'Upper & lower case or a symbol', ok: (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) || /[^A-Za-z0-9]/.test(pw) },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const score = (pw ? Math.min(4, passed) : 0) as StrengthResult['score'];
  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  return { score, label, checks };
}

export function isPasswordValid(pw: string): boolean {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

/** Item count of the guest bag (read directly — auth pages render outside StoreProvider). */
export function getBagCount(): number {
  try {
    const raw = localStorage.getItem('fk_cart');
    const items = raw ? (JSON.parse(raw) as { quantity: number }[]) : [];
    return items.reduce((n, i) => n + (Number(i.quantity) || 0), 0);
  } catch {
    return 0;
  }
}
