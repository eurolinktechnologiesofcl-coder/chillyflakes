export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DashboardSummaryChanges {
  total_sales_pct: number;
  orders_today_pct: number;
  pending_orders_diff: number;
  available_balance_pct: number;
}

export interface DashboardSummary {
  total_sales_paise: number;
  orders_today: number;
  pending_orders: number;
  low_stock_count: number;
  available_balance_paise: number;
  pending_payout_paise: number;
  changes: DashboardSummaryChanges;
}

export type SalesChartRange = '7' | '30' | '90';

export interface SalesChartPoint {
  date: string;
  sales_paise: number;
  orders: number;
}

export interface SalesChartResponse {
  range: SalesChartRange;
  points: SalesChartPoint[];
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface RecentOrder {
  id: string;
  order_number: string;
  customer_first_name: string;
  amount_paise: number;
  status: OrderStatus;
  date: string;
}

export interface LowStockItem {
  id: string;
  product_name: string;
  stock_left: number;
  threshold: number;
  category: string;
  image_url?: string;
}

export interface RecentReview {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  product_name: string;
  date: string;
}

export type AlertType = 'info' | 'warning' | 'error' | 'success';

export interface VendorAlert {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  created_at: string;
  action_url?: string;
}
