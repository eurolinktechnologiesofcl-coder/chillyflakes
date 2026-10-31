import { apiClient, type ApiResponse } from './client';

export interface OrderItemData {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateOrderRequest {
  orderNumber?: string;
  items: OrderItemData[];
  totalAmount: number;
  deliveryCharge: number;
  discountAmount: number;
  couponCode?: string;
  postalCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: string;
  deliverySpeed?: string;
  shippingAddress?: unknown;
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
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  discountPercent?: number;
  discountAmount?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
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
      orderNumber: orderData.orderNumber || `CF-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'processing',
      total: orderData.totalAmount,
      createdAt: new Date().toISOString(),
      estimatedDelivery: '3 - 4 business days',
    };

    return apiClient.post<CreateOrderResponse>('orders/', orderData, fallback);
  },

  /**
   * Validate coupon code against the backend.
   */
  async validateCoupon(code: string, orderAmount?: number): Promise<ApiResponse<CouponValidationResponse>> {
    const clean = code.trim().toUpperCase();
    const isSpecial = clean === 'CHILLY10' || clean === 'NATURAL10';
    const isPod = clean === 'POD';

    const fallback: CouponValidationResponse = isPod
      ? {
          valid: true,
          code: 'POD',
          discountType: 'FIXED',
          discountValue: 50,
          discountPercent: 0,
          discountAmount: 50,
          minOrderAmount: 500,
          message: 'Flat ₹50 OFF applied!',
        }
      : isSpecial
      ? {
          valid: true,
          code: clean,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          discountPercent: 10,
          discountAmount: orderAmount ? Math.round((orderAmount * 10) / 100) : 0,
          message: '10% discount applied!',
        }
      : {
          valid: false,
          code: clean,
          discountType: 'PERCENTAGE',
          discountValue: 0,
          discountPercent: 0,
          discountAmount: 0,
          message: 'Invalid coupon code.',
        };

    return apiClient.post<CouponValidationResponse>(
      'coupons/validate/',
      { code: clean, orderAmount },
      fallback
    );
  },
};
