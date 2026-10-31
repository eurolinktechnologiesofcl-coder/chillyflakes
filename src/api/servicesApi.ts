import { axiosClient, type ApiResponse } from './client';
import { servicesData, type ServiceItem } from '../components/ServicesSection';
import type { BuyerBooking } from '../types';

export interface BookingRequest {
  serviceId?: string;
  serviceTitle: string;
  userName: string;
  userContact: string;
  customerEmail?: string;
  customerPhone?: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
}

export interface BookingResponse {
  id: string;
  status: 'confirmed' | 'pending';
  message: string;
  bookingRef: string;
}

export const servicesApi = {
  /**
   * Fetch list of available community services with optional category filtering.
   */
  async getServices(category?: string): Promise<ApiResponse<ServiceItem[]>> {
    const endpoint = category && category !== 'All' 
      ? `/api/v1/services/?category=${encodeURIComponent(category)}`
      : '/api/v1/services/';

    try {
      const res = await axiosClient.get(endpoint);
      return { data: res.data, status: res.status, isMock: false };
    } catch {
      const filtered = category && category !== 'All'
        ? servicesData.filter((s) => s.category.toLowerCase() === category.toLowerCase())
        : servicesData;
      return { data: filtered, status: 200, isMock: true };
    }
  },

  /**
   * Fetch single service detail by ID.
   */
  async getServiceById(id: string): Promise<ApiResponse<ServiceItem | null>> {
    try {
      const res = await axiosClient.get(`/api/v1/services/${id}/`);
      return { data: res.data, status: res.status, isMock: false };
    } catch {
      const found = servicesData.find((s) => s.id === id) || null;
      return { data: found, status: found ? 200 : 404, isMock: true };
    }
  },

  /**
   * Submit a service booking request to the backend.
   */
  async createBooking(booking: BookingRequest): Promise<ApiResponse<BookingResponse>> {
    const res = await axiosClient.post<BookingResponse>('/api/v1/services/bookings/', booking);
    return { data: res.data, status: res.status, isMock: false };
  },

  /**
   * Cancel an existing service booking appointment.
   */
  async cancelBooking(bookingId: string, reason?: string, email?: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const res = await axiosClient.post(`/api/v1/services/bookings/${encodeURIComponent(bookingId)}/cancel/`, { reason, email });
    return { data: res.data, status: res.status, isMock: false };
  },

  /**
   * Fetch buyer's service bookings from the backend database.
   */
  async getMyBookings(email?: string): Promise<ApiResponse<BuyerBooking[]>> {
    try {
      const res = await axiosClient.get('/api/v1/services/bookings/', {
        params: email ? { email } : undefined,
      });
      const list = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.bookings) ? res.data.bookings : []);
      return { data: list, status: res.status, isMock: false };
    } catch {
      return { data: [], status: 500, isMock: true };
    }
  },
};

