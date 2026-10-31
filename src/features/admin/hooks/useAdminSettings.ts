import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminPlatformSettings, updateAdminPlatformSettings } from '../../../api/admin';
import type { AdminPlatformSettings } from '../../../types/admin';

export const ADMIN_SETTINGS_QUERY_KEY = ['admin', 'settings'] as const;

export function useAdminSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<AdminPlatformSettings>({
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    queryFn: getAdminPlatformSettings,
    staleTime: 60 * 1000,
  });

  const updateSettingsMutation = useMutation<AdminPlatformSettings, Error, Partial<AdminPlatformSettings>>({
    mutationFn: (payload: Partial<AdminPlatformSettings>) => updateAdminPlatformSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });

  return {
    ...settingsQuery,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdatingSettings: updateSettingsMutation.isPending,
  };
}
