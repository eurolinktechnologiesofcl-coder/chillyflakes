import { http, HttpResponse, delay } from 'msw';
import {
  mockAdminRoles,
  mockAdminStaffUsers,
  mockAdminUsers,
  mockAdminSellers,
  mockAdminAuditLogs,
  mockAdminPayoutBatches,
} from './adminMockData';
import { mockVendorProducts } from './handlers';
import { products as buyerCatalogProducts } from '../data/products';
import type {
  AdminOverviewResponse,
  AdminUserAccount,
  AdminSellerListItem,
  AuditLogEntry,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  AdminOrder,
  AdminOrderListResponse,
  AdminOrderStatus,
  AdminPayoutBatch,
  AdminFinanceResponse,
  AdminPlatformSettings,
} from '../types/admin';
import type { AdminUser } from '../types/adminProduct';

import { loadPersisted, registerPersisted } from './persist';
import {
  getPlatformSettings,
  savePlatformSettings,
  getAdminOrders,
  saveAdminOrders,
  syncAdminStatusToBuyerOrder,
  getBuyerCustomers,
  FIRST_PARTY_SELLER_ID,
} from '../utils/platformSync';

// Admin session (persisted so a reload keeps you signed in; starts signed out)
export let currentAdminUser: AdminUser | null = loadPersisted<AdminUser | null>('admin_session', null);

// Persisted mock database (seeded empty — everything is created through the UI)
export let activeStaff = loadPersisted('admin_staff', [...mockAdminStaffUsers]);
export let activeRoles = loadPersisted('admin_roles', [...mockAdminRoles]);
export let activeUsers = loadPersisted('admin_users', [...mockAdminUsers]);
export let activeSellers = loadPersisted('admin_sellers', [...mockAdminSellers]);
export let activeAuditLogs = loadPersisted('admin_audit_logs', [...mockAdminAuditLogs]);
export let activeOrders: AdminOrder[] = getAdminOrders();
export let activePayoutBatches: AdminPayoutBatch[] = loadPersisted('admin_payout_batches', [...mockAdminPayoutBatches]);
export let activePlatformSettings: AdminPlatformSettings = getPlatformSettings();
/** Staff login passwords keyed by lower-cased email. */
export const staffPasswords: Record<string, string> = loadPersisted('admin_staff_passwords', {
  'admin@test.com': 'Test@123',
});

registerPersisted('admin_session', () => currentAdminUser);
registerPersisted('admin_staff', () => activeStaff);
registerPersisted('admin_roles', () => activeRoles);
registerPersisted('admin_users', () => activeUsers);
registerPersisted('admin_sellers', () => activeSellers);
registerPersisted('admin_audit_logs', () => activeAuditLogs);
registerPersisted('admin_payout_batches', () => activePayoutBatches);
registerPersisted('admin_staff_passwords', () => staffPasswords);

/** Role member counts are always derived from the real staff list. */
function syncRoleCounts() {
  activeRoles.forEach((r) => {
    r.user_count = activeStaff.filter((s) => s.role_id === r.id && s.status !== 'deactivated').length;
  });
  // Keep staff permissions in sync with their role's current permissions
  activeStaff.forEach((s) => {
    const role = activeRoles.find((r) => r.id === s.role_id);
    if (role) {
      s.role_name = role.name;
      s.permissions = role.permissions;
    }
  });
}

/** Buyers who signed in on the storefront become customer accounts here. */
function syncCustomersFromStorefront() {
  activeOrders = getAdminOrders();
  getBuyerCustomers().forEach((bc) => {
    const email = bc.email.toLowerCase();
    const existing = activeUsers.find((u) => u.email.toLowerCase() === email);
    const ordersCount = activeOrders.filter((o) => o.customer_email.toLowerCase() === email).length;
    if (existing) {
      existing.orders_count = ordersCount;
      existing.last_login = bc.last_login;
      if (!existing.phone && bc.phone) existing.phone = bc.phone;
    } else {
      activeUsers.unshift({
        id: `cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: bc.name,
        email,
        email_masked: `${email.slice(0, 2)}••••••@${email.split('@')[1] || ''}`,
        phone: bc.phone || '',
        role: 'customer',
        status: 'active',
        email_verified: false,
        phone_verified: false,
        orders_count: ordersCount,
        is_deleted: false,
        created_at: bc.created_at,
        last_login: bc.last_login,
      });
    }
  });

  // Mirror staff logins into the account directory ("Staff & Admins" tab)
  syncRoleCounts();
  activeStaff.forEach((s) => {
    const email = s.email.toLowerCase();
    const role = s.role_id === 'role_super_admin' ? 'admin' : 'staff';
    const status = s.status === 'active' ? 'active' : 'deactivated';
    const existing = activeUsers.find((u) => u.email.toLowerCase() === email);
    if (existing) {
      existing.role = role;
      existing.role_id = s.role_id;
      existing.role_name = s.role_name;
      existing.status = status;
      existing.last_login = s.last_login;
    } else {
      activeUsers.push({
        id: s.id,
        name: s.name,
        email,
        email_masked: `${email.slice(0, 2)}••••••@${email.split('@')[1] || ''}`,
        phone: s.phone || '',
        role,
        role_id: s.role_id,
        role_name: s.role_name,
        status,
        email_verified: true,
        phone_verified: false,
        is_deleted: false,
        created_at: s.created_at,
        last_login: s.last_login,
      });
    }
  });
}

/** Settlement period length (days) derived from the payout cycle setting. */
function payoutPeriodDays(freq: AdminPlatformSettings['marketplace']['payout_frequency']): number {
  return freq === 'monthly' ? 30 : freq === 'biweekly' ? 14 : 7;
}

function recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'actor_name' | 'actor_email' | 'actor_role' | 'ip_address'>) {
  const newLog: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    actor_name: currentAdminUser?.name || 'System',
    actor_email: currentAdminUser?.email || '—',
    actor_role: currentAdminUser?.role_name || (currentAdminUser?.role === 'admin' ? 'Super Admin' : 'System'),
    ip_address: 'local',
    ...entry,
  };
  activeAuditLogs.unshift(newLog);
}

export const adminHandlers = [
  /* ------------------------------------------------------------------------ */
  /* ADMIN AUTHENTICATION                                                     */
  /* ------------------------------------------------------------------------ */
  http.post('*/api/v1/admin/auth/login/', async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    syncRoleCounts();
    const staffMatch = activeStaff.find((s) => s.email.toLowerCase() === email);

    if (!staffMatch || staffPasswords[email] !== password) {
      return HttpResponse.json(
        { code: 'invalid_credentials', message: 'Invalid admin email or password.' },
        { status: 401 }
      );
    }

    if (staffMatch.status === 'deactivated') {
      return HttpResponse.json(
        { code: 'account_deactivated', message: 'This staff account has been deactivated.' },
        { status: 403 }
      );
    }

    staffMatch.last_login = new Date().toISOString();
    currentAdminUser = {
      id: staffMatch.id,
      email: staffMatch.email,
      name: staffMatch.name,
      role: staffMatch.role_id === 'role_super_admin' ? 'admin' : 'staff',
      role_id: staffMatch.role_id,
      role_name: staffMatch.role_name,
      permissions: staffMatch.permissions as string[],
    };

    recordAuditLog({
      action: 'ADMIN_LOGIN',
      module: 'overview',
      target_id: staffMatch.id,
      target_name: staffMatch.name,
      reason: 'Signed in to the Super Admin console.',
    });

    return HttpResponse.json(
      { message: 'Admin login successful', user: currentAdminUser },
      { status: 200 }
    );
  }),

  http.post('*/api/v1/admin/auth/logout/', async () => {
    await delay(300);
    currentAdminUser = null;
    return HttpResponse.json({ message: 'Logged out successfully' }, { status: 200 });
  }),

  http.get('*/api/v1/admin/auth/me/', async () => {
    await delay(200);
    if (currentAdminUser) {
      syncRoleCounts();
      const staff = activeStaff.find((s) => s.id === currentAdminUser?.id);
      if (!staff || staff.status === 'deactivated') {
        currentAdminUser = null;
      } else {
        currentAdminUser = {
          ...currentAdminUser,
          name: staff.name,
          role: staff.role_id === 'role_super_admin' ? 'admin' : 'staff',
          role_id: staff.role_id,
          role_name: staff.role_name,
          permissions: staff.permissions as string[],
        };
      }
    }
    if (!currentAdminUser) {
      return HttpResponse.json(
        { code: 'not_authenticated', message: 'Admin authentication required.' },
        { status: 401 }
      );
    }
    return HttpResponse.json(currentAdminUser, { status: 200 });
  }),

  /* ------------------------------------------------------------------------ */
  /* 1. MARKETPLACE OVERVIEW                                                  */
  /* ------------------------------------------------------------------------ */
  http.get('*/api/v1/admin/overview/', async () => {
    await delay(300);
    syncCustomersFromStorefront();
    activeOrders = getAdminOrders();
    const settings = getPlatformSettings();

    const approvedVendorsCount = activeSellers.filter((s) => s.status === 'approved').length;
    const pendingVendorsCount = activeSellers.filter((s) => s.status === 'under_review').length;
    const activeCustomersCount = activeUsers.filter((u) => !u.is_deleted && u.status === 'active').length;

    // Delayed review calculations
    const delayedSellers = activeSellers.filter((s) => s.status === 'under_review' && s.days_in_current_status > 3);
    const suspendedSellers = activeSellers.filter((s) => s.status === 'suspended');

    const alerts = [];

    if (delayedSellers.length > 0) {
      alerts.push({
        id: 'alert_sellers_delayed',
        type: 'seller_docs_delayed' as const,
        severity: 'danger' as const,
        title: 'Delayed Merchant KYC Reviews',
        description: `${delayedSellers.length} merchant application has been awaiting document verification for more than 3 days.`,
        count: delayedSellers.length,
        target_url: '/admin/people/sellers?status=under_review',
        created_at: new Date().toISOString(),
      });
    }

    if (suspendedSellers.length > 0) {
      alerts.push({
        id: 'alert_sellers_suspended',
        type: 'seller_suspended' as const,
        severity: 'warning' as const,
        title: 'Suspended Merchants Under Investigation',
        description: `${suspendedSellers.length} store accounts are currently suspended due to compliance or IP violations.`,
        count: suspendedSellers.length,
        target_url: '/admin/people/sellers?status=suspended',
        created_at: new Date().toISOString(),
      });
    }

    const feePercent = settings.marketplace?.platform_fee_percent ?? 8.5;
    const vendorSalesTotal = activeOrders
      .filter((o) => o.payment_status === 'paid')
      .reduce((sum, o) => sum + o.items.filter((it) => it.seller_id !== FIRST_PARTY_SELLER_ID).reduce((a, it) => a + it.total_price, 0), 0);
    const netPlatformRevenuePaise = Math.round(vendorSalesTotal * feePercent);
    const pendingDispatchCount = activeOrders.filter((o) => o.order_status === 'pending_dispatch').length;
    const returnClaimsCount = activeOrders.filter((o) => o.order_status === 'return_requested').length;
    const disbursedPaise = activePayoutBatches
      .filter((b) => b.status === 'disbursed')
      .reduce((sum, b) => sum + b.net_payout, 0) * 100;

    const response: AdminOverviewResponse = {
      metrics: {
        registered_vendors: {
          approved: approvedVendorsCount,
          pending_review: pendingVendorsCount,
          total: activeSellers.length,
        },
        active_customers: activeCustomersCount,
        catalog_products: {
          live: buyerCatalogProducts.length + mockVendorProducts.filter((p) => p.status === 'approved').length,
          pending_review: mockVendorProducts.filter((p) => p.status === 'pending_review').length,
          total: buyerCatalogProducts.length + mockVendorProducts.length,
        },
        products_awaiting_review: mockVendorProducts.filter((p) => p.status === 'pending_review').length,
        sellers_awaiting_review: pendingVendorsCount,
        net_platform_revenue_paise: netPlatformRevenuePaise,
        orders: {
          total: activeOrders.length,
          pending_dispatch: pendingDispatchCount,
        },
        refund_return_requests: {
          pending: returnClaimsCount,
          total: returnClaimsCount,
        },
        disbursed_payouts_paise: disbursedPaise,
        held_payments_paise: 0,
      },
      alerts,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(response, { status: 200 });
  }),

  /* ------------------------------------------------------------------------ */
  /* 2. CUSTOMER / USER DIRECTORY                                             */
  /* ------------------------------------------------------------------------ */
  http.get('*/api/v1/admin/users/', async ({ request }) => {
    await delay(300);
    syncCustomersFromStorefront();
    const url = new URL(request.url);
    const tab = url.searchParams.get('tab') || 'customers';
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const roleFilter = url.searchParams.get('role');
    const statusFilter = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('page_size') || '25', 10);

    let filtered = [...activeUsers];

    // Tab filter
    if (tab === 'customers') {
      filtered = filtered.filter((u) => !u.is_deleted && u.role === 'customer');
    } else if (tab === 'staff_admins') {
      filtered = filtered.filter((u) => !u.is_deleted && (u.role === 'staff' || u.role === 'admin'));
    } else if (tab === 'deleted') {
      filtered = filtered.filter((u) => u.is_deleted);
    } else {
      // all_accounts
      filtered = filtered.filter((u) => !u.is_deleted);
    }

    // Role filter
    if (roleFilter && roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }

    // Search
    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.phone.includes(search)
      );
    }

    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return HttpResponse.json(
      {
        count: totalCount,
        next: startIndex + pageSize < totalCount ? `?page=${page + 1}` : null,
        previous: page > 1 ? `?page=${page - 1}` : null,
        results: paginated,
        tab_counts: {
          customers: activeUsers.filter((u) => !u.is_deleted && u.role === 'customer').length,
          staff_admins: activeUsers.filter((u) => !u.is_deleted && (u.role === 'staff' || u.role === 'admin')).length,
          all_accounts: activeUsers.filter((u) => !u.is_deleted).length,
          deleted: activeUsers.filter((u) => u.is_deleted).length,
        },
      },
      { status: 200 }
    );
  }),

  // Create / Invite User
  http.post('*/api/v1/admin/users/', async ({ request }) => {
    await delay(700);
    const body = (await request.json()) as CreateAdminUserPayload;

    if (!body.name || !body.email) {
      return HttpResponse.json({ code: 'missing_fields', message: 'Name and email are required.' }, { status: 400 });
    }

    if (body.role === 'staff' || body.role === 'admin') {
      return HttpResponse.json(
        { code: 'use_staff_page', message: 'Staff logins are created from Staff & Roles → Add Staff Member.' },
        { status: 400 }
      );
    }

    // Check email uniqueness
    if (activeUsers.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      return HttpResponse.json(
        { code: 'email_exists', message: 'An account with this email address already exists.' },
        { status: 400 }
      );
    }

    const newUser: AdminUserAccount = {
      id: `usr_${Date.now()}`,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      email_masked: `${body.email.slice(0, 2)}••••••@${body.email.split('@')[1]}`,
      phone: (body.phone || '').trim(),
      role: body.role || 'customer',
      status: 'active',
      email_verified: false,
      phone_verified: false,
      orders_count: 0,
      is_deleted: false,
      created_at: new Date().toISOString(),
    };

    activeUsers.unshift(newUser);

    recordAuditLog({
      action: 'USER_INVITED',
      module: 'customers',
      target_id: newUser.id,
      target_name: newUser.name,
      reason: `Dispatched setup invitation link for role: ${newUser.role}.`,
    });

    return HttpResponse.json(newUser, { status: 201 });
  }),

  // Update User
  http.patch('*/api/v1/admin/users/:id/', async ({ params, request }) => {
    await delay(700);
    const id = params.id as string;
    const user = activeUsers.find((u) => u.id === id);

    if (!user) {
      return HttpResponse.json({ code: 'not_found', message: 'User account not found.' }, { status: 404 });
    }

    const body = (await request.json()) as UpdateAdminUserPayload;

    // Safety rule: Cannot demote self
    if (user.id === currentAdminUser?.id && body.role && body.role !== 'admin') {
      return HttpResponse.json(
        { code: 'cannot_demote_self', message: 'Administrators cannot demote their own account role.' },
        { status: 403 }
      );
    }

    // Safety rule: Last remaining Super Admin cannot be demoted
    if (user.role === 'admin' && body.role && body.role !== 'admin') {
      const superAdminCount = activeUsers.filter((u) => !u.is_deleted && u.role === 'admin').length;
      if (superAdminCount <= 1) {
        return HttpResponse.json(
          { code: 'cannot_remove_last_admin', message: 'The last remaining Super Admin cannot be demoted.' },
          { status: 403 }
        );
      }
    }

    if (body.name) user.name = body.name.trim();
    if (body.phone) user.phone = body.phone.trim();
    if (body.role) {
      user.role = body.role;
      user.role_name = body.role === 'admin' ? 'Super Admin' : body.role === 'staff' ? 'Staff' : undefined;
    }

    recordAuditLog({
      action: 'USER_UPDATED',
      module: 'customers',
      target_id: user.id,
      target_name: user.name,
      reason: 'Modified account profile and privileges.',
    });

    return HttpResponse.json(user, { status: 200 });
  }),

  // Deactivate User
  http.post('*/api/v1/admin/users/:id/deactivate/', async ({ params }) => {
    await delay(700);
    const id = params.id as string;
    const user = activeUsers.find((u) => u.id === id);

    if (!user) {
      return HttpResponse.json({ code: 'not_found', message: 'User not found.' }, { status: 404 });
    }

    // Safety rule: Cannot deactivate self
    if (user.id === currentAdminUser?.id || user.email === currentAdminUser?.email) {
      return HttpResponse.json(
        { code: 'cannot_deactivate_self', message: 'You cannot deactivate your own administrator account.' },
        { status: 403 }
      );
    }

    // Safety rule: Cannot deactivate last super admin
    if (user.role === 'admin') {
      const activeAdmins = activeUsers.filter((u) => !u.is_deleted && u.role === 'admin' && u.status === 'active').length;
      if (activeAdmins <= 1) {
        return HttpResponse.json(
          { code: 'cannot_deactivate_last_admin', message: 'The last active Super Admin cannot be deactivated.' },
          { status: 403 }
        );
      }
    }

    user.status = 'deactivated';
    const linkedStaffOff = activeStaff.find((st) => st.email.toLowerCase() === user.email.toLowerCase());
    if (linkedStaffOff) linkedStaffOff.status = 'deactivated';

    recordAuditLog({
      action: 'USER_DEACTIVATED',
      module: 'customers',
      target_id: user.id,
      target_name: user.name,
      reason: 'Administrative deactivation.',
    });

    return HttpResponse.json(user, { status: 200 });
  }),

  // Activate User
  http.post('*/api/v1/admin/users/:id/activate/', async ({ params }) => {
    await delay(700);
    const id = params.id as string;
    const user = activeUsers.find((u) => u.id === id);

    if (!user) {
      return HttpResponse.json({ code: 'not_found', message: 'User not found.' }, { status: 404 });
    }

    user.status = 'active';
    const linkedStaffOn = activeStaff.find((st) => st.email.toLowerCase() === user.email.toLowerCase());
    if (linkedStaffOn) linkedStaffOn.status = 'active';

    recordAuditLog({
      action: 'USER_ACTIVATED',
      module: 'customers',
      target_id: user.id,
      target_name: user.name,
      reason: 'Administrative reactivation.',
    });

    return HttpResponse.json(user, { status: 200 });
  }),

  // Force Password Reset
  http.post('*/api/v1/admin/users/:id/force-password-reset/', async ({ params }) => {
    await delay(700);
    const id = params.id as string;
    const user = activeUsers.find((u) => u.id === id);

    if (!user) {
      return HttpResponse.json({ code: 'not_found', message: 'User not found.' }, { status: 404 });
    }

    recordAuditLog({
      action: 'PASSWORD_RESET_FORCED',
      module: 'customers',
      target_id: user.id,
      target_name: user.name,
      reason: `Dispatched secure reset link to ${user.email}.`,
    });

    return HttpResponse.json(
      { success: true, message: `Password reset dispatched to ${user.email}.` },
      { status: 200 }
    );
  }),

  // Sign out all sessions
  http.post('*/api/v1/admin/users/:id/sign-out-all/', async ({ params }) => {
    await delay(700);
    const id = params.id as string;
    const user = activeUsers.find((u) => u.id === id);

    if (!user) {
      return HttpResponse.json({ code: 'not_found', message: 'User not found.' }, { status: 404 });
    }

    recordAuditLog({
      action: 'SESSIONS_TERMINATED',
      module: 'customers',
      target_id: user.id,
      target_name: user.name,
      reason: 'Revoked all active refresh tokens and browser sessions.',
    });

    return HttpResponse.json(
      { success: true, message: `All active sessions revoked for ${user.name}.` },
      { status: 200 }
    );
  }),

  // Soft Delete User
  http.delete('*/api/v1/admin/users/:id/', async ({ params, request }) => {
    await delay(700);
    const id = params.id as string;
    const user = activeUsers.find((u) => u.id === id);

    if (!user) {
      return HttpResponse.json({ code: 'not_found', message: 'User not found.' }, { status: 404 });
    }

    // Safety rule: Cannot delete self
    if (user.id === currentAdminUser?.id || user.email === currentAdminUser?.email) {
      return HttpResponse.json(
        { code: 'cannot_delete_self', message: 'Administrators cannot delete their own account.' },
        { status: 403 }
      );
    }

    // Safety rule: Cannot delete last super admin
    if (user.role === 'admin') {
      const adminCount = activeUsers.filter((u) => !u.is_deleted && u.role === 'admin').length;
      if (adminCount <= 1) {
        return HttpResponse.json(
          { code: 'cannot_delete_last_admin', message: 'The last remaining Super Admin cannot be deleted.' },
          { status: 403 }
        );
      }
    }

    let reason = 'Administrative soft deletion.';
    try {
      const body = (await request.json()) as { reason?: string };
      if (body.reason) reason = body.reason.trim();
    } catch {
      // ignore
    }

    user.is_deleted = true;
    user.status = 'deleted';
    user.deleted_at = new Date().toISOString();
    user.delete_reason = reason;

    recordAuditLog({
      action: 'USER_SOFT_DELETED',
      module: 'customers',
      target_id: user.id,
      target_name: user.name,
      reason,
    });

    return HttpResponse.json(
      { success: true, message: 'Account soft-deleted successfully.' },
      { status: 200 }
    );
  }),

  /* ------------------------------------------------------------------------ */
  /* 3. VENDOR & SELLER HUB                                                   */
  /* ------------------------------------------------------------------------ */
  http.get('*/api/v1/admin/sellers/', async ({ request }) => {
    await delay(700);
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const bType = url.searchParams.get('business_type');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('page_size') || '25', 10);

    let filtered = [...activeSellers];

    if (status && status !== 'all') {
      filtered = filtered.filter((s) => s.status === status);
    }

    if (bType && bType !== 'all') {
      filtered = filtered.filter((s) => s.business_type === bType);
    }

    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.store_name.toLowerCase().includes(search) ||
          s.legal_name.toLowerCase().includes(search) ||
          s.pan_masked.toLowerCase().includes(search) ||
          s.store_slug.toLowerCase().includes(search)
      );
    }

    // Sort: under_review oldest first (highest days_in_current_status)
    if (status === 'under_review') {
      filtered.sort((a, b) => b.days_in_current_status - a.days_in_current_status);
    }

    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    const listItems: AdminSellerListItem[] = paginated.map((s) => ({
      id: s.id,
      legal_name: s.legal_name,
      store_name: s.store_name,
      store_slug: s.store_slug,
      business_type: s.business_type,
      jurisdiction: s.pickup_address.state || 'India',
      tax_id_masked: s.tax_id_masked,
      pan_masked: s.pan_masked,
      status: s.status,
      verified_docs_count: s.documents.filter((d) => d.status === 'verified').length,
      total_required_docs_count: s.documents.length,
      created_at: s.created_at,
      assigned_reviewer: s.assigned_reviewer,
      days_in_current_status: s.days_in_current_status,
    }));

    return HttpResponse.json(
      {
        count: totalCount,
        next: startIndex + pageSize < totalCount ? `?page=${page + 1}` : null,
        previous: page > 1 ? `?page=${page - 1}` : null,
        results: listItems,
        tab_counts: {
          under_review: activeSellers.filter((s) => s.status === 'under_review').length,
          resubmission_requested: activeSellers.filter((s) => s.status === 'resubmission_requested').length,
          approved: activeSellers.filter((s) => s.status === 'approved').length,
          rejected: activeSellers.filter((s) => s.status === 'rejected').length,
          suspended: activeSellers.filter((s) => s.status === 'suspended').length,
          all: activeSellers.length,
        },
      },
      { status: 200 }
    );
  }),

  // Get Seller Detail
  http.get('*/api/v1/admin/sellers/:id/', async ({ params }) => {
    await delay(700);
    const id = params.id as string;
    const seller = activeSellers.find((s) => s.id === id);

    if (!seller) {
      return HttpResponse.json({ code: 'not_found', message: 'Seller application not found.' }, { status: 404 });
    }

    return HttpResponse.json(seller, { status: 200 });
  }),

  // Verify Document
  http.post('*/api/v1/admin/sellers/:sellerId/documents/:docId/verify/', async ({ params }) => {
    await delay(700);
    const sellerId = params.sellerId as string;
    const docId = params.docId as string;
    const seller = activeSellers.find((s) => s.id === sellerId);

    if (!seller) {
      return HttpResponse.json({ code: 'not_found', message: 'Seller not found.' }, { status: 404 });
    }

    const doc = seller.documents.find((d) => d.id === docId);
    if (!doc) {
      return HttpResponse.json({ code: 'not_found', message: 'Document not found.' }, { status: 404 });
    }

    doc.status = 'verified';
    doc.verified_at = new Date().toISOString();
    doc.verified_by = currentAdminUser?.name || 'Administrator';
    doc.rejection_reason = undefined;

    seller.review_history.push({
      id: `rev_${Date.now()}`,
      reviewer_name: currentAdminUser?.name || 'Administrator',
      action: 'document_verified',
      notes: `Verified ${doc.title}.`,
      created_at: new Date().toISOString(),
    });

    recordAuditLog({
      action: 'DOCUMENT_VERIFIED',
      module: 'sellers',
      target_id: doc.id,
      target_name: `${seller.store_name} - ${doc.title}`,
      reason: 'Verified document matches statutory registry records.',
    });

    return HttpResponse.json(seller, { status: 200 });
  }),

  // Reject Document
  http.post('*/api/v1/admin/sellers/:sellerId/documents/:docId/reject/', async ({ params, request }) => {
    await delay(700);
    const sellerId = params.sellerId as string;
    const docId = params.docId as string;
    const seller = activeSellers.find((s) => s.id === sellerId);

    if (!seller) {
      return HttpResponse.json({ code: 'not_found', message: 'Seller not found.' }, { status: 404 });
    }

    const doc = seller.documents.find((d) => d.id === docId);
    if (!doc) {
      return HttpResponse.json({ code: 'not_found', message: 'Document not found.' }, { status: 404 });
    }

    const body = (await request.json()) as { reason: string };
    const reason = (body.reason || '').trim();

    if (!reason) {
      return HttpResponse.json({ code: 'reason_required', message: 'Rejection reason is required.' }, { status: 400 });
    }

    doc.status = 'rejected';
    doc.rejection_reason = reason;

    seller.review_history.push({
      id: `rev_${Date.now()}`,
      reviewer_name: currentAdminUser?.name || 'Administrator',
      action: 'document_rejected',
      notes: `Rejected ${doc.title}: ${reason}`,
      created_at: new Date().toISOString(),
    });

    recordAuditLog({
      action: 'DOCUMENT_REJECTED',
      module: 'sellers',
      target_id: doc.id,
      target_name: `${seller.store_name} - ${doc.title}`,
      reason,
    });

    return HttpResponse.json(seller, { status: 200 });
  }),

  // Mark Under Review
  http.post('*/api/v1/admin/sellers/:id/under-review/', async ({ params }) => {
    await delay(700);
    const id = params.id as string;
    const seller = activeSellers.find((s) => s.id === id);

    if (!seller) {
      return HttpResponse.json({ code: 'not_found', message: 'Seller not found.' }, { status: 404 });
    }

    seller.status = 'under_review';
    seller.assigned_reviewer = currentAdminUser?.name || 'Administrator';
    seller.review_started_at = new Date().toISOString();

    seller.review_history.push({
      id: `rev_${Date.now()}`,
      reviewer_name: currentAdminUser?.name || 'Administrator',
      action: 'under_review',
      notes: `Review initiated by ${currentAdminUser?.name || 'Administrator'}.`,
      created_at: new Date().toISOString(),
    });

    recordAuditLog({
      action: 'SELLER_UNDER_REVIEW',
      module: 'sellers',
      target_id: seller.id,
      target_name: seller.store_name,
      reason: 'Initiated merchant review.',
    });

    return HttpResponse.json(seller, { status: 200 });
  }),

  // Approve Seller (Enforces: ALL required docs must be verified)
  http.post('*/api/v1/admin/sellers/:id/approve/', async ({ params, request }) => {
    await delay(700);
    const id = params.id as string;
    const seller = activeSellers.find((s) => s.id === id);

    if (!seller) {
      return HttpResponse.json({ code: 'not_found', message: 'Seller not found.' }, { status: 404 });
    }

    // Check all required documents
    const unverifiedDocs = seller.documents.filter((d) => d.status !== 'verified');
    if (seller.documents.length === 0 || unverifiedDocs.length > 0) {
      return HttpResponse.json(
        {
          code: 'documents_not_verified',
          message: 'All required documents must be verified before approval.',
          missing: unverifiedDocs.map((d) => d.title),
        },
        { status: 400 }
      );
    }

    let notes = 'Approved for marketplace operations.';
    try {
      const body = (await request.json()) as { reason?: string };
      if (body.reason) notes = body.reason.trim();
    } catch {
      // ignore
    }

    seller.status = 'approved';
    seller.days_in_current_status = 0;

    seller.review_history.push({
      id: `rev_${Date.now()}`,
      reviewer_name: currentAdminUser?.name || 'Administrator',
      action: 'approved',
      notes,
      created_at: new Date().toISOString(),
    });

    recordAuditLog({
      action: 'SELLER_APPROVED',
      module: 'sellers',
      target_id: seller.id,
      target_name: seller.store_name,
      reason: notes,
    });

    return HttpResponse.json(seller, { status: 200 });
  }),

  // Request Resubmit
  http.post('*/api/v1/admin/sellers/:id/request-resubmit/', async ({ params, request }) => {
    await delay(700);
    const id = params.id as string;
    const seller = activeSellers.find((s) => s.id === id);

    if (!seller) {
      return HttpResponse.json({ code: 'not_found', message: 'Seller not found.' }, { status: 404 });
    }

    const body = (await request.json()) as { reason: string; flagged_sections: string[] };
    const reason = (body.reason || '').trim();

    if (!reason || reason.length < 10) {
      return HttpResponse.json(
        { code: 'invalid_reason', message: 'Resubmission reason must be at least 10 characters.' },
        { status: 400 }
      );
    }

    seller.status = 'resubmission_requested';
    seller.days_in_current_status = 0;

    seller.review_history.push({
      id: `rev_${Date.now()}`,
      reviewer_name: currentAdminUser?.name || 'Administrator',
      action: 'resubmission_requested',
      notes: reason,
      flagged_sections: body.flagged_sections || [],
      created_at: new Date().toISOString(),
    });

    recordAuditLog({
      action: 'SELLER_RESUBMIT_REQUESTED',
      module: 'sellers',
      target_id: seller.id,
      target_name: seller.store_name,
      reason,
    });

    return HttpResponse.json(seller, { status: 200 });
  }),

  // Reject Seller
  http.post('*/api/v1/admin/sellers/:id/reject/', async ({ params, request }) => {
    await delay(700);
    const id = params.id as string;
    const seller = activeSellers.find((s) => s.id === id);

    if (!seller) {
      return HttpResponse.json({ code: 'not_found', message: 'Seller not found.' }, { status: 404 });
    }

    const body = (await request.json()) as { reason: string };
    const reason = (body.reason || '').trim();

    if (!reason) {
      return HttpResponse.json({ code: 'reason_required', message: 'Rejection reason is required.' }, { status: 400 });
    }

    seller.status = 'rejected';
    seller.days_in_current_status = 0;

    seller.review_history.push({
      id: `rev_${Date.now()}`,
      reviewer_name: currentAdminUser?.name || 'Administrator',
      action: 'rejected',
      notes: reason,
      created_at: new Date().toISOString(),
    });

    recordAuditLog({
      action: 'SELLER_REJECTED',
      module: 'sellers',
      target_id: seller.id,
      target_name: seller.store_name,
      reason,
    });

    return HttpResponse.json(seller, { status: 200 });
  }),

  // Suspend Seller
  http.post('*/api/v1/admin/sellers/:id/suspend/', async ({ params, request }) => {
    await delay(700);
    const id = params.id as string;
    const seller = activeSellers.find((s) => s.id === id);

    if (!seller) {
      return HttpResponse.json({ code: 'not_found', message: 'Seller not found.' }, { status: 404 });
    }

    const body = (await request.json()) as { reason: string };
    const reason = (body.reason || '').trim();

    if (!reason) {
      return HttpResponse.json({ code: 'reason_required', message: 'Suspension reason is required.' }, { status: 400 });
    }

    seller.status = 'suspended';
    seller.days_in_current_status = 0;

    seller.review_history.push({
      id: `rev_${Date.now()}`,
      reviewer_name: currentAdminUser?.name || 'Administrator',
      action: 'suspended',
      notes: reason,
      created_at: new Date().toISOString(),
    });

    recordAuditLog({
      action: 'SELLER_SUSPENDED',
      module: 'sellers',
      target_id: seller.id,
      target_name: seller.store_name,
      reason,
    });

    return HttpResponse.json(seller, { status: 200 });
  }),

  // Reactivate Seller
  http.post('*/api/v1/admin/sellers/:id/reactivate/', async ({ params }) => {
    await delay(700);
    const id = params.id as string;
    const seller = activeSellers.find((s) => s.id === id);

    if (!seller) {
      return HttpResponse.json({ code: 'not_found', message: 'Seller not found.' }, { status: 404 });
    }

    seller.status = 'approved';
    seller.days_in_current_status = 0;

    seller.review_history.push({
      id: `rev_${Date.now()}`,
      reviewer_name: currentAdminUser?.name || 'Administrator',
      action: 'approved',
      notes: 'Store access restored.',
      created_at: new Date().toISOString(),
    });

    recordAuditLog({
      action: 'SELLER_REACTIVATED',
      module: 'sellers',
      target_id: seller.id,
      target_name: seller.store_name,
      reason: 'Administrative reactivation.',
    });

    return HttpResponse.json(seller, { status: 200 });
  }),

  // Reveal Sensitive Field
  http.post('*/api/v1/admin/sellers/:id/reveal/', async ({ params, request }) => {
    await delay(700);
    const id = params.id as string;
    const seller = activeSellers.find((s) => s.id === id);

    if (!seller) {
      return HttpResponse.json({ code: 'not_found', message: 'Seller not found.' }, { status: 404 });
    }

    const body = (await request.json()) as { field: 'tax_id' | 'pan' | 'bank_account' };
    const field = body.field;

    let value = '';
    if (field === 'tax_id') {
      value = seller.full_tax_id || '33AABCD1234F1Z5';
    } else if (field === 'pan') {
      value = seller.full_pan || 'AABCD1234F';
    } else if (field === 'bank_account') {
      value = seller.bank_info.full_account_number || '502000458924892';
    }

    recordAuditLog({
      action: 'SENSITIVE_DATA_REVEALED',
      module: 'sellers',
      target_id: seller.id,
      target_name: seller.store_name,
      reason: `Decrypted and viewed sensitive field: ${field}.`,
    });

    return HttpResponse.json({ field, value }, { status: 200 });
  }),

  /* ------------------------------------------------------------------------ */
  /* 4. ROLES & STAFF MANAGEMENT                                              */
  /* ------------------------------------------------------------------------ */
  http.get('*/api/v1/admin/roles/', async () => {
    await delay(300);
    syncRoleCounts();
    return HttpResponse.json(activeRoles, { status: 200 });
  }),

  http.post('*/api/v1/admin/roles/', async ({ request }) => {
    await delay(700);
    const body = (await request.json()) as { name: string; description: string; permissions: any[] };

    const newRole = {
      id: `role_${Date.now()}`,
      name: body.name.trim(),
      description: body.description.trim(),
      is_system: false,
      user_count: 0,
      permissions: body.permissions || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    activeRoles.push(newRole);

    recordAuditLog({
      action: 'ROLE_CREATED',
      module: 'staff_roles',
      target_id: newRole.id,
      target_name: newRole.name,
      reason: 'Created new custom role.',
    });

    return HttpResponse.json(newRole, { status: 201 });
  }),

  http.patch('*/api/v1/admin/roles/:id/', async ({ params, request }) => {
    await delay(700);
    const id = params.id as string;
    const role = activeRoles.find((r) => r.id === id);

    if (!role) {
      return HttpResponse.json({ code: 'not_found', message: 'Role not found.' }, { status: 404 });
    }

    if (role.is_system && role.id === 'role_super_admin') {
      return HttpResponse.json(
        { code: 'system_role_locked', message: 'The Super Admin system role cannot be edited.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { name?: string; description?: string; permissions?: any[] };
    if (body.name) role.name = body.name.trim();
    if (body.description) role.description = body.description.trim();
    if (body.permissions) role.permissions = body.permissions;
    role.updated_at = new Date().toISOString();

    recordAuditLog({
      action: 'ROLE_MODIFIED',
      module: 'staff_roles',
      target_id: role.id,
      target_name: role.name,
      reason: 'Modified role permissions.',
    });

    return HttpResponse.json(role, { status: 200 });
  }),

  http.delete('*/api/v1/admin/roles/:id/', async ({ params }) => {
    await delay(700);
    const id = params.id as string;
    const role = activeRoles.find((r) => r.id === id);

    if (!role) {
      return HttpResponse.json({ code: 'not_found', message: 'Role not found.' }, { status: 404 });
    }

    if (role.is_system) {
      return HttpResponse.json(
        { code: 'system_role_locked', message: 'System-defined roles cannot be deleted.' },
        { status: 403 }
      );
    }

    if (role.user_count > 0) {
      return HttpResponse.json(
        {
          code: 'role_in_use',
          message: `Cannot delete role with ${role.user_count} assigned staff members. Reassign them first.`,
        },
        { status: 400 }
      );
    }

    activeRoles = activeRoles.filter((r) => r.id !== id);

    recordAuditLog({
      action: 'ROLE_DELETED',
      module: 'staff_roles',
      target_id: role.id,
      target_name: role.name,
      reason: 'Deleted custom role.',
    });

    return HttpResponse.json({ success: true, message: 'Role deleted.' }, { status: 200 });
  }),

  http.get('*/api/v1/admin/staff/', async () => {
    await delay(300);
    syncRoleCounts();
    return HttpResponse.json(activeStaff, { status: 200 });
  }),

  // Create a staff login (name, email, role, initial password)
  http.post('*/api/v1/admin/staff/', async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      role_id?: string;
      password?: string;
    };
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!name || !email || !body.role_id || !password) {
      return HttpResponse.json(
        { code: 'missing_fields', message: 'Name, email, role and initial password are required.' },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return HttpResponse.json({ code: 'invalid_email', message: 'Enter a valid email address.' }, { status: 400 });
    }
    if (password.length < 6) {
      return HttpResponse.json(
        { code: 'weak_password', message: 'Initial password must be at least 6 characters.' },
        { status: 400 }
      );
    }
    if (activeStaff.some((s) => s.email.toLowerCase() === email)) {
      return HttpResponse.json(
        { code: 'email_exists', message: 'A staff member with this email already exists.' },
        { status: 400 }
      );
    }
    const role = activeRoles.find((r) => r.id === body.role_id);
    if (!role) {
      return HttpResponse.json({ code: 'not_found', message: 'Selected role not found.' }, { status: 404 });
    }

    const newStaff = {
      id: `staff_${Date.now()}`,
      name,
      email,
      phone: (body.phone || '').trim(),
      role_id: role.id,
      role_name: role.name,
      status: 'active' as const,
      permissions: role.permissions,
      created_at: new Date().toISOString(),
    };
    activeStaff.push(newStaff);
    staffPasswords[email] = password;
    syncRoleCounts();

    recordAuditLog({
      action: 'STAFF_CREATED',
      module: 'staff_roles',
      target_id: newStaff.id,
      target_name: newStaff.name,
      reason: `Created staff login with role: ${role.name}.`,
    });

    return HttpResponse.json(newStaff, { status: 201 });
  }),

  http.post('*/api/v1/admin/staff/:id/deactivate/', async ({ params }) => {
    await delay(300);
    const staff = activeStaff.find((s) => s.id === params.id);
    if (!staff) {
      return HttpResponse.json({ code: 'not_found', message: 'Staff user not found.' }, { status: 404 });
    }
    if (staff.id === currentAdminUser?.id) {
      return HttpResponse.json(
        { code: 'cannot_deactivate_self', message: 'You cannot deactivate your own account.' },
        { status: 403 }
      );
    }
    if (staff.role_id === 'role_super_admin') {
      const activeSupers = activeStaff.filter((s) => s.role_id === 'role_super_admin' && s.status === 'active');
      if (activeSupers.length <= 1) {
        return HttpResponse.json(
          { code: 'last_super_admin', message: 'The last active Super Admin cannot be deactivated.' },
          { status: 403 }
        );
      }
    }
    staff.status = 'deactivated';
    syncRoleCounts();
    recordAuditLog({
      action: 'STAFF_DEACTIVATED',
      module: 'staff_roles',
      target_id: staff.id,
      target_name: staff.name,
      reason: 'Staff login access revoked.',
    });
    return HttpResponse.json(staff, { status: 200 });
  }),

  http.post('*/api/v1/admin/staff/:id/activate/', async ({ params }) => {
    await delay(300);
    const staff = activeStaff.find((s) => s.id === params.id);
    if (!staff) {
      return HttpResponse.json({ code: 'not_found', message: 'Staff user not found.' }, { status: 404 });
    }
    staff.status = 'active';
    syncRoleCounts();
    recordAuditLog({
      action: 'STAFF_ACTIVATED',
      module: 'staff_roles',
      target_id: staff.id,
      target_name: staff.name,
      reason: 'Staff login access restored.',
    });
    return HttpResponse.json(staff, { status: 200 });
  }),

  http.post('*/api/v1/admin/staff/:id/reset-password/', async ({ params, request }) => {
    await delay(300);
    const staff = activeStaff.find((s) => s.id === params.id);
    if (!staff) {
      return HttpResponse.json({ code: 'not_found', message: 'Staff user not found.' }, { status: 404 });
    }
    const body = (await request.json()) as { password?: string };
    if (!body.password || body.password.length < 6) {
      return HttpResponse.json(
        { code: 'weak_password', message: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }
    staffPasswords[staff.email.toLowerCase()] = body.password;
    recordAuditLog({
      action: 'STAFF_PASSWORD_RESET',
      module: 'staff_roles',
      target_id: staff.id,
      target_name: staff.name,
      reason: 'Login password reset by administrator.',
    });
    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  http.patch('*/api/v1/admin/staff/:id/role/', async ({ params, request }) => {
    await delay(700);
    const id = params.id as string;
    const staff = activeStaff.find((s) => s.id === id);

    if (!staff) {
      return HttpResponse.json({ code: 'not_found', message: 'Staff user not found.' }, { status: 404 });
    }

    const body = (await request.json()) as { role_id: string };
    const newRole = activeRoles.find((r) => r.id === body.role_id);

    if (!newRole) {
      return HttpResponse.json({ code: 'not_found', message: 'Selected role not found.' }, { status: 404 });
    }

    // Safety rule: Cannot change own role if super admin
    if (staff.id === currentAdminUser?.id && newRole.id !== 'role_super_admin') {
      return HttpResponse.json(
        { code: 'cannot_demote_self', message: 'You cannot alter your own administrative role.' },
        { status: 403 }
      );
    }

    staff.role_id = newRole.id;
    staff.role_name = newRole.name;
    staff.permissions = newRole.permissions;
    syncRoleCounts();

    recordAuditLog({
      action: 'STAFF_ROLE_ASSIGNED',
      module: 'staff_roles',
      target_id: staff.id,
      target_name: staff.name,
      reason: `Assigned new role: ${newRole.name}.`,
    });

    return HttpResponse.json(staff, { status: 200 });
  }),

  /* ------------------------------------------------------------------------ */
  /* 5. AUDIT LOG                                                             */
  /* ------------------------------------------------------------------------ */
  http.get('*/api/v1/admin/audit-log/', async ({ request }) => {
    await delay(700);
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const action = url.searchParams.get('action');
    const moduleParam = url.searchParams.get('module');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('page_size') || '25', 10);

    let filtered = [...activeAuditLogs];

    if (action && action !== 'all') {
      filtered = filtered.filter((log) => log.action.toLowerCase().includes(action.toLowerCase()));
    }

    if (moduleParam && moduleParam !== 'all') {
      filtered = filtered.filter((log) => log.module === moduleParam);
    }

    if (search) {
      filtered = filtered.filter(
        (log) =>
          log.actor_name.toLowerCase().includes(search) ||
          log.actor_email.toLowerCase().includes(search) ||
          log.target_name.toLowerCase().includes(search) ||
          log.action.toLowerCase().includes(search) ||
          (log.reason && log.reason.toLowerCase().includes(search))
      );
    }

    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return HttpResponse.json(
      {
        count: totalCount,
        next: startIndex + pageSize < totalCount ? `?page=${page + 1}` : null,
        previous: page > 1 ? `?page=${page - 1}` : null,
        results: paginated,
      },
      { status: 200 }
    );
  }),

  /* ------------------------------------------------------------------------ */
  /* 7. ORDERS & RETURNS                                                      */
  /* ------------------------------------------------------------------------ */
  http.get('*/api/v1/admin/orders/', async ({ request }) => {
    await delay(300);
    // Always refresh activeOrders from persistent storage
    activeOrders = getAdminOrders();
    const url = new URL(request.url);
    const tab = url.searchParams.get('tab') || 'all';
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('page_size') || '15', 10);

    const counts = {
      all: activeOrders.length,
      pending_dispatch: activeOrders.filter((o) => o.order_status === 'pending_dispatch').length,
      in_transit: activeOrders.filter((o) => o.order_status === 'in_transit').length,
      delivered: activeOrders.filter((o) => o.order_status === 'delivered').length,
      return_requested: activeOrders.filter((o) => o.order_status === 'return_requested').length,
      cancelled: activeOrders.filter((o) => o.order_status === 'cancelled').length,
    };

    let filtered = [...activeOrders];

    if (tab !== 'all') {
      filtered = filtered.filter((o) => o.order_status === tab);
    }

    if (search) {
      filtered = filtered.filter(
        (o) =>
          o.order_number.toLowerCase().includes(search) ||
          o.customer_name.toLowerCase().includes(search) ||
          o.customer_email.toLowerCase().includes(search) ||
          o.items.some((i) => i.title.toLowerCase().includes(search) || i.seller_name.toLowerCase().includes(search))
      );
    }

    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    const response: AdminOrderListResponse = {
      count: totalCount,
      next: startIndex + pageSize < totalCount ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      results: paginated,
      tab_counts: counts,
    };

    return HttpResponse.json(response, { status: 200 });
  }),

  http.patch('*/api/v1/admin/orders/:id/status/', async ({ params, request }) => {
    await delay(400);
    const id = params.id as string;
    const body = (await request.json()) as {
      order_status?: AdminOrderStatus;
      courier_partner?: string;
      tracking_number?: string;
    };

    activeOrders = getAdminOrders();
    const orderIndex = activeOrders.findIndex((o) => o.id === id);
    if (orderIndex === -1) {
      return HttpResponse.json({ code: 'not_found', message: 'Order not found' }, { status: 404 });
    }

    const prevOrder = activeOrders[orderIndex];
    const nextStatus = body.order_status || prevOrder.order_status;
    let nextPayment = prevOrder.payment_status;
    // Cash-on-delivery is collected when the parcel is delivered
    if (nextStatus === 'delivered' && prevOrder.payment_status === 'pending') nextPayment = 'paid';
    // Cancelling a prepaid order refunds the buyer
    if (nextStatus === 'cancelled' && prevOrder.payment_status === 'paid') nextPayment = 'refunded';
    if (nextStatus === 'cancelled' && prevOrder.payment_status === 'pending') nextPayment = 'failed';

    const updated: AdminOrder = {
      ...prevOrder,
      order_status: nextStatus,
      payment_status: nextPayment,
      courier_partner: body.courier_partner !== undefined ? body.courier_partner : prevOrder.courier_partner,
      tracking_number: body.tracking_number !== undefined ? body.tracking_number : prevOrder.tracking_number,
      updated_at: new Date().toISOString(),
    };

    activeOrders[orderIndex] = updated;
    saveAdminOrders(activeOrders);

    // Sync status change to buyer frontend orders list in real-time
    syncAdminStatusToBuyerOrder(
      updated.order_number,
      updated.order_status,
      updated.courier_partner,
      updated.tracking_number
    );

    recordAuditLog({
      action: 'ORDER_STATUS_UPDATED',
      module: 'orders',
      target_id: updated.id,
      target_name: updated.order_number,
      reason: `Status changed to ${updated.order_status}`,
    });

    return HttpResponse.json(updated, { status: 200 });
  }),

  http.post('*/api/v1/admin/orders/:id/resolve-return/', async ({ params, request }) => {
    await delay(450);
    const id = params.id as string;
    const body = (await request.json()) as {
      action: 'approve_refund' | 'reject_return';
      reason?: string;
    };

    activeOrders = getAdminOrders();
    const orderIndex = activeOrders.findIndex((o) => o.id === id);
    if (orderIndex === -1) {
      return HttpResponse.json({ code: 'not_found', message: 'Order not found' }, { status: 404 });
    }

    const prevOrder = activeOrders[orderIndex];
    const updated: AdminOrder = {
      ...prevOrder,
      order_status: body.action === 'approve_refund' ? 'refunded' : 'delivered',
      payment_status: body.action === 'approve_refund' ? 'refunded' : prevOrder.payment_status,
      return_notes: body.reason,
      updated_at: new Date().toISOString(),
    };

    activeOrders[orderIndex] = updated;
    saveAdminOrders(activeOrders);

    // Sync refunded/cancelled status to buyer frontend orders list
    syncAdminStatusToBuyerOrder(
      updated.order_number,
      updated.order_status
    );

    recordAuditLog({
      action: body.action === 'approve_refund' ? 'RETURN_REFUND_APPROVED' : 'RETURN_REQUEST_REJECTED',
      module: 'refunds',
      target_id: updated.id,
      target_name: updated.order_number,
      reason: body.reason || (body.action === 'approve_refund' ? 'Refund processed to customer source account.' : 'Return request declined after inspection.'),
    });

    return HttpResponse.json(updated, { status: 200 });
  }),

  /* ------------------------------------------------------------------------ */
  /* 8. FINANCE & PAYOUTS                                                     */
  /* ------------------------------------------------------------------------ */
  http.get('*/api/v1/admin/finance/', async () => {
    await delay(300);
    activeOrders = getAdminOrders();
    const settings = getPlatformSettings();
    const feePercent = settings.marketplace?.platform_fee_percent ?? 8.5;

    const paidOrders = activeOrders.filter((o) => o.payment_status === 'paid');
    const gmv = paidOrders.reduce((sum, o) => sum + o.total_amount, 0);
    let vendorSales = 0;
    let firstPartySales = 0;
    paidOrders.forEach((o) =>
      o.items.forEach((it) => {
        if (it.seller_id === FIRST_PARTY_SELLER_ID) firstPartySales += it.total_price;
        else vendorSales += it.total_price;
      })
    );
    const platform_revenue = Math.round(vendorSales * (feePercent / 100) * 100) / 100;
    const disbursed_total = activePayoutBatches
      .filter((b) => b.status === 'disbursed')
      .reduce((sum, b) => sum + b.net_payout, 0);
    const pending_settlement_total = activePayoutBatches
      .filter((b) => b.status === 'pending_approval' || b.status === 'processing')
      .reduce((sum, b) => sum + b.net_payout, 0);

    const response: AdminFinanceResponse = {
      summary: {
        gmv,
        platform_revenue,
        disbursed_total,
        pending_settlement_total,
        held_funds: 0,
        monthly_growth_rate: 0,
        payout_batches_pending: activePayoutBatches.filter((b) => b.status === 'pending_approval').length,
        vendor_sales: vendorSales,
        first_party_sales: firstPartySales,
        platform_fee_percent: feePercent,
        tcs_tax_percent: settings.marketplace?.tcs_tax_percent ?? 1,
      },
      batches: activePayoutBatches,
    };

    return HttpResponse.json(response, { status: 200 });
  }),

  // Generate settlement batches from delivered + paid vendor orders not yet settled
  http.post('*/api/v1/admin/finance/batches/generate/', async () => {
    await delay(400);
    activeOrders = getAdminOrders();
    const settings = getPlatformSettings();
    const feePercent = settings.marketplace?.platform_fee_percent ?? 8.5;
    const tcsPercent = settings.marketplace?.tcs_tax_percent ?? 1;
    const minPayout = settings.marketplace?.minimum_payout_amount ?? 0;
    const periodDays = payoutPeriodDays(settings.marketplace?.payout_frequency ?? 'weekly');

    const isSettled = (sellerId: string, orderId: string) =>
      activePayoutBatches.some((b) => b.seller_id === sellerId && (b.order_ids || []).includes(orderId));

    const groups = new Map<string, { sellerName: string; gross: number; orderIds: Set<string> }>();
    activeOrders
      .filter((o) => o.order_status === 'delivered' && o.payment_status === 'paid')
      .forEach((o) =>
        o.items.forEach((it) => {
          if (it.seller_id === FIRST_PARTY_SELLER_ID || isSettled(it.seller_id, o.id)) return;
          const g = groups.get(it.seller_id) || { sellerName: it.seller_name, gross: 0, orderIds: new Set<string>() };
          g.gross += it.total_price;
          g.orderIds.add(o.id);
          groups.set(it.seller_id, g);
        })
      );

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const now = new Date();
    const created: AdminPayoutBatch[] = [];
    let skippedBelowMinimum = 0;

    groups.forEach((g, sellerId) => {
      const fee = round2(g.gross * (feePercent / 100));
      const tcs = round2(g.gross * (tcsPercent / 100));
      const net = round2(g.gross - fee - tcs);
      if (net < minPayout) {
        skippedBelowMinimum += 1;
        return;
      }
      const seller = activeSellers.find((sl) => sl.id === sellerId || sl.store_name === g.sellerName);
      const seq = activePayoutBatches.length + created.length + 1;
      created.push({
        id: `batch_${Date.now()}_${seq}`,
        batch_number: `PB-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${String(seq).padStart(3, '0')}`,
        seller_id: sellerId,
        seller_name: seller?.contact_person || g.sellerName,
        store_name: seller?.store_name || g.sellerName,
        bank_name: seller?.bank_info?.bank_name || 'Bank details not on file',
        account_number_masked: seller?.bank_info?.account_number_masked || '—',
        ifsc_code: seller?.bank_info?.ifsc_code || '—',
        gross_sales: round2(g.gross),
        platform_fee_percent: feePercent,
        platform_fee_amount: fee,
        tcs_tax_amount: tcs,
        net_payout: net,
        order_count: g.orderIds.size,
        order_ids: Array.from(g.orderIds),
        period_start: new Date(now.getTime() - periodDays * 86400000).toISOString(),
        period_end: now.toISOString(),
        status: 'pending_approval',
        created_at: now.toISOString(),
      });
    });

    activePayoutBatches = [...created, ...activePayoutBatches];

    if (created.length > 0) {
      recordAuditLog({
        action: 'PAYOUT_BATCHES_GENERATED',
        module: 'payouts',
        target_id: created.map((c) => c.id).join(','),
        target_name: `${created.length} settlement batch(es)`,
        reason: `Generated from delivered vendor orders at ${feePercent}% fee and ${tcsPercent}% TCS.`,
      });
    }

    return HttpResponse.json(
      { created: created.length, skipped_below_minimum: skippedBelowMinimum, batches: created },
      { status: 200 }
    );
  }),

  http.post('*/api/v1/admin/finance/batches/:id/approve/', async ({ params }) => {
    await delay(400);
    const id = params.id as string;
    const batchIndex = activePayoutBatches.findIndex((b) => b.id === id);

    if (batchIndex === -1) {
      return HttpResponse.json({ code: 'not_found', message: 'Payout batch not found' }, { status: 404 });
    }

    activePayoutBatches[batchIndex] = {
      ...activePayoutBatches[batchIndex],
      status: 'processing',
    };

    recordAuditLog({
      action: 'PAYOUT_BATCH_APPROVED',
      module: 'payouts',
      target_id: activePayoutBatches[batchIndex].id,
      target_name: activePayoutBatches[batchIndex].batch_number,
      reason: `Approved payout batch for ${activePayoutBatches[batchIndex].store_name} (₹${activePayoutBatches[batchIndex].net_payout})`,
    });

    return HttpResponse.json(activePayoutBatches[batchIndex], { status: 200 });
  }),

  http.post('*/api/v1/admin/finance/batches/:id/disburse/', async ({ params, request }) => {
    await delay(450);
    const id = params.id as string;
    const body = (await request.json()) as { utr_reference?: string };
    const batchIndex = activePayoutBatches.findIndex((b) => b.id === id);

    if (batchIndex === -1) {
      return HttpResponse.json({ code: 'not_found', message: 'Payout batch not found' }, { status: 404 });
    }

    const utr = body.utr_reference || `CMS${Date.now().toString().slice(-8)}`;

    activePayoutBatches[batchIndex] = {
      ...activePayoutBatches[batchIndex],
      status: 'disbursed',
      utr_reference: utr,
      disbursed_at: new Date().toISOString(),
    };

    recordAuditLog({
      action: 'PAYOUT_DISBURSED',
      module: 'payouts',
      target_id: activePayoutBatches[batchIndex].id,
      target_name: activePayoutBatches[batchIndex].batch_number,
      reason: `Disbursement completed with UTR: ${utr}`,
    });

    return HttpResponse.json(activePayoutBatches[batchIndex], { status: 200 });
  }),

  /* ------------------------------------------------------------------------ */
  /* 9. PLATFORM SETTINGS                                                     */
  /* ------------------------------------------------------------------------ */
  http.get('*/api/v1/admin/settings/', async () => {
    await delay(250);
    activePlatformSettings = getPlatformSettings();
    return HttpResponse.json(activePlatformSettings, { status: 200 });
  }),

  http.put('*/api/v1/admin/settings/', async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as Partial<AdminPlatformSettings>;
    const current = getPlatformSettings();
    activePlatformSettings = {
      ...current,
      ...body,
      marketplace: { ...current.marketplace, ...(body.marketplace || {}) },
      shipping: { ...current.shipping, ...(body.shipping || {}) },
      compliance: { ...current.compliance, ...(body.compliance || {}) },
      system_flags: { ...current.system_flags, ...(body.system_flags || {}) },
    };
    savePlatformSettings(activePlatformSettings);

    recordAuditLog({
      action: 'PLATFORM_SETTINGS_UPDATED',
      module: 'settings',
      target_id: 'global_settings',
      target_name: 'Marketplace Configuration',
      reason: 'Modified platform fees, tax rules, or operational system flags.',
    });

    return HttpResponse.json(activePlatformSettings, { status: 200 });
  }),

  /* ------------------------------------------------------------------------ */
  /* 10. BUYER STOREFRONT REAL-TIME INTERACTION HANDLERS                      */
  /* ------------------------------------------------------------------------ */
  // Buyer order placement acknowledgement. The storefront syncs the order into the
  // admin queue exactly once via syncBuyerOrderToAdmin(), so nothing is stored here.
  http.post('*/api/orders/', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { orderNumber?: string; totalAmount?: number };
    const orderNumber = body.orderNumber || `CF-${Math.floor(100000 + Math.random() * 900000)}`;
    const days = getPlatformSettings().shipping?.estimated_delivery_days ?? 4;
    return HttpResponse.json(
      {
        orderId: orderNumber,
        orderNumber,
        status: 'processing',
        total: body.totalAmount || 0,
        createdAt: new Date().toISOString(),
        estimatedDelivery: `${days} business days`,
      },
      { status: 201 }
    );
  }),
];

