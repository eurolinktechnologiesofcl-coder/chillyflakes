import { apiClient, type ApiResponse } from './client';

export interface OrderItemData {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateOrderRequest {
  items: OrderItemData[];
  totalAmount: number;
  deliveryCharge: number;
  discountAmount: number;
  postalCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'completed';
  total: number;
  createdAt: string;
  estimatedDelivery: string;
}

export interface CouponValidationResponse {
  valid: boolean;
  code: string;
  discountPercent: number;
  message: string;
}

/**
 * Orders & Checkout API Service
 * Maps to backend endpoints:
 * - POST /api/orders/
 * - GET  /api/orders/
 * - POST /api/coupons/validate/
 */
export const ordersApi = {
  /**
   * Submit an order / checkout to the backend.
   */
  async createOrder(orderData: CreateOrderRequest): Promise<ApiResponse<CreateOrderResponse>> {
    const fallback: CreateOrderResponse = {
      orderId: `ord-${Date.now()}`,
      orderNumber: `CF-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'processing',
      total: orderData.totalAmount,
      createdAt: new Date().toISOString(),
      estimatedDelivery: '3 - 5 business days',
    };

    return apiClient.post<CreateOrderResponse>('orders/', orderData, fallback);
  },

  /**
   * Validate coupon code against the backend.
   */
  async validateCoupon(code: string): Promise<ApiResponse<CouponValidationResponse>> {
    const clean = code.trim().toUpperCase();
    const isSpecial = clean === 'CHILLY10' || clean === 'NATURAL10';

    const fallback: CouponValidationResponse = isSpecial
      ? { valid: true, code: clean, discountPercent: 10, message: '10% discount applied!' }
      : { valid: false, code: clean, discountPercent: 0, message: 'Invalid coupon code.' };

    return apiClient.post<CouponValidationResponse>(
      'coupons/validate/',
      { code: clean },
      fallback
    );
  },
};
