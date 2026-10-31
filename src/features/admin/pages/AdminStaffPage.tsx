import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Lock,
  CheckCircle2,
  X,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useAdminRoles, useAdminStaff, useAdminRoleMutations } from '../hooks/useAdminRoles';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../../../components/vendor/Toast';
import { ConfirmDialog } from '../../../components/vendor/ConfirmDialog';
import { Skeleton } from '../../../components/vendor/Skeleton';
import type { AdminRole, AdminStaffUser, AdminModule, AdminAction, PermissionKey } from '../../../types/admin';

const MODULES: { key: AdminModule; label: string }[] = [
  { key: 'overview', label: 'Marketplace Overview' },
  { key: 'customers', label: 'Customers' },
  { key: 'sellers', label: 'Vendor & Seller Hub' },
  { key: 'products', label: 'Catalog Products' },
  { key: 'categories', label: 'Categories' },
  { key: 'orders', label: 'Orders' },
  { key: 'refunds', label: 'Refunds & Returns' },
  { key: 'payouts', label: 'Finance & Payouts' },
  { key: 'settings', label: 'Store Settings' },
  { key: 'audit_log', label: 'Audit Log' },
  { key: 'staff_roles', label: 'Staff & Role Permissions' },
];

const ACTIONS: { key: AdminAction; label: string }[] = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'decide', label: 'Decide / Approve' },
  { key: 'delete', label: 'Delete' },
  { key: 'export', label: 'Export' },
];

export const AdminStaffPage: React.FC = () => {
  const toast = useToast();
  const { admin } = useAdminAuth();
  const { isSuperAdmin } = usePermission();

  const [activeTab, setActiveTab] = useState<'staff' | 'roles'>('staff');

  // Queries
  const { data: staffList = [], isLoading: isStaffLoading, refetch: refetchStaff } = useAdminStaff();
  const { data: roles = [], refetch: refetchRoles } = useAdminRoles();

  // Mutations
  const {
    createRole,
    isCreatingRole,
    updateRole,
    isUpdatingRole,
    deleteRole,
    isDeletingRole,
    changeStaffRole,
    isChangingStaffRole,
    createStaff,
    isCreatingStaff,
    setStaffActive,
    isTogglingStaff,
    resetStaffPassword,
  } = useAdminRoleMutations();

  // Add staff modal
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', phone: '', role_id: '', password: '' });
  const [staffFormError, setStaffFormError] = useState<string | null>(null);

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFormError(null);
    try {
      await createStaff({
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone.trim(),
        role_id: staffForm.role_id,
        password: staffForm.password,
      });
      toast.success(`${staffForm.name} can now sign in at /admin/login with ${staffForm.email.trim()}.`);
      setIsAddStaffOpen(false);
      setStaffForm({ name: '', email: '', phone: '', role_id: '', password: '' });
    } catch (err: any) {
      setStaffFormError(err.response?.data?.message || err.message || 'Failed to create staff member.');
    }
  };

  const handleToggleStaff = async (user: AdminStaffUser) => {
    const activate = user.status !== 'active';
    try {
      await setStaffActive({ staffId: user.id, active: activate });
      toast.success(`${user.name} has been ${activate ? 'reactivated' : 'deactivated'}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update staff status.');
    }
  };

  const handleResetPassword = async (user: AdminStaffUser) => {
    const password = window.prompt(`New login password for ${user.name} (min 6 characters):`);
    if (!password) return;
    try {
      await resetStaffPassword({ staffId: user.id, password });
      toast.success(`Password updated for ${user.name}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not reset password.');
    }
  };

  // Staff role assignment modal
  const [assigningStaff, setAssigningStaff] = useState<AdminStaffUser | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  // Role Edit/Create modal
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [roleForm, setRoleForm] = useState<{
    name: string;
    description: string;
    permissions: PermissionKey[];
  }>({
    name: '',
    description: '',
    permissions: [],
  });
  const [roleFormError, setRoleFormError] = useState<string | null>(null);

  // Role Delete Confirm
  const [deletingRole, setDeletingRole] = useState<AdminRole | null>(null);

  // Selected role for inspecting permissions matrix in Roles tab
  const [selectedMatrixRoleId, setSelectedMatrixRoleId] = useState<string>('role_super_admin');

  const activeMatrixRole = roles.find((r) => r.id === selectedMatrixRoleId) || roles[0];

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleFormError(null);

    if (!roleForm.name.trim() || !roleForm.description.trim()) {
      setRoleFormError('Role title and description are required.');
      return;
    }

    try {
      if (editingRole) {
        await updateRole({
          id: editingRole.id,
          payload: {
            name: roleForm.name.trim(),
            description: roleForm.description.trim(),
            permissions: roleForm.permissions,
          },
        });
        toast.success(`Successfully updated role: ${roleForm.name}`);
        setEditingRole(null);
      } else {
        await createRole({
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          permissions: roleForm.permissions,
        });
        toast.success(`Successfully created new role: ${roleForm.name}`);
        setIsCreateRoleOpen(false);
      }
      setRoleForm({ name: '', description: '', permissions: [] });
    } catch (err: any) {
      setRoleFormError(err.response?.data?.message || err.message || 'Failed to save role.');
    }
  };

  const handleAssignRoleSubmit = async () => {
    if (!assigningStaff || !selectedRoleId) return;

    try {
      await changeStaffRole({ staffId: assigningStaff.id, role_id: selectedRoleId });
      toast.success(
        `Assigned ${roles.find((r) => r.id === selectedRoleId)?.name} to ${assigningStaff.name}.`
      );
      setAssigningStaff(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not change staff role.');
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;

    try {
      await deleteRole(deletingRole.id);
      toast.success(`Custom role "${deletingRole.name}" was removed.`);
      setDeletingRole(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete role.');
    }
  };

  // Helper: describe what a role can do in plain language
  const getRoleCapabilitiesSummary = (role?: AdminRole): string[] => {
    if (!role) return [];
    if (role.is_system && role.id === 'role_super_admin') {
      return [
        'Full, unrestricted authority over all marketplace modules, configurations, and data.',
        'Can invite, manage, and assign roles to all staff and platform administrators.',
        'Has permanent access to full compliance audit trails and sensitive data decryption.',
      ];
    }

    const caps: string[] = [];
    const perms = role.permissions as string[];

    if (perms.includes('sellers:decide') || perms.includes('sellers:*')) {
      caps.push('Review and approve or reject merchant onboarding applications and KYC credentials.');
    } else if (perms.includes('sellers:view')) {
      caps.push('View merchant onboarding details and submitted documents (read-only).');
    }

    if (perms.includes('products:decide') || perms.includes('products:*')) {
      caps.push('Inspect, approve, or reject vendor catalog listings submitted for review.');
    } else if (perms.includes('products:view')) {
      caps.push('Browse vendor catalog submissions in read-only mode.');
    }

    if (perms.includes('categories:create') || perms.includes('categories:edit')) {
      caps.push('Create, rename, structure subcategories, and toggle marketplace categories.');
    }

    if (perms.includes('customers:edit')) {
      caps.push('Edit customer contact records and trigger security password resets.');
    }

    if (perms.includes('audit_log:view')) {
      caps.push('Inspect the immutable platform audit log.');
    }

    if (caps.length === 0) {
      caps.push('Limited read access to designated public store operational views.');
    }

    return caps;
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#EAE5DB] pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2E4D34] bg-[#EAF1EA] px-2.5 py-1 rounded-md">
            Security & Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#223B28] mt-2">
            Staff & Role Permissions
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6D61] mt-1">
            Assign staff responsibilities, configure fine-grained module access, and inspect role capabilities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              refetchStaff();
              refetchRoles();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#D1DDD0] bg-white text-xs font-semibold text-[#223B28] hover:bg-[#FAF7F2] transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {isSuperAdmin && activeTab === 'staff' && (
            <button
              type="button"
              id="admin-add-staff"
              onClick={() => {
                setStaffForm({ name: '', email: '', phone: '', role_id: roles.find((r) => r.id !== 'role_super_admin')?.id || '', password: '' });
                setStaffFormError(null);
                setIsAddStaffOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          )}

          {isSuperAdmin && activeTab === 'roles' && (
            <button
              type="button"
              onClick={() => {
                setEditingRole(null);
                setRoleForm({ name: '', description: '', permissions: [] });
                setRoleFormError(null);
                setIsCreateRoleOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-[#EAE5DB] gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'staff'
              ? 'border-[#2E4D34] text-[#2E4D34]'
              : 'border-transparent text-[#5F6D61] hover:text-[#223B28]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'roles'
              ? 'border-[#2E4D34] text-[#2E4D34]'
              : 'border-transparent text-[#5F6D61] hover:text-[#223B28]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Roles & Permissions Matrix ({roles.length})</span>
        </button>
      </div>

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-2xl border border-[#EAE5DB] shadow-xs overflow-hidden">
          {isStaffLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF7F2] text-[#8E9B90] border-b border-[#EAE5DB] uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDE6] text-[#223B28]">
                  {staffList.map((user) => {
                    const isSelf = admin?.id === user.id || admin?.email === user.email;
                    return (
                      <tr key={user.id} className="hover:bg-[#FDFCF9] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-xs text-[#223B28]">{user.name}</div>
                          <div className="text-[11px] text-[#5F6D61]">{user.email}</div>
                          {user.phone && <div className="text-[10px] text-[#8E9B90]">{user.phone}</div>}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              user.role_name === 'Super Admin'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-blue-50 text-blue-900 border-blue-200'
                            }`}
                          >
                            {user.role_name}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              user.status === 'active'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[11px] text-[#5F6D61]">
                          {user.last_login ? new Date(user.last_login).toLocaleString('en-IN') : 'Never'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isSuperAdmin && !isSelf && (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setAssigningStaff(user);
                                  setSelectedRoleId(user.role_id);
                                }}
                                className="px-3 py-1.5 rounded-xl border border-[#D1DDD0] hover:bg-[#FAF7F2] text-xs font-semibold text-[#2E4D34] transition-colors"
                              >
                                Change Role
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResetPassword(user)}
                                className="px-3 py-1.5 rounded-xl border border-[#D1DDD0] hover:bg-[#FAF7F2] text-xs font-semibold text-[#5F6D61] transition-colors"
                              >
                                Reset Password
                              </button>
                              <button
                                type="button"
                                disabled={isTogglingStaff}
                                onClick={() => handleToggleStaff(user)}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50 ${
                                  user.status === 'active'
                                    ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {user.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          )}
                          {isSelf && (
                            <span className="text-[10px] text-[#8E9B90] font-semibold italic">
                              Current Account
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS MATRIX */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Roles Selector & Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roles List */}
            <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9B90] block mb-2 px-1">
                Marketplace Roles
              </span>

              {roles.map((role) => {
                const isSelected = role.id === selectedMatrixRoleId;
                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedMatrixRoleId(role.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#2E4D34] bg-[#EAF1EA]/50 text-[#2E4D34] font-semibold'
                        : 'border-[#F0EDE6] hover:border-[#D1DDD0] bg-white text-[#5F6D61]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#223B28]">{role.name}</span>
                        {role.is_system && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 border border-gray-200">
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8E9B90] mt-0.5">{role.user_count} staff assigned</p>
                    </div>

                    <div className="flex items-center gap-1">
                      {isSuperAdmin && !role.is_system && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRole(role);
                              setRoleForm({
                                name: role.name,
                                description: role.description,
                                permissions: role.permissions,
                              });
                              setIsCreateRoleOpen(true);
                            }}
                            className="p-1 text-[#8E9B90] hover:text-[#2E4D34] rounded"
                            title="Edit role"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {role.user_count === 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingRole(role);
                              }}
                              className="p-1 text-[#8E9B90] hover:text-[#9E2A2B] rounded"
                              title="Delete role"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                      <ChevronRight className="w-4 h-4 text-[#8E9B90]" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* "What Can This Role Do?" Plain Language Summary */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#F0EDE6] pb-3 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#223B28]">{activeMatrixRole.name}</h3>
                    <p className="text-xs text-[#8E9B90]">{activeMatrixRole.description}</p>
                  </div>
                  {activeMatrixRole.is_system && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Locked System Role
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9B90] block">
                    What can this role do? (Plain Language Summary)
                  </span>
                  <div className="space-y-1.5">
                    {getRoleCapabilitiesSummary(activeMatrixRole).map((desc, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[#223B28]">
                        <CheckCircle2 className="w-4 h-4 text-[#2E4D34] mt-0.5 shrink-0" />
                        <span>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE5DB] text-[11px] text-[#5F6D61] mt-4">
                <strong>Enforcement:</strong> Permission rules apply in the web application UI and are strictly verified on every server API request.
              </div>
            </div>
          </div>

          {/* Permissions Matrix Table */}
          <div className="bg-white rounded-2xl border border-[#EAE5DB] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EAE5DB] bg-[#FAF7F2] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#223B28] uppercase tracking-wider">
                  Module Action Matrix for: {activeMatrixRole.name}
                </h3>
                <p className="text-[11px] text-[#8E9B90]">
                  Permissions assigned to {activeMatrixRole.name}. Checkmarks denote permitted actions.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF7F2] text-[#8E9B90] border-b border-[#EAE5DB] uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Marketplace Module</th>
                    {ACTIONS.map((action) => (
                      <th key={action.key} className="py-3 px-3 text-center">
                        {action.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDE6] text-[#223B28]">
                  {MODULES.map((module) => {
                    return (
                      <tr key={module.key} className="hover:bg-[#FDFCF9] transition-colors">
                        <td className="py-3 px-4 font-semibold text-xs text-[#223B28]">
                          {module.label}
                        </td>
                        {ACTIONS.map((action) => {
                          const permKey: PermissionKey = `${module.key}:${action.key}`;
                          const isPermitted =
                            activeMatrixRole.id === 'role_super_admin' ||
                            activeMatrixRole.permissions.includes(permKey);

                          return (
                            <td key={action.key} className="py-3 px-3 text-center">
                              {isPermitted ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span className="inline-block w-2 h-0.5 bg-gray-200 rounded" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN ROLE TO STAFF MODAL */}
      {assigningStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#EAE5DB] shadow-2xl p-6 animate-scaleUp">
            <h3 className="text-base font-bold text-[#223B28] mb-1">
              Change Staff Role: {assigningStaff.name}
            </h3>
            <p className="text-xs text-[#8E9B90] mb-4">
              Updating a role will instantly adjust the permissions active for this staff account.
            </p>

            <div className="space-y-4 text-xs mb-6">
              <div>
                <label className="block text-[11px] font-bold text-[#5F6D61] mb-1">
                  Select New Role
                </label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none bg-white"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.is_system ? '(System)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssigningStaff(null)}
                className="px-4 py-2 rounded-xl border border-[#D1DDD0] text-xs font-semibold text-[#5F6D61]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignRoleSubmit}
                disabled={isChangingStaffRole}
                className="px-5 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] shadow-xs"
              >
                {isChangingStaffRole ? 'Updating...' : 'Assign Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ROLE MODAL */}
      {isCreateRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-[#EAE5DB] shadow-2xl p-6 my-8 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#EAE5DB] pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#223B28]">
                  {editingRole ? `Edit Role: ${editingRole.name}` : 'Create Custom Role'}
                </h3>
                <p className="text-xs text-[#8E9B90]">
                  Configure permissions by checking allowable actions across each marketplace module.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateRoleOpen(false)}
                className="p-1.5 text-[#8E9B90] hover:text-[#223B28] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {roleFormError && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {roleFormError}
              </div>
            )}

            <form onSubmit={handleRoleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#5F6D61] mb-1">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="e.g. Catalog Auditor"
                    className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#5F6D61] mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    placeholder="Short description of operational duties"
                    className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                  />
                </div>
              </div>

              {/* Permissions Checkbox Grid */}
              <div className="border border-[#EAE5DB] rounded-2xl p-4 bg-[#FAF7F2] max-h-72 overflow-y-auto space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9B90] block">
                  Permissions Matrix
                </span>

                <div className="space-y-3">
                  {MODULES.map((mod) => (
                    <div key={mod.key} className="p-2.5 rounded-xl bg-white border border-[#F0EDE6] space-y-1.5">
                      <span className="font-bold text-xs text-[#223B28] block">{mod.label}</span>
                      <div className="flex flex-wrap gap-3">
                        {ACTIONS.map((act) => {
                          const pKey: PermissionKey = `${mod.key}:${act.key}`;
                          const isChecked = roleForm.permissions.includes(pKey);

                          return (
                            <label key={act.key} className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRoleForm({
                                      ...roleForm,
                                      permissions: [...roleForm.permissions, pKey],
                                    });
                                  } else {
                                    setRoleForm({
                                      ...roleForm,
                                      permissions: roleForm.permissions.filter((p) => p !== pKey),
                                    });
                                  }
                                }}
                                className="rounded border-[#D1DDD0] text-[#2E4D34] focus:ring-[#2E4D34]"
                              />
                              <span className="text-[11px] capitalize">{act.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#EAE5DB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateRoleOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D1DDD0] text-xs font-semibold text-[#5F6D61]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRole || isUpdatingRole}
                  className="px-5 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] shadow-xs"
                >
                  {isCreatingRole || isUpdatingRole ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ROLE CONFIRM */}
      {deletingRole && (
        <ConfirmDialog
          isOpen={true}
          title={`Delete Role: ${deletingRole.name}`}
          message={`Are you sure you want to delete the "${deletingRole.name}" role? This action cannot be undone.`}
          confirmText="Delete Role"
          isDanger={true}
          isLoading={isDeletingRole}
          onConfirm={handleDeleteRole}
          onClose={() => setDeletingRole(null)}
        />
      )}

      {/* ADD STAFF MODAL */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#EAE5DB] shadow-2xl p-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#EAE5DB] pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#223B28]">Add Staff Member</h2>
                <p className="text-xs text-[#8E9B90]">Creates a working admin console login with the selected role.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(false)}
                className="p-1.5 text-[#8E9B90] hover:text-[#223B28] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {staffFormError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{staffFormError}</div>
            )}

            <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    id="staff-name"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">Phone</label>
                  <input
                    type="tel"
                    id="staff-phone"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">Login Email *</label>
                <input
                  type="email"
                  required
                  id="staff-email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">Role *</label>
                  <select
                    required
                    id="staff-role"
                    value={staffForm.role_id}
                    onChange={(e) => setStaffForm({ ...staffForm, role_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none bg-white"
                  >
                    <option value="" disabled>
                      Select a role
                    </option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    id="staff-password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] font-mono focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#EAE5DB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D1DDD0] text-xs font-semibold text-[#5F6D61]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStaff}
                  className="px-5 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] shadow-xs disabled:opacity-50"
                >
                  {isCreatingStaff ? 'Creating...' : 'Create Staff Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffPage;
