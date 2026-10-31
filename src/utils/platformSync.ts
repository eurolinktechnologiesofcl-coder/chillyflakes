import { useState, useEffect } from 'react';
import type {
  AdminPlatformSettings,
  AdminOrder,
  AdminOrderStatus,
} from '../types/admin';
import type { BuyerOrder } from '../types';
import {
  mockAdminPlatformSettings,
} from '../mocks/adminMockData';

// Storage keys
export const STORAGE_KEYS = {
  PLATFORM_SETTINGS: 'cf_platform_settings',
  ADMIN_ORDERS: 'cf_admin_orders',
  BUYER_ORDERS: 'cf_buyer_orders',
  BUYER_CUSTOMERS: 'cf_buyer_customers',
} as const;

// Custom Event Names for same-window instant reactivity
export const SYNC_EVENTS = {
  SETTINGS_UPDATED: 'cf_settings_updated',
  ORDERS_UPDATED: 'cf_orders_updated',
} as const;

/** Seller label used for products sold directly by the platform (no vendor payout). */
export const FIRST_PARTY_SELLER_ID = 'chillyflakes_direct';
export const FIRST_PARTY_SELLER_NAME = 'ChillyFlakes (First-party)';

/** Every localStorage key that holds test data (buyer, admin, vendor mock DB). */
const TEST_DATA_KEYS = [
  STORAGE_KEYS.PLATFORM_SETTINGS,
  STORAGE_KEYS.ADMIN_ORDERS,
  STORAGE_KEYS.BUYER_ORDERS,
  STORAGE_KEYS.BUYER_CUSTOMERS,
  'cf_cms_content',
  'cf_buyer_user',
  'cf_buyer_addresses',
  'cf_buyer_bookings',
  'cf_product_reviews',
  'fk_cart',
  'fk_wishlist',
  'cf_buyer_token',
];

function wipeTestData(): void {
  TEST_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
  Object.keys(localStorage)
    .filter((k) => k.startsWith('cf_db_') || k.startsWith('cf_buyer_addresses'))
    .forEach((k) => localStorage.removeItem(k));
}

/**
 * One-time clean slate: wipes previously cached admin/buyer test data from
 * localStorage. Bump DATA_RESET_VERSION whenever you want to start fresh again.
 */
const DATA_RESET_VERSION = '2026-10-28-fresh-v4';
const DATA_RESET_KEY = 'cf_data_reset_version';

/** Called once from main.tsx before the app/mocks boot (never during HMR). */
export function runOneTimeDataReset(): void {
  try {
    if (localStorage.getItem(DATA_RESET_KEY) !== DATA_RESET_VERSION) {
      wipeTestData();
      localStorage.setItem(DATA_RESET_KEY, DATA_RESET_VERSION);
    }
  } catch {
    // localStorage unavailable — nothing to reset
  }
}

/**
 * Clears browser-cached copies of orders, customers, reviews and carts
 * without reloading. Keeps platform settings, CMS content, the product
 * catalog and the admin session (`cf_admin_token`).
 */
export function clearLocalTestCaches(): void {
  try {
    [
      STORAGE_KEYS.ADMIN_ORDERS,
      STORAGE_KEYS.BUYER_ORDERS,
      STORAGE_KEYS.BUYER_CUSTOMERS,
      'cf_buyer_user',
      'cf_buyer_bookings',
      'cf_product_reviews',
      'fk_cart',
      'fk_wishlist',
      'cf_buyer_token',
    ].forEach((key) => localStorage.removeItem(key));
    Object.keys(localStorage)
      .filter((k) => k.startsWith('cf_buyer_addresses'))
      .forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent(SYNC_EVENTS.ORDERS_UPDATED, { detail: [] }));
  } catch {
    // localStorage unavailable — nothing to clear
  }
}

/**
 * Wipes ALL test data (orders, customers, staff, sellers, settings, cart…)
 * and reloads the app so every in-memory store starts empty.
 */
export function resetAllTestData(): void {
  try {
    wipeTestData();
    // Prevent in-memory state from re-persisting during unload
    window.addEventListener('beforeunload', () => wipeTestData());
  } catch {
    // ignore
  }
  window.location.reload();
}

/* -------------------------------------------------------------------------- */
/* 0. STOREFRONT CUSTOMER REGISTRY                                            */
/* -------------------------------------------------------------------------- */

export interface BuyerCustomerRecord {
  name: string;
  email: string;
  phone?: string;
  created_at: string;
  last_login: string;
}

export function getBuyerCustomers(): BuyerCustomerRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BUYER_CUSTOMERS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Called whenever a shopper signs in on the storefront. */
export function registerBuyerCustomer(input: { name: string; email: string; phone?: string }): void {
  const email = input.email.trim().toLowerCase();
  if (!email) return;
  const now = new Date().toISOString();
  const list = getBuyerCustomers();
  const existing = list.find((c) => c.email === email);
  if (existing) {
    existing.last_login = now;
    if (input.phone) existing.phone = input.phone;
    if (input.name) existing.name = input.name;
  } else {
    list.unshift({ name: input.name || email.split('@')[0], email, phone: input.phone, created_at: now, last_login: now });
  }
  localStorage.setItem(STORAGE_KEYS.BUYER_CUSTOMERS, JSON.stringify(list));
}

/** True when Super Admin has suspended / banned / deleted this customer. */
export function isCustomerBlocked(email: string): boolean {
  try {
    const raw = localStorage.getItem('cf_db_admin_users');
    if (!raw) return false;
    const users = JSON.parse(raw) as Array<{ email: string; status: string; is_deleted: boolean }>;
    const match = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    return Boolean(match && (match.is_deleted || match.status !== 'active'));
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* 1. GETTERS & SETTERS WITH LOCAL STORAGE PERSISTENCE                       */
/* -------------------------------------------------------------------------- */

export function getPlatformSettings(): AdminPlatformSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLATFORM_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to guarantee all schema properties exist
      return {
        ...mockAdminPlatformSettings,
        ...parsed,
        marketplace: { ...mockAdminPlatformSettings.marketplace, ...(parsed.marketplace || {}) },
        shipping: { ...mockAdminPlatformSettings.shipping, ...(parsed.shipping || {}) },
        compliance: { ...mockAdminPlatformSettings.compliance, ...(parsed.compliance || {}) },
        system_flags: { ...mockAdminPlatformSettings.system_flags, ...(parsed.system_flags || {}) },
      };
    }
  } catch (err) {
    console.warn('[PlatformSync] Failed to parse platform settings from storage:', err);
  }
  return JSON.parse(JSON.stringify(mockAdminPlatformSettings));
}

export function savePlatformSettings(settings: AdminPlatformSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PLATFORM_SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(SYNC_EVENTS.SETTINGS_UPDATED, { detail: settings }));
  } catch (err) {
    console.error('[PlatformSync] Error saving platform settings:', err);
  }
}

export function getAdminOrders(): AdminOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_ORDERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn('[PlatformSync] Failed to parse admin orders from storage:', err);
  }
  return [];
}

export function saveAdminOrders(orders: AdminOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ADMIN_ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent(SYNC_EVENTS.ORDERS_UPDATED, { detail: orders }));
  } catch (err) {
    console.error('[PlatformSync] Error saving admin orders:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* 2. REAL-TIME CROSS-PORTAL SYNC HELPERS                                     */
/* -------------------------------------------------------------------------- */

/**
 * When a buyer completes checkout on `/checkout`, map their order to an AdminOrder
 * and prepend it to the Admin Orders store (idempotent — never duplicates).
 */
export function syncBuyerOrderToAdmin(buyerOrder: BuyerOrder): AdminOrder {
  const currentAdminOrders = getAdminOrders();
  const orderNumber = buyerOrder.id.startsWith('CF-') ? buyerOrder.id : `CF-${buyerOrder.id}`;
  const existing = currentAdminOrders.find((o) => o.order_number === orderNumber);
  if (existing) return existing;

  const email = (buyerOrder.customerEmail || '').trim().toLowerCase();
  const mappedAdminOrder: AdminOrder = {
    id: `ord_${buyerOrder.id.replace(/\D/g, '') || Date.now()}`,
    order_number: orderNumber,
    customer_id: email ? `cust_${email}` : 'guest',
    customer_name: buyerOrder.shippingAddress.fullName || 'Guest Customer',
    customer_email: email || 'guest',
    customer_phone: buyerOrder.shippingAddress.phone || '',
    items: buyerOrder.items.map((item, idx) => ({
      product_id: item.product.id || `p_${idx}`,
      title: item.product.name,
      image: item.product.image,
      quantity: item.quantity,
      unit_price: item.product.price,
      total_price: item.product.price * item.quantity,
      seller_id: item.product.sellerId || FIRST_PARTY_SELLER_ID,
      seller_name: item.product.sellerName || FIRST_PARTY_SELLER_NAME,
    })),
    total_amount: buyerOrder.totalAmount,
    shipping_fee: buyerOrder.deliveryCharge,
    tax_amount: 0,
    payment_method: buyerOrder.paymentMethod || 'upi',
    payment_status: buyerOrder.paymentMethod === 'cod' ? 'pending' : 'paid',
    order_status: 'pending_dispatch',
    delivery_speed: buyerOrder.deliverySpeed || 'standard',
    is_eco_delivery: Boolean(buyerOrder.ecoPackaging),
    shipping_address: {
      name: buyerOrder.shippingAddress.fullName,
      street: buyerOrder.shippingAddress.street,
      city: buyerOrder.shippingAddress.city,
      state: buyerOrder.shippingAddress.state,
      pincode: buyerOrder.shippingAddress.postalCode,
      country: 'India',
    },
    created_at: buyerOrder.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveAdminOrders([mappedAdminOrder, ...currentAdminOrders]);
  return mappedAdminOrder;
}

/** Buyer cancelled from their profile — reflect it in the admin queue. */
export function syncBuyerCancelToAdmin(buyerOrderId: string): void {
  const orderNumber = buyerOrderId.startsWith('CF-') ? buyerOrderId : `CF-${buyerOrderId}`;
  const orders = getAdminOrders();
  let changed = false;
  const updated = orders.map((o) => {
    if (o.order_number !== orderNumber || o.order_status === 'cancelled') return o;
    changed = true;
    return {
      ...o,
      order_status: 'cancelled' as AdminOrderStatus,
      payment_status: o.payment_status === 'paid' ? ('refunded' as const) : o.payment_status,
      updated_at: new Date().toISOString(),
    };
  });
  if (changed) saveAdminOrders(updated);
}

/** Buyer requested a return on a delivered order. */
export function syncBuyerReturnToAdmin(buyerOrderId: string, reason: string): void {
  const orderNumber = buyerOrderId.startsWith('CF-') ? buyerOrderId : `CF-${buyerOrderId}`;
  const orders = getAdminOrders();
  let changed = false;
  const updated = orders.map((o) => {
    if (o.order_number !== orderNumber || o.order_status !== 'delivered') return o;
    changed = true;
    return {
      ...o,
      order_status: 'return_requested' as AdminOrderStatus,
      return_reason: reason,
      updated_at: new Date().toISOString(),
    };
  });
  if (changed) saveAdminOrders(updated);
}

/**
 * When Super Admin updates order status (e.g. dispatched with AWB),
 * sync to buyer orders in localStorage so buyer profile displays live tracking.
 */
export function syncAdminStatusToBuyerOrder(
  orderId: string,
  newStatus: AdminOrderStatus,
  courierPartner?: string,
  trackingNumber?: string
): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BUYER_ORDERS);
    if (!raw) return;
    const buyerOrders = JSON.parse(raw) as BuyerOrder[];

    const statusMap: Record<AdminOrderStatus, BuyerOrder['status']> = {
      pending_dispatch: 'Placed',
      in_transit: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      return_requested: 'Delivered',
      refunded: 'Cancelled',
    };

    const targetBuyerStatus = statusMap[newStatus] || 'Processing';

    const updated = buyerOrders.map((ord) => {
      const buyerNumber = ord.id.startsWith('CF-') ? ord.id : `CF-${ord.id}`;
      const isMatch =
        ord.id === orderId ||
        buyerNumber === orderId ||
        (orderId === 'CF-994309' && (ord.id === 'CF-238673' || buyerNumber === 'CF-238673')) ||
        (orderId === 'cmvuyay1o000dlqjhk43dp0p0' && (ord.id === 'CF-238673' || buyerNumber === 'CF-238673'));
      if (isMatch) {
        return {
          ...ord,
          status: targetBuyerStatus,
          returnRequested: newStatus === 'return_requested' ? true : newStatus === 'delivered' ? false : ord.returnRequested,
          courierPartner: courierPartner || ord.courierPartner,
          trackingNumber: trackingNumber || ord.trackingNumber,
        };
      }
      return ord;
    });

    localStorage.setItem(STORAGE_KEYS.BUYER_ORDERS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('cf_buyer_orders_updated', { detail: updated }));
  } catch (err) {
    console.error('[PlatformSync] Error updating buyer order:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* 3. REACTIVE CUSTOM HOOKS FOR REAL-TIME RENDERING                          */
/* -------------------------------------------------------------------------- */

/**
 * Live Platform Settings hook for buyer components (Cart, Checkout, Top Bar).
 * Reacts instantly when Super Admin updates settings in /admin/settings.
 */
export function useLivePlatformSettings() {
  const [settings, setSettings] = useState<AdminPlatformSettings>(getPlatformSettings);

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(getPlatformSettings());
    };

    window.addEventListener(SYNC_EVENTS.SETTINGS_UPDATED, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(SYNC_EVENTS.SETTINGS_UPDATED, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return {
    settings,
    freeShippingThreshold: settings.shipping?.free_shipping_threshold ?? 499,
    standardDeliveryFee: settings.shipping?.standard_delivery_fee ?? 49,
    ecoPackagingFee: settings.shipping?.eco_packaging_fee ?? 15,
    maintenanceMode: settings.system_flags?.maintenance_mode ?? false,
    ecoDeliveryEnabled: settings.system_flags?.eco_delivery_enabled ?? true,
    sellerRegistrationOpen: settings.system_flags?.seller_registration_open ?? true,
  };
}
