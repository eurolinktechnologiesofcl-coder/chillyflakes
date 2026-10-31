import type {
  AdminRole,
  AdminStaffUser,
  AdminUserAccount,
  AdminSellerDetail,
  AuditLogEntry,
  AdminOrder,
  AdminPayoutBatch,
  AdminPlatformSettings,
} from '../types/admin';

/* -------------------------------------------------------------------------- */
/* 1. SEEDED ROLES                                                            */
/* -------------------------------------------------------------------------- */
export const mockAdminRoles: AdminRole[] = [
  {
    id: 'role_super_admin',
    name: 'Super Admin',
    description: 'Unrestricted administrative authority across all marketplace domains and settings.',
    is_system: true,
    user_count: 1,
    permissions: [
      'overview:view',
      'customers:view',
      'customers:create',
      'customers:edit',
      'customers:decide',
      'customers:delete',
      'customers:export',
      'sellers:view',
      'sellers:create',
      'sellers:edit',
      'sellers:decide',
      'sellers:delete',
      'sellers:export',
      'products:view',
      'products:create',
      'products:edit',
      'products:decide',
      'products:delete',
      'products:export',
      'categories:view',
      'categories:create',
      'categories:edit',
      'categories:decide',
      'categories:delete',
      'categories:export',
      'orders:view',
      'orders:edit',
      'orders:decide',
      'orders:export',
      'refunds:view',
      'refunds:decide',
      'refunds:export',
      'payouts:view',
      'payouts:decide',
      'payouts:export',
      'content:view',
      'content:create',
      'content:edit',
      'content:delete',
      'settings:view',
      'settings:edit',
      'audit_log:view',
      'audit_log:export',
      'staff_roles:view',
      'staff_roles:create',
      'staff_roles:edit',
      'staff_roles:decide',
      'staff_roles:delete',
    ],
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'role_seller_verifier',
    name: 'Seller Verifier',
    description: 'Responsible for reviewing merchant onboarding applications, verifying KYC credentials, and deciding seller approvals.',
    is_system: false,
    user_count: 0,
    permissions: [
      'overview:view',
      'sellers:view',
      'sellers:decide',
      'sellers:edit',
      'sellers:export',
      'customers:view',
    ],
    created_at: '2026-08-05T10:00:00Z',
    updated_at: '2026-08-05T10:00:00Z',
  },
  {
    id: 'role_product_moderator',
    name: 'Product Moderator',
    description: 'Inspects vendor product listings, resolves custom categories, and approves items for the ChillyFlakes store.',
    is_system: false,
    user_count: 0,
    permissions: [
      'overview:view',
      'products:view',
      'products:decide',
      'products:edit',
      'categories:view',
      'categories:create',
      'categories:edit',
    ],
    created_at: '2026-08-05T10:00:00Z',
    updated_at: '2026-08-05T10:00:00Z',
  },
  {
    id: 'role_support_agent',
    name: 'Support Agent',
    description: 'Assists buyers and sellers with general queries, order tracking, and profile updates (read-only for reviews).',
    is_system: false,
    user_count: 0,
    permissions: [
      'overview:view',
      'customers:view',
      'customers:edit',
      'sellers:view',
      'products:view',
      'orders:view',
    ],
    created_at: '2026-08-05T10:00:00Z',
    updated_at: '2026-08-05T10:00:00Z',
  },
  {
    id: 'role_finance_manager',
    name: 'Finance Manager',
    description: 'Oversees merchant payouts, bank settlement batches, commission balances, and refund requests.',
    is_system: false,
    user_count: 0,
    permissions: [
      'overview:view',
      'payouts:view',
      'payouts:decide',
      'payouts:export',
      'refunds:view',
      'refunds:decide',
      'orders:view',
      'sellers:view',
    ],
    created_at: '2026-08-05T10:00:00Z',
    updated_at: '2026-08-05T10:00:00Z',
  },
  {
    id: 'role_content_editor',
    name: 'Content Editor',
    description: 'Manages marketing banners, curated artisanal collections, blog articles, and category descriptions.',
    is_system: false,
    user_count: 0,
    permissions: [
      'overview:view',
      'content:view',
      'content:create',
      'content:edit',
      'content:delete',
      'categories:view',
    ],
    created_at: '2026-08-05T10:00:00Z',
    updated_at: '2026-08-05T10:00:00Z',
  },
];

/* -------------------------------------------------------------------------- */
/* 2. STAFF ACCOUNTS                                                          */
/* -------------------------------------------------------------------------- */
export const mockAdminStaffUsers: AdminStaffUser[] = [
  {
    id: 'admin_1',
    name: 'Platform Super Admin',
    email: 'admin@test.com',
    phone: '',
    role_id: 'role_super_admin',
    role_name: 'Super Admin',
    status: 'active',
    permissions: mockAdminRoles[0].permissions,
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

/* -------------------------------------------------------------------------- */
/* 3. 12 SEEDED CUSTOMERS & ACCOUNTS                                          */
/* -------------------------------------------------------------------------- */
export const mockAdminUsers: AdminUserAccount[] = [];

/* -------------------------------------------------------------------------- */
/* 4. 10 SEEDED SELLERS IN VARIED KYC STATES                                  */
/* -------------------------------------------------------------------------- */
export const mockAdminSellers: AdminSellerDetail[] = [];

/* -------------------------------------------------------------------------- */
/* 5. 20 PRE-SEEDED AUDIT LOG ENTRIES                                         */
/* -------------------------------------------------------------------------- */
export const mockAdminAuditLogs: AuditLogEntry[] = [];

/* -------------------------------------------------------------------------- */
/* 7. ADMIN ORDERS & RETURNS MOCK DATA                                        */
/* -------------------------------------------------------------------------- */
export const mockAdminOrders: AdminOrder[] = [];

/* -------------------------------------------------------------------------- */
/* 8. ADMIN FINANCE & PAYOUT BATCHES MOCK DATA                                */
/* -------------------------------------------------------------------------- */
export const mockAdminPayoutBatches: AdminPayoutBatch[] = [];

/* -------------------------------------------------------------------------- */
/* 9. ADMIN PLATFORM SETTINGS MOCK DATA                                       */
/* -------------------------------------------------------------------------- */
export const mockAdminPlatformSettings: AdminPlatformSettings = {
  marketplace: {
    platform_fee_percent: 8.5,
    tcs_tax_percent: 1.0,
    payout_frequency: 'weekly',
    minimum_payout_amount: 500,
  },
  shipping: {
    free_shipping_threshold: 499,
    standard_delivery_fee: 49,
    eco_packaging_fee: 15,
    estimated_delivery_days: 4,
  },
  compliance: {
    gstin: '',
    legal_entity_name: '',
    registered_office_address: '',
    support_email: '',
    support_phone: '',
  },
  system_flags: {
    maintenance_mode: false,
    seller_registration_open: true,
    eco_delivery_enabled: true,
  },
};

