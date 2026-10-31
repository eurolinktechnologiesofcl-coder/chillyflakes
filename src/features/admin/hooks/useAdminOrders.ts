import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminOrders,
  updateAdminOrderStatus,
  resolveAdminOrderReturn,
  type AdminOrderFilterParams,
} from '../../../api/admin';
import type { AdminOrderListResponse, AdminOrder, AdminOrderStatus } from '../../../types/admin';

export const ADMIN_ORDERS_QUERY_KEY = ['admin', 'orders'] as const;

export function useAdminOrders(params?: AdminOrderFilterParams) {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery<AdminOrderListResponse>({
    queryKey: [...ADMIN_ORDERS_QUERY_KEY, params],
    queryFn: () => getAdminOrders(params),
    staleTime: 30 * 1000,
  });

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'finance'] });
  };

  const updateStatusMutation = useMutation<
    AdminOrder,
    Error,
    { id: string; payload: { order_status?: AdminOrderStatus; courier_partner?: string; tracking_number?: string } }
  >({
    mutationFn: ({ id, payload }) => updateAdminOrderStatus(id, payload),
    onSuccess: invalidateOrders,
  });

  const resolveReturnMutation = useMutation<
    AdminOrder,
    Error,
    { id: string; payload: { action: 'approve_refund' | 'reject_return'; reason?: string } }
  >({
    mutationFn: ({ id, payload }) => resolveAdminOrderReturn(id, payload),
    onSuccess: invalidateOrders,
  });

  return {
    ...ordersQuery,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
    resolveReturn: resolveReturnMutation.mutateAsync,
    isResolvingReturn: resolveReturnMutation.isPending,
  };
}
