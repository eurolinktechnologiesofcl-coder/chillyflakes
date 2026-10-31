import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Plus,
  RefreshCw,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Edit2,
  Trash2,
  Power,
  RotateCcw,
  LogOut,
  AlertTriangle,
  Info,
  Store,
  X,
} from 'lucide-react';
import { useAdminUsers, useAdminUserMutations } from '../hooks/useAdminUsers';
import { usePermission } from '../hooks/usePermission';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useToast } from '../../../components/vendor/Toast';
import { ConfirmDialog } from '../../../components/vendor/ConfirmDialog';
import { Pagination } from '../../../components/vendor/Pagination';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { Skeleton } from '../../../components/vendor/Skeleton';
import type { AdminUserAccount, UserAccountRole, CreateAdminUserPayload } from '../../../types/admin';

export const AdminCustomersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { admin } = useAdminAuth();
  const { isSuperAdmin, canCreate, canEdit, canDelete } = usePermission();

  // Query Params
  const tab = (searchParams.get('tab') || 'customers') as 'customers' | 'staff_admins' | 'all_accounts' | 'deleted';
  const search = searchParams.get('search') || '';
  const roleFilter = searchParams.get('role') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('page_size') || '25', 10);

  // Queries & Mutations
  const { data, isLoading, isError, refetch, isFetching } = useAdminUsers({
    tab,
    search: search || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    page_size: pageSize,
  });

  const {
    createUser,
    isCreating,
    updateUser,
    isUpdating,
    deactivateUser,
    activateUser,
    forcePasswordReset,
    signOutAllSessions,
    softDeleteUser,
    isDeleting,
  } = useAdminUserMutations();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminUserPayload>({
    name: '',
    email: '',
    phone: '',
    role: 'customer',
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<AdminUserAccount | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; phone: string; role: UserAccountRole }>({
    name: '',
    phone: '',
    role: 'customer',
  });
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingUser, setDeletingUser] = useState<AdminUserAccount | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [statusConfirmUser, setStatusConfirmUser] = useState<{ user: AdminUserAccount; action: 'activate' | 'deactivate' } | null>(null);

  // Update query params helper
  const updateParams = (updates: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === '' || v === 'all') {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    });
    setSearchParams(next);
  };

  const handleTabChange = (newTab: 'customers' | 'staff_admins' | 'all_accounts' | 'deleted') => {
    updateParams({ tab: newTab, page: 1 });
  };

  const handleSearchChange = (val: string) => {
    updateParams({ search: val, page: 1 });
  };

  // Create User Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.phone.trim()) {
      setCreateError('Please complete all required fields.');
      return;
    }

    try {
      await createUser(createForm);
      toast.success(
        `An account setup invitation email was sent to ${createForm.email}. The user will securely set their password.`
      );
      setIsCreateOpen(false);
      setCreateForm({ name: '', email: '', phone: '', role: 'customer' });
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to create user invitation.');
    }
  };

  // Edit User Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    try {
      await updateUser({
        id: editingUser.id,
        payload: {
          name: editForm.name.trim(),
          phone: editForm.phone.trim(),
          role: editForm.role,
        },
      });
      toast.success(`Successfully updated account profile for ${editForm.name}.`);
      setEditingUser(null);
    } catch (err: any) {
      setEditError(err.response?.data?.message || err.message || 'Failed to update user account.');
    }
  };

  // Trigger password reset
  const handleForcePasswordReset = async (user: AdminUserAccount) => {
    try {
      await forcePasswordReset(user.id);
      toast.success(
        `A secure one-time password reset link has been dispatched to ${user.email}.`
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to trigger password reset.');
    }
  };

  // Sign out all sessions
  const handleSignOutSessions = async (user: AdminUserAccount) => {
    try {
      await signOutAllSessions(user.id);
      toast.success(
        `All active refresh tokens and browser sessions for ${user.name} have been revoked.`
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to terminate user sessions.');
    }
  };

  // Toggle user activation
  const handleToggleStatus = async () => {
    if (!statusConfirmUser) return;
    const { user, action } = statusConfirmUser;

    try {
      if (action === 'deactivate') {
        await deactivateUser(user.id);
        toast.info(`${user.name} is now restricted from logging in.`);
      } else {
        await activateUser(user.id);
        toast.success(`${user.name}'s account access has been restored.`);
      }
      setStatusConfirmUser(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update account status.');
    }
  };

  // Soft delete submit
  const handleSoftDeleteSubmit = async () => {
    if (!deletingUser) return;
    setDeleteError(null);

    if (deleteConfirmEmail.trim().toLowerCase() !== deletingUser.email.trim().toLowerCase()) {
      setDeleteError(`Please type the exact email address (${deletingUser.email}) to confirm deletion.`);
      return;
    }

    if (!deleteReason.trim()) {
      setDeleteError('A formal deletion reason is required for compliance audit logging.');
      return;
    }

    try {
      await softDeleteUser({ id: deletingUser.id, reason: deleteReason.trim() });
      toast.success(
        `${deletingUser.name} has been archived. Past orders and audit trails remain preserved.`
      );
      setDeletingUser(null);
      setDeleteConfirmEmail('');
      setDeleteReason('');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || err.message || 'Failed to soft delete user account.');
    }
  };

  const accounts = data?.results || [];
  const counts = data?.tab_counts;

  return (
    <div className="space-y-6 pb-16 animate-fadeIn max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#EAE5DB] pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2E4D34] bg-[#EAF1EA] px-2.5 py-1 rounded-md">
            People & Identity Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#223B28] mt-2">
            Customer Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6D61] mt-1">
            Manage account profiles, roles, email and phone verification, and account security.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#D1DDD0] bg-white text-xs font-semibold text-[#223B28] hover:bg-[#FAF7F2] transition-colors disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canCreate('customers') && (
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(true);
                setCreateError(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create New User</span>
            </button>
          )}
        </div>
      </div>

      {/* Security & Superuser Notice Card */}
      <div className="bg-[#FAF3E0] border border-[#F3E2B8] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#8A5A00]">
        <div className="flex items-start sm:items-center gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-[#8A5A00] mt-0.5 sm:mt-0" />
          <span>
            <strong>Zero-Knowledge Security:</strong> Passwords are never shown. Only the user can set or change their password via cryptographically signed invitation or reset links.
          </span>
        </div>
        {isSuperAdmin && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-200/60 text-amber-900 text-[10px] font-bold uppercase tracking-wider shrink-0 border border-amber-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            Superuser privileges active
          </span>
        )}
      </div>

      {/* Tabs with Counts */}
      <div className="flex items-center border-b border-[#EAE5DB] gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange('customers')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            tab === 'customers'
              ? 'border-[#2E4D34] text-[#2E4D34]'
              : 'border-transparent text-[#5F6D61] hover:text-[#223B28]'
          }`}
        >
          <span>Customers</span>
          {counts && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF1EA] text-[#2E4D34]">
              {counts.customers}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('staff_admins')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            tab === 'staff_admins'
              ? 'border-[#2E4D34] text-[#2E4D34]'
              : 'border-transparent text-[#5F6D61] hover:text-[#223B28]'
          }`}
        >
          <span>Staff & Admins</span>
          {counts && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF3E0] text-[#8A5A00]">
              {counts.staff_admins}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('all_accounts')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            tab === 'all_accounts'
              ? 'border-[#2E4D34] text-[#2E4D34]'
              : 'border-transparent text-[#5F6D61] hover:text-[#223B28]'
          }`}
        >
          <span>All Accounts</span>
          {counts && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
              {counts.all_accounts}
            </span>
          )}
        </button>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => handleTabChange('deleted')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              tab === 'deleted'
                ? 'border-[#9E2A2B] text-[#9E2A2B]'
                : 'border-transparent text-[#8E9B90] hover:text-[#9E2A2B]'
            }`}
          >
            <span>Deleted</span>
            {counts && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                {counts.deleted}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Toolbar: Search, Role, Status, Page Size */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9B90]" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#D1DDD0] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] bg-[#FAF7F2]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => updateParams({ role: e.target.value, page: 1 })}
            className="text-xs px-3 py-2 rounded-xl border border-[#D1DDD0] bg-white text-[#223B28] focus:outline-none focus:ring-2 focus:ring-[#2E4D34]"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor / Seller</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
            className="text-xs px-3 py-2 rounded-xl border border-[#D1DDD0] bg-white text-[#223B28] focus:outline-none focus:ring-2 focus:ring-[#2E4D34]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
            <option value="locked">Locked</option>
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => updateParams({ page_size: e.target.value, page: 1 })}
            className="text-xs px-3 py-2 rounded-xl border border-[#D1DDD0] bg-white text-[#223B28] focus:outline-none focus:ring-2 focus:ring-[#2E4D34]"
          >
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>

      {/* Accounts DataTable & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-xs text-red-600">
            Failed to load customer accounts. Please check your network connection and retry.
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              title="No Accounts Found"
              description="No user profiles match the selected filter criteria or search parameters."
              action={{
                label: 'Clear Filters',
                onClick: () => updateParams({ search: '', role: 'all', status: 'all', page: 1 }),
              }}
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF7F2] text-[#8E9B90] border-b border-[#EAE5DB] uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">User & Contact</th>
                    <th className="py-3 px-4">Role & Access</th>
                    <th className="py-3 px-4">Verifications</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDE6] text-[#223B28]">
                  {accounts.map((user) => {
                    const isSelf = admin?.id === user.id || admin?.email === user.email;
                    const isSuperAdminAccount = user.role === 'admin' || user.role_name === 'Super Admin';
                    const canEditThisUser =
                      canEdit('customers') &&
                      (!isSuperAdminAccount || isSuperAdmin) &&
                      !(isSelf && user.role === 'admin');
                    const canDeleteThisUser =
                      canDelete('customers') &&
                      !isSelf &&
                      !isSuperAdminAccount;

                    return (
                      <tr key={user.id} className="hover:bg-[#FDFCF9] transition-colors">
                        {/* User & Contact */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-xs text-[#223B28]">{user.name}</div>
                          <div className="text-[11px] text-[#5F6D61] flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-[#8E9B90]" />
                            <span>{isSuperAdmin ? user.email : user.email_masked}</span>
                          </div>
                          <div className="text-[11px] text-[#8E9B90] flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-[#8E9B90]" />
                            <span>{user.phone || 'No phone'}</span>
                          </div>
                        </td>

                        {/* Role & Access */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              user.role === 'admin'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : user.role === 'staff'
                                ? 'bg-blue-50 text-blue-900 border-blue-200'
                                : user.role === 'vendor'
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                            }`}
                          >
                            {user.role_name || user.role}
                          </span>
                          {user.role === 'vendor' && user.store_name && (
                            <Link
                              to={`/admin/people/sellers?search=${encodeURIComponent(user.store_name)}`}
                              className="text-[11px] text-[#2E4D34] hover:underline flex items-center gap-1 mt-1 font-medium"
                            >
                              <Store className="w-3 h-3" />
                              <span>{user.store_name}</span>
                            </Link>
                          )}
                        </td>

                        {/* Verifications */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              {user.email_verified ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Email verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[#8E9B90]">
                                  <XCircle className="w-3.5 h-3.5 text-gray-400" />
                                  Email unverified
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              {user.phone_verified ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Phone verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[#8E9B90]">
                                  <XCircle className="w-3.5 h-3.5 text-gray-400" />
                                  Phone unverified
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              user.status === 'active'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : user.status === 'deactivated'
                                ? 'bg-gray-100 text-gray-700 border-gray-300'
                                : user.status === 'deleted'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-4 text-[11px] text-[#5F6D61]">
                          {new Date(user.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Active / Deactivate */}
                            {!user.is_deleted && !isSelf && (
                              <button
                                type="button"
                                onClick={() =>
                                  setStatusConfirmUser({
                                    user,
                                    action: user.status === 'active' ? 'deactivate' : 'activate',
                                  })
                                }
                                title={user.status === 'active' ? 'Deactivate account' : 'Activate account'}
                                className="p-1.5 text-[#5F6D61] hover:text-[#223B28] hover:bg-[#FAF7F2] rounded-lg transition-colors"
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Edit Profile */}
                            {!user.is_deleted && canEditThisUser && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUser(user);
                                  setEditForm({
                                    name: user.name,
                                    phone: user.phone || '',
                                    role: user.role,
                                  });
                                  setEditError(null);
                                }}
                                title="Edit user profile & permissions"
                                className="p-1.5 text-[#5F6D61] hover:text-[#2E4D34] hover:bg-[#FAF7F2] rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Soft Delete */}
                            {!user.is_deleted && canDeleteThisUser && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingUser(user);
                                  setDeleteConfirmEmail('');
                                  setDeleteReason('');
                                  setDeleteError(null);
                                }}
                                title="Soft delete account"
                                className="p-1.5 text-[#5F6D61] hover:text-[#9E2A2B] hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden divide-y divide-[#EAE5DB]">
              {accounts.map((user) => {
                const isSelf = admin?.id === user.id || admin?.email === user.email;
                const isSuperAdminAccount = user.role === 'admin' || user.role_name === 'Super Admin';
                const canEditThisUser =
                  canEdit('customers') && (!isSuperAdminAccount || isSuperAdmin) && !(isSelf && user.role === 'admin');

                return (
                  <div key={user.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-xs text-[#223B28]">{user.name}</h3>
                        <p className="text-[11px] text-[#5F6D61]">{isSuperAdmin ? user.email : user.email_masked}</p>
                        <p className="text-[11px] text-[#8E9B90]">{user.phone || 'No phone'}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          user.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}
                      >
                        {user.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#F0EDE6]">
                      <span className="font-medium text-[#5F6D61]">Role: {user.role_name || user.role}</span>
                      <div className="flex items-center gap-2">
                        {canEditThisUser && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(user);
                              setEditForm({ name: user.name, phone: user.phone || '', role: user.role });
                            }}
                            className="text-xs font-semibold text-[#2E4D34]"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-[#EAE5DB] bg-[#FAF7F2]">
              <Pagination
                currentPage={page}
                totalItems={data?.count || 0}
                pageSize={pageSize}
                onPageChange={(p) => updateParams({ page: p })}
              />
            </div>
          </>
        )}
      </div>

      {/* CREATE NEW USER INVITATION MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#EAE5DB] shadow-2xl p-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#EAE5DB] pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#223B28]">Invite New User</h2>
                <p className="text-xs text-[#8E9B90]">
                  Dispatches a single-use setup link for the user to securely set their password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-[#8E9B90] hover:text-[#223B28] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Radhika Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="radhika@example.in"
                  className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">
                  Account Role *
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserAccountRole })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none bg-white"
                >
                  <option value="customer">Customer (Buyer)</option>
                </select>
                <p className="text-[10px] text-[#8E9B90] mt-1">
                  Staff logins are created from Staff &amp; Roles → Add Staff Member.
                </p>
              </div>

              <div className="pt-4 border-t border-[#EAE5DB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D1DDD0] text-xs font-semibold text-[#5F6D61] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] disabled:opacity-50 shadow-xs"
                >
                  {isCreating ? 'Sending Invite...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#EAE5DB] shadow-2xl p-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#EAE5DB] pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#223B28]">Edit Account Profile</h2>
                <p className="text-xs text-[#8E9B90]">
                  Modify profile information, adjust roles, or trigger administrative security actions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-[#8E9B90] hover:text-[#223B28] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">
                  Email Address (Immutable)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingUser.email}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                />
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">
                    Role & Permissions
                  </label>
                  <select
                    value={editForm.role}
                    disabled={editingUser.id === admin?.id}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserAccountRole })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none bg-white disabled:bg-gray-100"
                  >
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor / Seller</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Platform Super Admin</option>
                  </select>
                  {editingUser.id === admin?.id && (
                    <p className="text-[10px] text-amber-700 mt-1">
                      You cannot demote or alter your own administrator role.
                    </p>
                  )}
                </div>
              )}

              {/* Administrative Security Actions */}
              <div className="pt-3 border-t border-[#EAE5DB] space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                  Account Security Actions
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleForcePasswordReset(editingUser)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D1DDD0] hover:bg-[#FAF7F2] text-xs font-semibold text-[#223B28] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Force Password Reset</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSignOutSessions(editingUser)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D1DDD0] hover:bg-[#FAF7F2] text-xs font-semibold text-[#9E2A2B] transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#9E2A2B]" />
                    <span>Sign Out All Sessions</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[#EAE5DB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-[#D1DDD0] text-xs font-semibold text-[#5F6D61] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] disabled:opacity-50 shadow-xs"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOFT DELETE CONFIRM DIALOG */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-red-200 shadow-2xl p-6 animate-scaleUp">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#223B28]">Confirm Account Soft Deletion</h3>
                <p className="text-xs text-[#8E9B90]">Compliance & Audit Protected</p>
              </div>
            </div>

            <p className="text-xs text-[#5F6D61] leading-relaxed mb-4">
              This action will mark the account for <strong>{deletingUser.name}</strong> as soft-deleted. The user will be immediately locked out, but existing transaction history and records remain intact for compliance audits.
            </p>

            {deleteError && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {deleteError}
              </div>
            )}

            <div className="space-y-3 text-xs mb-5">
              <div>
                <label className="block text-[11px] font-bold text-[#5F6D61] mb-1">
                  Type user email to confirm: <strong className="text-[#223B28]">{deletingUser.email}</strong>
                </label>
                <input
                  type="text"
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  placeholder="Enter user email exactly"
                  className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5F6D61] mb-1">
                  Reason for Deletion (Required for Audit Log) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Account closure requested by user, GDPR compliance, or duplicate test account."
                  className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-xl border border-[#D1DDD0] text-xs font-semibold text-[#5F6D61] hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSoftDeleteSubmit}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-[#9E2A2B] text-white text-xs font-semibold hover:bg-red-800 disabled:opacity-50 shadow-xs"
              >
                {isDeleting ? 'Archiving...' : 'Soft Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVATE / DEACTIVATE CONFIRM DIALOG */}
      {statusConfirmUser && (
        <ConfirmDialog
          isOpen={true}
          title={statusConfirmUser.action === 'deactivate' ? 'Deactivate User Account' : 'Activate User Account'}
          message={`Are you sure you want to ${statusConfirmUser.action} access for ${statusConfirmUser.user.name} (${statusConfirmUser.user.email})?`}
          confirmText={statusConfirmUser.action === 'deactivate' ? 'Deactivate' : 'Activate'}
          isDanger={statusConfirmUser.action === 'deactivate'}
          onConfirm={handleToggleStatus}
          onClose={() => setStatusConfirmUser(null)}
        />
      )}
    </div>
  );
};

export default AdminCustomersPage;
