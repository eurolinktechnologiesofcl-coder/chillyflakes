import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getRecentReviews } from '../../../api/vendorDashboard';
import type { PaginatedResponse, RecentReview } from '../../../types/dashboard';
import type { NormalizedApiError } from '../../../types/auth';

export const recentReviewsQueryKey = (page: number, pageSize: number, fail?: string) =>
  ['vendor', 'dashboard', 'recent-reviews', page, pageSize, fail] as const;

export function useRecentReviews(
  page: number = 1,
  pageSize: number = 5,
  fail?: string
): UseQueryResult<PaginatedResponse<RecentReview>, NormalizedApiError> {
  return useQuery<PaginatedResponse<RecentReview>, NormalizedApiError>({
    queryKey: recentReviewsQueryKey(page, pageSize, fail),
    queryFn: () => getRecentReviews(page, pageSize, fail),
    staleTime: 60 * 1000,
    retry: 0, // 0 retries to make fail=reviews test instantly responsive
  });
}
