import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getRecentOrders } from '../../../api/vendorDashboard';
import type { PaginatedResponse, RecentOrder } from '../../../types/dashboard';
import type { NormalizedApiError } from '../../../types/auth';

export const recentOrdersQueryKey = (page: number, pageSize: number) =>
  ['vendor', 'dashboard', 'recent-orders', page, pageSize] as const;

export function useRecentOrders(
  page: number = 1,
  pageSize: number = 5
): UseQueryResult<PaginatedResponse<RecentOrder>, NormalizedApiError> {
  return useQuery<PaginatedResponse<RecentOrder>, NormalizedApiError>({
    queryKey: recentOrdersQueryKey(page, pageSize),
    queryFn: () => getRecentOrders(page, pageSize),
    staleTime: 30 * 1000,
    retry: 1,
  });
}
