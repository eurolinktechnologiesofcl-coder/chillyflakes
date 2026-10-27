import { axiosClient } from './client';
import type {
  DashboardSummary,
  SalesChartResponse,
  SalesChartRange,
  PaginatedResponse,
  RecentOrder,
  LowStockItem,
  RecentReview,
  VendorAlert,
} from '../types/dashboard';

/**
 * GET /api/v1/vendor/dashboard/summary/
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await axiosClient.get<DashboardSummary>('/api/v1/vendor/dashboard/summary/');
  return response.data;
}

/**
 * GET /api/v1/vendor/dashboard/sales-chart/?range=7|30|90
 */
export async function getSalesChart(range: SalesChartRange = '30'): Promise<SalesChartResponse> {
  const response = await axiosClient.get<SalesChartResponse>('/api/v1/vendor/dashboard/sales-chart/', {
    params: { range },
  });
  return response.data;
}

/**
 * GET /api/v1/vendor/dashboard/recent-orders/
 */
export async function getRecentOrders(
  page: number = 1,
  pageSize: number = 5
): Promise<PaginatedResponse<RecentOrder>> {
  const response = await axiosClient.get<PaginatedResponse<RecentOrder>>(
    '/api/v1/vendor/dashboard/recent-orders/',
    {
      params: { page, page_size: pageSize },
    }
  );
  return response.data;
}

/**
 * GET /api/v1/vendor/dashboard/low-stock/
 */
export async function getLowStockItems(
  page: number = 1,
  pageSize: number = 5
): Promise<PaginatedResponse<LowStockItem>> {
  const response = await axiosClient.get<PaginatedResponse<LowStockItem>>(
    '/api/v1/vendor/dashboard/low-stock/',
    {
      params: { page, page_size: pageSize },
    }
  );
  return response.data;
}

/**
 * GET /api/v1/vendor/dashboard/recent-reviews/
 * Pass failParam or read from current window location to test failure state (?fail=reviews)
 */
export async function getRecentReviews(
  page: number = 1,
  pageSize: number = 5,
  failParam?: string
): Promise<PaginatedResponse<RecentReview>> {
  let fail = failParam;
  if (!fail && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    fail = params.get('fail') || undefined;
  }

  const response = await axiosClient.get<PaginatedResponse<RecentReview>>(
    '/api/v1/vendor/dashboard/recent-reviews/',
    {
      params: { page, page_size: pageSize, ...(fail ? { fail } : {}) },
    }
  );
  return response.data;
}

/**
 * GET /api/v1/vendor/dashboard/alerts/
 */
export async function getDashboardAlerts(): Promise<VendorAlert[]> {
  const response = await axiosClient.get<VendorAlert[]>('/api/v1/vendor/dashboard/alerts/');
  return response.data;
}
