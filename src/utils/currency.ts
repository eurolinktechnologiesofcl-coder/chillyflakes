/**
 * Converts an amount in paise to an Indian Rupee (INR) formatted string
 * with Indian number system grouping (e.g. ₹1,24,500).
 */
export function formatINR(paise: number, showDecimals: boolean = false): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(rupees);
}

/**
 * Formats a raw number using Indian digit grouping (e.g. 1,24,500).
 */
export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Formats an amount already in rupees (buyer storefront prices) as INR
 * with Indian digit grouping. Whole amounts drop decimals (₹1,299),
 * fractional amounts keep two (₹129.90).
 */
export function formatRupees(rupees: number): string {
  const hasFraction = !Number.isInteger(Math.round(rupees * 100) / 100);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: hasFraction ? 2 : 0,
    minimumFractionDigits: hasFraction ? 2 : 0,
  }).format(rupees);
}

/** Orders at or above this amount (in rupees) ship free. */
export const FREE_SHIPPING_THRESHOLD = 499;

/** Flat delivery charge (in rupees) for orders below the free-shipping threshold. */
export const DELIVERY_CHARGE = 49;
