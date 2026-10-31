export type ProductCondition = 'Pre-Owned' | 'Like New' | 'New';

export interface Product {
  id: string;
  name: string;
  category: string;
  condition: ProductCondition;
  conditionDetails: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  reviewsCount: number;
  image: string;
  additionalImages?: string[];
  description: string;
  material: string;
  features: string[];
  isFeatured?: boolean;
  isPreOwned?: boolean;
  stock: number;
  isAssured?: boolean;
  /** Vendor that owns this listing (undefined = sold by ChillyFlakes directly). */
  sellerId?: string;
  sellerName?: string;
}

export interface Category {
  id: string;
  name: string;
  i18nKey?: string;
  iconName: string;
  productCount: number;
  image: string;
  description: string;
  subcategories?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export interface BuyerAddress {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  type: 'Home' | 'Work' | 'Other';
  isDefault?: boolean;
}

export interface BuyerOrder {
  id: string;
  createdAt: string;
  status: 'Placed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  totalAmount: number;
  shippingAddress: BuyerAddress;
  paymentMethod: 'cod' | 'upi' | 'card' | 'netbanking';
  paymentId?: string;
  deliverySpeed: 'standard' | 'express';
  estimatedDeliveryDate?: string;
  courierPartner?: string;
  trackingNumber?: string;
  customerEmail?: string;
  ecoPackaging?: boolean;
  ecoPackagingFee?: number;
  returnRequested?: boolean;
  returnReason?: string;
}

export interface BuyerBooking {
  id: string;
  bookingRef?: string;
  serviceId: string;
  serviceTitle: string;
  userName: string;
  userContact: string;
  customerEmail?: string;
  userPhone?: string;
  preferredDate: string;
  preferredTime: string;
  status: 'Requested' | 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt: string;
  price: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  verifiedPurchase: boolean;
}
