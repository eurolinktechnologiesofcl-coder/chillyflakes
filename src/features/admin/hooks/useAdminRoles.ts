import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminRoles,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  getAdminStaff,
  updateStaffRole,
  createAdminStaff,
  setAdminStaffActive,
  resetAdminStaffPassword,
  type CreateStaffPayload,
} from '../../../api/admin';
import type { PermissionKey } from '../../../types/admin';

export const ADMIN_ROLES_QUERY_KEY = ['admin', 'roles'] as const;
export const ADMIN_STAFF_QUERY_KEY = ['admin', 'staff'] as const;

export function useAdminRoles() {
  return useQuery({
    queryKey: ADMIN_ROLES_QUERY_KEY,
    queryFn: getAdminRoles,
    staleTime: 30 * 1000,
  });
}

export function useAdminStaff() {
  return useQuery({
    queryKey: ADMIN_STAFF_QUERY_KEY,
    queryFn: getAdminStaff,
    staleTime: 15 * 1000,
  });
}

export function useAdminRoleMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ADMIN_ROLES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ADMIN_STAFF_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['admin', 'audit-log'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const createRoleMutation = useMutation({
    mutationFn: (payload: { name: string; description: string; permissions: PermissionKey[] }) =>
      createAdminRole(payload),
    onSuccess: invalidate,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { name?: string; description?: string; permissions?: PermissionKey[] };
    }) => updateAdminRole(id, payload),
    onSuccess: invalidate,
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => deleteAdminRole(id),
    onSuccess: invalidate,
  });

  const changeStaffRoleMutation = useMutation({
    mutationFn: ({ staffId, role_id }: { staffId: string; role_id: string }) =>
      updateStaffRole(staffId, role_id),
    onSuccess: invalidate,
  });

  const createStaffMutation = useMutation({
    mutationFn: (payload: CreateStaffPayload) => createAdminStaff(payload),
    onSuccess: invalidate,
  });

  const setStaffActiveMutation = useMutation({
    mutationFn: ({ staffId, active }: { staffId: string; active: boolean }) => setAdminStaffActive(staffId, active),
    onSuccess: invalidate,
  });

  const resetStaffPasswordMutation = useMutation({
    mutationFn: ({ staffId, password }: { staffId: string; password: string }) =>
      resetAdminStaffPassword(staffId, password),
    onSuccess: invalidate,
  });

  return {
    createRole: createRoleMutation.mutateAsync,
    isCreatingRole: createRoleMutation.isPending,
    updateRole: updateRoleMutation.mutateAsync,
    isUpdatingRole: updateRoleMutation.isPending,
    deleteRole: deleteRoleMutation.mutateAsync,
    isDeletingRole: deleteRoleMutation.isPending,
    changeStaffRole: changeStaffRoleMutation.mutateAsync,
    isChangingStaffRole: changeStaffRoleMutation.isPending,
    createStaff: createStaffMutation.mutateAsync,
    isCreatingStaff: createStaffMutation.isPending,
    setStaffActive: setStaffActiveMutation.mutateAsync,
    isTogglingStaff: setStaffActiveMutation.isPending,
    resetStaffPassword: resetStaffPasswordMutation.mutateAsync,
  };
}
