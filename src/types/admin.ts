export type AdminModule =
  | 'overview'
  | 'customers'
  | 'sellers'
  | 'products'
  | 'categories'
  | 'orders'
  | 'refunds'
  | 'payouts'
  | 'content'
  | 'settings'
  | 'audit_log'
  | 'staff_roles';

export type AdminAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'decide'
  | 'delete'
  | 'export';

export type PermissionKey = `${AdminModule}:${AdminAction}`;

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  user_count: number;
  permissions: PermissionKey[];
  created_at: string;
  updated_at: string;
}

export interface AdminStaffUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role_id: string;
  role_name: string;
  status: 'active' | 'deactivated' | 'locked';
  permissions: PermissionKey[];
  last_login?: string;
  created_at: string;
}

export interface AdminOverviewMetrics {
  registered_vendors: {
    approved: number;
    pending_review: number;
    total: number;
  };
  active_customers: number;
  catalog_products: {
    live: number;
    pending_review: number;
    total: number;
  };
  products_awaiting_review: number;
  sellers_awaiting_review: number;
  net_platform_revenue_paise: number;
  orders: {
    total: number;
    pending_dispatch: number;
  };
  refund_return_requests: {
    pending: number;
    total: number;
  };
  disbursed_payouts_paise: number;
  held_payments_paise: number | null; // null indicates 'Not yet available'
}

export interface AdminUrgentAlert {
  id: string;
  type: 'seller_docs_delayed' | 'product_review_delayed' | 'seller_suspended' | 'failed_logins_spike';
  severity: 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  count: number;
  target_url: string;
  created_at: string;
}

export interface AdminOverviewResponse {
  metrics: AdminOverviewMetrics;
  alerts: AdminUrgentAlert[];
  updated_at: string;
}

export type UserAccountRole = 'customer' | 'vendor' | 'staff' | 'admin';
export type UserAccountStatus = 'active' | 'deactivated' | 'locked' | 'deleted';

export interface AdminUserAccount {
  id: string;
  name: string;
  email: string;
  email_masked: string;
  phone: string;
  role: UserAccountRole;
  role_id?: string;
  role_name?: string;
  status: UserAccountStatus;
  email_verified: boolean;
  phone_verified: boolean;
  orders_count?: number;
  store_name?: string;
  store_slug?: string;
  is_deleted: boolean;
  deleted_at?: string;
  delete_reason?: string;
  created_at: string;
  last_login?: string;
}

export interface AdminUserListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminUserAccount[];
  tab_counts: {
    customers: number;
    staff_admins: number;
    all_accounts: number;
    deleted: number;
  };
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  phone: string;
  role: UserAccountRole;
  role_id?: string;
}

export interface UpdateAdminUserPayload {
  name?: string;
  phone?: string;
  role?: UserAccountRole;
  role_id?: string;
}

export type SellerKycDocType =
  | 'pan_card'
  | 'identity_proof'
  | 'address_proof'
  | 'gst_certificate'
  | 'bank_proof'
  | 'artisan_certificate';

export type KycDocStatus = 'pending' | 'verified' | 'rejected';

export interface SellerKycDocument {
  id: string;
  type: SellerKycDocType;
  title: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  status: KycDocStatus;
  uploaded_at: string;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
  is_sensitive: boolean;
}

export interface SellerBankInfo {
  account_holder_name: string;
  bank_name: string;
  branch: string;
  ifsc_code: string;
  account_number_masked: string;
  full_account_number?: string;
  holder_matches_pan: boolean;
}

export interface SellerPickupAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export type SellerOnboardingStatus =
  | 'registered'
  | 'onboarding_incomplete'
  | 'under_review'
  | 'resubmission_requested'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type BusinessType = 'individual' | 'small_business' | 'registered_company';

export interface SellerReviewLog {
  id: string;
  reviewer_name: string;
  action: SellerOnboardingStatus | 'document_verified' | 'document_rejected' | 'revealed_sensitive';
  notes?: string;
  flagged_sections?: string[];
  created_at: string;
}

export interface AdminSellerDetail {
  id: string;
  legal_name: string;
  store_name: string;
  store_slug: string;
  business_type: BusinessType;
  tax_id_masked: string;
  full_tax_id?: string;
  pan_masked: string;
  full_pan?: string;
  contact_person: string;
  email: string;
  phone: string;
  pickup_address: SellerPickupAddress;
  declared_categories: string[];
  wholesale_enabled: boolean;
  status: SellerOnboardingStatus;
  assigned_reviewer?: string;
  review_started_at?: string;
  documents: SellerKycDocument[];
  bank_info: SellerBankInfo;
  review_history: SellerReviewLog[];
  created_at: string;
  updated_at: string;
  days_in_current_status: number;
}

export interface AdminSellerListItem {
  id: string;
  legal_name: string;
  store_name: string;
  store_slug: string;
  business_type: BusinessType;
  jurisdiction: string;
  tax_id_masked: string;
  pan_masked: string;
  status: SellerOnboardingStatus;
  verified_docs_count: number;
  total_required_docs_count: number;
  created_at: string;
  submitted_at?: string;
  assigned_reviewer?: string;
  days_in_current_status: number;
}

export interface AdminSellerListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminSellerListItem[];
  tab_counts: {
    under_review: number;
    resubmission_requested: number;
    approved: number;
    rejected: number;
    suspended: number;
    all: number;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  module: AdminModule;
  target_id: string;
  target_name: string;
  ip_address: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface AdminAuditLogResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditLogEntry[];
}

/* -------------------------------------------------------------------------- */
/* 5. ORDERS & RETURNS                                                        */
/* -------------------------------------------------------------------------- */
export type AdminOrderStatus =
  | 'pending_dispatch'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'refunded';

export interface AdminOrderItem {
  product_id: string;
  title: string;
  image: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  seller_id: string;
  seller_name: string;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: AdminOrderItem[];
  total_amount: number;
  shipping_fee: number;
  tax_amount: number;
  payment_method: 'upi' | 'card' | 'netbanking' | 'cod';
  payment_status: 'paid' | 'pending' | 'refunded' | 'failed';
  order_status: AdminOrderStatus;
  delivery_speed: 'standard' | 'express';
  is_eco_delivery: boolean;
  tracking_number?: string;
  courier_partner?: string;
  shipping_address: {
    name: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  return_reason?: string;
  return_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminOrder[];
  tab_counts: {
    all: number;
    pending_dispatch: number;
    in_transit: number;
    delivered: number;
    return_requested: number;
    cancelled: number;
  };
}

/* -------------------------------------------------------------------------- */
/* 6. FINANCE & PAYOUTS                                                       */
/* -------------------------------------------------------------------------- */
export type AdminPayoutStatus = 'pending_approval' | 'processing' | 'disbursed' | 'failed';

export interface AdminPayoutBatch {
  id: string;
  batch_number: string;
  seller_id: string;
  seller_name: string;
  store_name: string;
  bank_name: string;
  account_number_masked: string;
  ifsc_code: string;
  gross_sales: number;
  platform_fee_percent: number;
  platform_fee_amount: number;
  tcs_tax_amount: number;
  net_payout: number;
  order_count: number;
  period_start: string;
  period_end: string;
  status: AdminPayoutStatus;
  utr_reference?: string;
  disbursed_at?: string;
  notes?: string;
  /** Admin order ids settled in this batch. */
  order_ids?: string[];
  created_at: string;
}

export interface AdminFinanceSummary {
  gmv: number;
  platform_revenue: number;
  disbursed_total: number;
  pending_settlement_total: number;
  held_funds: number;
  monthly_growth_rate: number;
  payout_batches_pending: number;
  vendor_sales?: number;
  first_party_sales?: number;
  platform_fee_percent?: number;
  tcs_tax_percent?: number;
}

export interface AdminFinanceResponse {
  summary: AdminFinanceSummary;
  batches: AdminPayoutBatch[];
}

/* -------------------------------------------------------------------------- */
/* 7. PLATFORM SETTINGS                                                       */
/* -------------------------------------------------------------------------- */
export interface AdminPlatformSettings {
  marketplace: {
    platform_fee_percent: number;
    tcs_tax_percent: number;
    payout_frequency: 'weekly' | 'biweekly' | 'monthly';
    minimum_payout_amount: number;
  };
  shipping: {
    free_shipping_threshold: number;
    standard_delivery_fee: number;
    eco_packaging_fee: number;
    estimated_delivery_days: number;
  };
  compliance: {
    gstin: string;
    legal_entity_name: string;
    registered_office_address: string;
    support_email: string;
    support_phone: string;
  };
  system_flags: {
    maintenance_mode: boolean;
    seller_registration_open: boolean;
    eco_delivery_enabled: boolean;
  };
}

