export interface VendorOrderItem {
  id: string;
  product_id: string;
  title: string;
  image: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status?: string;
}

export interface VendorOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  status: string;
  fulfillment_status: string;
  courier_partner?: string;
  tracking_number?: string;
  shipping_address?: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    postalCode?: string;
    phone?: string;
  };
  items_count: number;
  items: VendorOrderItem[];
  created_at: string;
}

export interface VendorEarningsSummary {
  gross_sales_paise: number;
  commission_paid_paise: number;
  commission_rate_percent: number;
  tcs_tax_paise: number;
  tcs_tax_percent: number;
  net_earnings_paise: number;
  withdrawn_paise: number;
  processing_paise: number;
  available_balance_paise: number;
  min_payout_threshold_paise: number;
  is_eligible_for_payout: boolean;
  bank_info: {
    bank_name: string;
    account_number_masked: string;
    ifsc_code: string;
  };
}

export interface VendorLedgerItem {
  id: string;
  order_id?: string;
  payout_batch_id?: string;
  type: string;
  amount_paise: number;
  description: string;
  reference_id?: string;
  created_at: string;
}

export interface VendorPayout {
  id: string;
  batch_number: string;
  gross_sales: number;
  platform_fee_amount: number;
  tcs_tax_amount: number;
  net_payout: number;
  order_count: number;
  period_start: string;
  period_end: string;
  status: 'pending_approval' | 'processing' | 'disbursed' | 'failed';
  bank_name: string;
  account_number_masked: string;
  ifsc_code: string;
  utr_reference?: string;
  disbursed_at?: string;
  notes?: string;
  created_at: string;
}

export interface VendorService {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  description: string;
  category?: string;
  price: number;
  duration?: string;
  duration_min?: number;
  rating: number;
  reviews_count: number;
  image?: string;
  is_active: boolean;
  features: string[];
  bookings_count: number;
  created_at: string;
}

export interface VendorServiceBooking {
  id: string;
  booking_ref: string;
  service_title: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  preferred_date: string;
  preferred_time: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
}

export interface VendorReview {
  id: string;
  product_id: string;
  product_title: string;
  product_image?: string;
  customer_name: string;
  rating: number;
  title?: string;
  comment: string;
  status: string;
  verified_purchase: boolean;
  created_at: string;
}

export interface VendorKycDoc {
  id: string;
  type: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  status: string;
  uploaded_at: string;
}

export interface VendorProfileData {
  id: string;
  store_name: string;
  store_slug: string;
  legal_name: string;
  business_type?: string;
  email: string;
  phone: string;
  pan?: string;
  tax_id?: string;
  wholesale_enabled: boolean;
  status: string;
  pickup_address: {
    line1?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  bank_info: {
    account_holder_name?: string;
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    account_number_masked?: string;
  };
  declared_categories: string[];
  documents: VendorKycDoc[];
}

export interface VendorSupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_vendor' | 'resolved' | 'closed';
  last_message?: string;
  created_at: string;
  updated_at: string;
  messages?: {
    id: string;
    sender_name: string;
    sender_role: string;
    message: string;
    attachments?: string[];
    created_at: string;
  }[];
}
