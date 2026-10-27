import { apiClient, type ApiResponse } from './client';
import { servicesData, type ServiceItem } from '../components/ServicesSection';

export interface BookingRequest {
  serviceId: string;
  serviceTitle?: string;
  userName: string;
  userContact: string;
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

/**
 * Services API Service
 * Maps to backend endpoints:
 * - GET  /api/services/
 * - GET  /api/services/:id/
 * - POST /api/services/bookings/
 */
export const servicesApi = {
  /**
   * Fetch list of available community services with optional category filtering.
   */
  async getServices(category?: string): Promise<ApiResponse<ServiceItem[]>> {
    const endpoint = category && category !== 'All' 
      ? `services/?category=${encodeURIComponent(category)}`
      : 'services/';

    const fallback = category && category !== 'All'
      ? servicesData.filter((s) => s.category.toLowerCase() === category.toLowerCase())
      : servicesData;

    return apiClient.get<ServiceItem[]>(endpoint, fallback);
  },

  /**
   * Fetch single service detail by ID.
   */
  async getServiceById(id: string): Promise<ApiResponse<ServiceItem | null>> {
    const fallback = servicesData.find((s) => s.id === id) || null;
    return apiClient.get<ServiceItem | null>(`services/${id}/`, fallback);
  },

  /**
   * Submit a service booking request to the backend.
   */
  async createBooking(booking: BookingRequest): Promise<ApiResponse<BookingResponse>> {
    const fallback: BookingResponse = {
      id: `booking-${Date.now()}`,
      status: 'confirmed',
      message: 'Booking request registered successfully.',
      bookingRef: `CF-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    return apiClient.post<BookingResponse>('services/bookings/', booking, fallback);
  },
};
