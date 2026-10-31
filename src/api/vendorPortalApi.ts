import { axiosClient } from './client';
import type {
  VendorOrder,
  VendorEarningsSummary,
  VendorLedgerItem,
  VendorPayout,
  VendorService,
  VendorServiceBooking,
  VendorReview,
  VendorProfileData,
  VendorSupportTicket,
  VendorKycDoc,
} from '../types/vendorPortal';

/* ------------------------------- ORDERS ----------------------------------- */
export async function getVendorOrders(params?: {
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<{ count: number; page: number; page_size: number; results: VendorOrder[] }> {
  const res = await axiosClient.get('/api/v1/vendor/orders/', { params });
  return res.data;
}

export async function getVendorOrder(id: string): Promise<VendorOrder> {
  const res = await axiosClient.get(`/api/v1/vendor/orders/${id}/`);
  return res.data;
}

export async function updateVendorOrderStatus(
  id: string,
  payload: { status: string; tracking_number?: string; courier_partner?: string; reason?: string }
): Promise<{ id: string; status: string; message: string }> {
  const res = await axiosClient.patch(`/api/v1/vendor/orders/${id}/status/`, payload);
  return res.data;
}

/* ----------------------------- EARNINGS & PAYOUTS -------------------------- */
export async function getVendorEarningsSummary(): Promise<VendorEarningsSummary> {
  const res = await axiosClient.get('/api/v1/vendor/earnings/summary/');
  return res.data;
}

export async function getVendorLedger(
  page: number = 1,
  pageSize: number = 20
): Promise<{ count: number; page: number; page_size: number; results: VendorLedgerItem[] }> {
  const res = await axiosClient.get('/api/v1/vendor/earnings/ledger/', {
    params: { page, page_size: pageSize },
  });
  return res.data;
}

export async function getVendorPayouts(): Promise<{ results: VendorPayout[] }> {
  const res = await axiosClient.get('/api/v1/vendor/payouts/');
  return res.data;
}

export async function requestVendorPayout(): Promise<{ success: boolean; batch_number: string; message: string }> {
  const res = await axiosClient.post('/api/v1/vendor/payouts/request/');
  return res.data;
}

/* -------------------------------- SERVICES --------------------------------- */
export async function getVendorServices(): Promise<{ results: VendorService[] }> {
  const res = await axiosClient.get('/api/v1/vendor/services/');
  return res.data;
}

export async function createVendorService(payload: Partial<VendorService>): Promise<VendorService> {
  const res = await axiosClient.post('/api/v1/vendor/services/', payload);
  return res.data;
}

export async function updateVendorService(id: string, payload: Partial<VendorService>): Promise<VendorService> {
  const res = await axiosClient.patch(`/api/v1/vendor/services/${id}/`, payload);
  return res.data;
}

export async function deleteVendorService(id: string): Promise<{ success: boolean; message: string }> {
  const res = await axiosClient.delete(`/api/v1/vendor/services/${id}/`);
  return res.data;
}

export async function getVendorServiceBookings(): Promise<{ results: VendorServiceBooking[] }> {
  const res = await axiosClient.get('/api/v1/vendor/services/bookings/');
  return res.data;
}

export async function updateVendorBookingStatus(
  id: string,
  status: string
): Promise<{ id: string; status: string }> {
  const res = await axiosClient.patch(`/api/v1/vendor/services/bookings/${id}/status/`, { status });
  return res.data;
}

/* --------------------------------- REVIEWS --------------------------------- */
export async function getVendorReviews(params?: {
  rating?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<{ count: number; page: number; page_size: number; results: VendorReview[] }> {
  const res = await axiosClient.get('/api/v1/vendor/reviews/', { params });
  return res.data;
}

/* --------------------------- PROFILE & SETTINGS ---------------------------- */
export async function getVendorProfile(): Promise<VendorProfileData> {
  const res = await axiosClient.get('/api/v1/vendor/profile/');
  return res.data;
}

export async function updateVendorProfile(
  payload: Partial<VendorProfileData>
): Promise<{ success: boolean; message: string }> {
  const res = await axiosClient.patch('/api/v1/vendor/profile/', payload);
  return res.data;
}

export async function uploadVendorKycDoc(file: File, documentType: string): Promise<VendorKycDoc> {
  const form = new FormData();
  form.append('file', file);
  form.append('document_type', documentType);
  const res = await axiosClient.post('/api/v1/vendor/documents/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function updateVendorSettings(payload: {
  notifications?: boolean;
  vacation_mode?: boolean;
  auto_accept_orders?: boolean;
}): Promise<{ success: boolean; message: string }> {
  const res = await axiosClient.patch('/api/v1/vendor/settings/', payload);
  return res.data;
}

/* ----------------------------- SUPPORT TICKETS ----------------------------- */
export async function getVendorSupportTickets(): Promise<{ count: number; results: VendorSupportTicket[] }> {
  const res = await axiosClient.get('/api/v1/vendor/support/tickets/');
  return res.data;
}

export async function createVendorSupportTicket(payload: {
  subject: string;
  category: string;
  priority: string;
  message: string;
}): Promise<{ id: string; ticket_number: string; message: string }> {
  const res = await axiosClient.post('/api/v1/vendor/support/tickets/', payload);
  return res.data;
}

export async function getVendorSupportTicketDetail(id: string): Promise<VendorSupportTicket> {
  const res = await axiosClient.get(`/api/v1/vendor/support/tickets/${id}/`);
  return res.data;
}

export async function replyVendorSupportTicket(
  id: string,
  message: string
): Promise<{ id: string; message: string }> {
  const res = await axiosClient.post(`/api/v1/vendor/support/tickets/${id}/messages/`, { message });
  return res.data;
}

/* ----------------------------- NOTIFICATIONS ------------------------------ */
export interface VendorAlertItem {
  id: string;
  type: 'order' | 'booking' | 'support' | 'stock' | string;
  title: string;
  desc: string;
  link: string;
  time: string;
  created_at: string;
}

export async function getVendorNotifications(): Promise<{
  count: number;
  unread_count: number;
  results: VendorAlertItem[];
}> {
  const res = await axiosClient.get('/api/v1/vendor/notifications/');
  return res.data;
}

