import { io, Socket } from 'socket.io-client';
import type { QueryClient } from '@tanstack/react-query';
import { getAuthToken } from '../api/client';

let socket: Socket | null = null;
let tokenWatcher: number | null = null;

export function getSocketUrl(): string {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  try {
    const parsed = new URL(apiUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return 'http://localhost:4000';
  }
}

export function initializeRealtime(queryClient: QueryClient) {
  if (typeof window === 'undefined') return null;

  const serverUrl = getSocketUrl();

  if (socket) {
    socket.disconnect();
  }

  let lastToken = getAuthToken();

  socket = io(serverUrl, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    // Evaluated on every (re)connect so a login after page load is picked up
    auth: (cb) => {
      lastToken = getAuthToken();
      cb({ token: lastToken });
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  // Re-authenticate the socket when the user logs in / out (token changes in storage)
  if (tokenWatcher) window.clearInterval(tokenWatcher);
  tokenWatcher = window.setInterval(() => {
    if (socket && getAuthToken() !== lastToken) {
      socket.disconnect().connect();
    }
  }, 3000);

  const inv = (...keys: (readonly unknown[])[]) => {
    keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));
  };

  socket.on('connect', () => {
    console.info('[Realtime] Connected to ChillyFlakes live server:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.info('[Realtime] Disconnected:', reason);
  });

  // Admin order events
  socket.on('admin:order_created', (data) => {
    console.info('[Realtime] New order received:', data?.order_number);
    inv(['admin', 'orders'], ['admin-orders'], ['admin', 'overview'], ['admin', 'finance']);
  });

  socket.on('admin:order_updated', (data) => {
    inv(['admin', 'orders'], ['admin-orders'], ['admin', 'overview']);
    window.dispatchEvent(new CustomEvent('cf_order_status_updated', { detail: data }));
    window.dispatchEvent(new CustomEvent('cf_buyer_orders_updated', { detail: data }));
  });

  socket.on('order:status_updated', (data) => {
    window.dispatchEvent(new CustomEvent('cf_order_status_updated', { detail: data }));
    window.dispatchEvent(new CustomEvent('cf_buyer_orders_updated', { detail: data }));
  });

  // Service booking events
  socket.on('admin:service_booked', (data) => {
    console.info('[Realtime] New service booking received:', data?.bookingRef);
    void queryClient.invalidateQueries({ queryKey: ['admin-service-bookings'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-pending-bookings'] });
    window.dispatchEvent(new CustomEvent('cf_service_booked', { detail: data }));
    window.dispatchEvent(new CustomEvent('cf_buyer_bookings_updated', { detail: data }));
  });

  socket.on('service:booking_status_updated', (data) => {
    console.info('[Realtime] Service booking status updated:', data?.bookingRef, data?.status);
    void queryClient.invalidateQueries({ queryKey: ['admin-service-bookings'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-pending-bookings'] });
    window.dispatchEvent(new CustomEvent('cf_buyer_bookings_updated', { detail: data }));
    window.dispatchEvent(new CustomEvent('cf_service_booked', { detail: data }));
  });

  socket.on('admin:service_booking_updated', (data) => {
    void queryClient.invalidateQueries({ queryKey: ['admin-service-bookings'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-pending-bookings'] });
    window.dispatchEvent(new CustomEvent('cf_buyer_bookings_updated', { detail: data }));
  });

  // Catalog & Inventory events
  socket.on('catalog:product_created', () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
  });

  socket.on('catalog:product_updated', () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    void queryClient.invalidateQueries({ queryKey: ['products'] });
  });

  socket.on('catalog:product_deleted', () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
  });

  socket.on('catalog:stock_updated', () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  });

  socket.on('catalog:category_created', () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    void queryClient.invalidateQueries({ queryKey: ['categories'] });
  });

  socket.on('catalog:category_updated', () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    void queryClient.invalidateQueries({ queryKey: ['categories'] });
  });

  // Seller onboarding lifecycle (admin console)
  const refreshSellers = (data?: { id?: string }) => {
    inv(['admin', 'sellers'], ['admin', 'overview']);
    if (data?.id) inv(['admin', 'sellers', data.id]);
  };
  socket.on('admin:seller_registered', (data) => {
    console.info('[Realtime] New seller registered:', data?.storeName);
    refreshSellers();
    window.dispatchEvent(new CustomEvent('cf_admin_seller_event', { detail: { type: 'registered', ...data } }));
  });
  socket.on('admin:seller_submitted', (data) => {
    console.info('[Realtime] Seller submitted KYC for review:', data?.storeName);
    refreshSellers(data);
    window.dispatchEvent(new CustomEvent('cf_admin_seller_event', { detail: { type: 'submitted', ...data } }));
  });
  socket.on('admin:seller_approved', (data) => refreshSellers(data));
  socket.on('admin:seller_updated', (data) => refreshSellers(data));

  // Product moderation + support (admin console)
  socket.on('admin:product_submitted', () => {
    inv(['admin', 'products'], ['admin-products'], ['admin', 'overview']);
  });
  socket.on('admin:support_ticket_created', () => {
    inv(['admin-support-tickets']);
  });

  // Vendor portal: application status changed by admin (approved / rejected / resubmission / suspended)
  socket.on('vendor:status_updated', (data) => {
    console.info('[Realtime] Vendor application status changed:', data?.status);
    inv(['vendor', 'status'], ['vendor', 'onboarding', 'draft']);
    window.dispatchEvent(new CustomEvent('cf_vendor_status_updated', { detail: data }));
  });

  return socket;
}

export function getRealtimeSocket(): Socket | null {
  return socket;
}
