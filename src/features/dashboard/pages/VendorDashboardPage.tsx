import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
  Plus,
  Calendar,
  Eye,
  Star,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

import { useAuth } from '../../../hooks/useAuth';
import { PageHeader } from '../../../components/vendor/PageHeader';
import { StatCard } from '../../../components/vendor/StatCard';
import { StatusBadge } from '../../../components/vendor/StatusBadge';
import { DataTable, type Column } from '../../../components/vendor/DataTable';
import { Pagination } from '../../../components/vendor/Pagination';
import { ErrorState } from '../../../components/vendor/ErrorState';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { Skeleton } from '../../../components/vendor/Skeleton';
import { Button } from '../../../components/ui/Button';

import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useSalesChart } from '../hooks/useSalesChart';
import { useRecentOrders } from '../hooks/useRecentOrders';
import { useLowStock } from '../hooks/useLowStock';
import { useRecentReviews } from '../hooks/useRecentReviews';
import { useDashboardAlerts } from '../hooks/useDashboardAlerts';

import { formatINR } from '../../../utils/currency';
import type { SalesChartRange, RecentOrder, LowStockItem } from '../../../types/dashboard';

export const VendorDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Range toggle for sales chart
  const [chartRange, setChartRange] = useState<SalesChartRange>('30');

  // Pagination for Recent Orders table
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersPageSize = 5;

  // Data queries
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useDashboardSummary();

  const {
    data: chartData,
    isLoading: isChartLoading,
    isError: isChartError,
    refetch: refetchChart,
  } = useSalesChart(chartRange);

  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    isError: isOrdersError,
    refetch: refetchOrders,
  } = useRecentOrders(ordersPage, ordersPageSize);

  const {
    data: lowStockData,
    isLoading: isLowStockLoading,
    isError: isLowStockError,
    refetch: refetchLowStock,
  } = useLowStock(1, 5);

  const {
    data: reviewsData,
    isLoading: isReviewsLoading,
    isError: isReviewsError,
    refetch: refetchReviews,
  } = useRecentReviews(1, 4);

  const {
    data: alertsData,
    isLoading: isAlertsLoading,
    isError: isAlertsError,
    refetch: refetchAlerts,
  } = useDashboardAlerts();

  // Check if account is in new/empty state
  const isNewVendorEmpty =
    !isSummaryLoading &&
    summary &&
    summary.total_sales_paise === 0 &&
    summary.orders_today === 0 &&
    summary.pending_orders === 0 &&
    (!ordersData || ordersData.count === 0);

  // Formatted chart points
  const formattedChartPoints = useMemo(() => {
    if (!chartData?.points) return [];
    return chartData.points.map((pt) => ({
      ...pt,
      salesRupees: pt.sales_paise / 100,
      formattedDate: new Date(pt.date).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [chartData]);

  // Total sales in selected chart period
  const totalPeriodSales = useMemo(() => {
    if (!formattedChartPoints.length) return 0;
    return formattedChartPoints.reduce((acc, cur) => acc + cur.sales_paise, 0);
  }, [formattedChartPoints]);

  // Columns for Recent Orders DataTable
  const orderColumns: Column<RecentOrder>[] = [
    {
      key: 'order_number',
      header: 'Order #',
      render: (order) => (
        <span className="font-semibold text-[#2E4D34] font-mono text-xs">
          {order.order_number}
        </span>
      ),
    },
    {
      key: 'customer_first_name',
      header: 'Customer',
      render: (order) => (
        <span className="font-medium text-[#223B28]">
          {order.customer_first_name}
        </span>
      ),
    },
    {
      key: 'amount_paise',
      header: 'Amount',
      render: (order) => (
        <span className="font-semibold text-[#223B28]">
          {formatINR(order.amount_paise)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <StatusBadge status={order.status} size="sm" />,
    },
    {
      key: 'date',
      header: 'Date',
      align: 'right',
      render: (order) => (
        <span className="text-xs text-[#8E9B90]">
          {new Date(order.date).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Page Header with Greeting & Quick Actions */}
      <PageHeader
        title={`${t('vendorDashboard.welcome', 'Welcome back')}, ${user?.full_name || 'Artisan Seller'}! 👋`}
        description={
          user?.store_name
            ? `Here is what is happening with ${user.store_name} today.`
            : 'Track your craft sales, live orders, inventory alerts, and conscious buyer feedback.'
        }
        actions={
          <>
            <Link to="/vendor/products">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {t('vendorDashboard.addProduct', 'Add Product')}
              </Button>
            </Link>
            <Link to="/vendor/services">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Calendar className="w-4 h-4" />}
              >
                {t('vendorDashboard.addService', 'Add Service')}
              </Button>
            </Link>
            <Link to="/vendor/orders">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Eye className="w-4 h-4" />}
              >
                {t('vendorDashboard.viewOrders', 'View Orders')}
              </Button>
            </Link>
          </>
        }
      />

      {/* ======================================================== */}
      {/* 1. SUMMARY STAT CARDS (6 CARDS) */}
      {/* ======================================================== */}
      <section aria-labelledby="summary-metrics-heading">
        <h2 id="summary-metrics-heading" className="sr-only">
          Store Performance Metrics
        </h2>

        {isSummaryError ? (
          <div className="p-6 bg-white rounded-2xl border border-[#EAE5DB]">
            <ErrorState
              title="Could not load summary figures"
              message="Failed to retrieve sales and balance details from the seller engine."
              onRetry={() => refetchSummary()}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 1. Total Sales */}
            <StatCard
              label="Total Sales"
              value={summary ? formatINR(summary.total_sales_paise ?? 0) : '₹0'}
              change={
                summary?.changes
                  ? { value: summary.changes.total_sales_pct ?? 0, label: 'vs last month' }
                  : undefined
              }
              icon={<TrendingUp className="w-5 h-5" />}
              isLoading={isSummaryLoading}
            />

            {/* 2. Orders Today */}
            <StatCard
              label="Orders Today"
              value={summary?.orders_today ?? 0}
              change={
                summary?.changes
                  ? { value: summary.changes.orders_today_pct ?? 0, label: 'vs yesterday' }
                  : undefined
              }
              icon={<ShoppingBag className="w-5 h-5" />}
              isLoading={isSummaryLoading}
            />

            {/* 3. Pending Orders */}
            <StatCard
              label="Pending Orders"
              value={summary ? summary.pending_orders : 0}
              subtext="Needs packing/dispatch"
              icon={<Clock className="w-5 h-5" />}
              isLoading={isSummaryLoading}
            />

            {/* 4. Low Stock Items */}
            <StatCard
              label="Low Stock Items"
              value={summary ? summary.low_stock_count : 0}
              subtext={summary?.low_stock_count ? 'Action required' : 'Stock healthy'}
              icon={<AlertTriangle className="w-5 h-5 text-[#8A5A00]" />}
              isLoading={isSummaryLoading}
            />

            {/* 5. Available Balance */}
            <StatCard
              label="Available Balance"
              value={summary ? formatINR(summary.available_balance_paise ?? 0) : '₹0'}
              change={
                summary?.changes
                  ? { value: summary.changes.available_balance_pct ?? 0, label: 'vs last week' }
                  : undefined
              }
              icon={<Wallet className="w-5 h-5" />}
              isLoading={isSummaryLoading}
            />

            {/* 6. Pending Payout */}
            <StatCard
              label="Pending Payout"
              value={summary ? formatINR(summary.pending_payout_paise ?? 0) : '₹0'}
              subtext="Weekly cycle deposit"
              icon={<ArrowUpRight className="w-5 h-5 text-[#2E4D34]" />}
              isLoading={isSummaryLoading}
            />
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* EMPTY DASHBOARD ONBOARDING BANNER (when new-empty@test.com) */}
      {/* ======================================================== */}
      {isNewVendorEmpty && (
        <section aria-label="New Artisan Store Setup">
          <div className="p-6 sm:p-8 bg-gradient-to-br from-[#EAF1EA] to-[#FAF7F2] rounded-3xl border border-[#D1DDD0] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-xs font-bold text-[#2E4D34] border border-[#D1DDD0]">
                <Sparkles className="w-3.5 h-3.5" />
                Store Approved & Ready!
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#223B28]">
                Get Ready for Your First Artisan Order
              </h3>
              <p className="text-xs sm:text-sm text-[#637365] max-w-xl leading-relaxed">
                Your store has been verified by our artisan curation team. Add your handcrafted products or schedule workshops to start reaching buyers across India.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link to="/vendor/products">
                <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
                  Add First Product
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 2. SALES REVENUE CHART & QUICK ALERTS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sales Chart (8 Cols) */}
        <section
          aria-labelledby="sales-chart-heading"
          className="lg:col-span-8 bg-white rounded-3xl border border-[#EAE5DB] p-5 sm:p-7 shadow-xs flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h3 id="sales-chart-heading" className="font-serif text-lg sm:text-xl font-bold text-[#223B28]">
                Sales Performance
              </h3>
              <p className="text-xs text-[#8E9B90]">
                Total for period: <span className="font-semibold text-[#223B28]">{formatINR(totalPeriodSales)}</span>
              </p>
            </div>

            {/* 7 / 30 / 90 Days Toggle Tabs */}
            <div
              role="group"
              aria-label="Sales chart time range"
              className="inline-flex rounded-xl bg-[#FAF7F2] p-1 border border-[#EAE5DB]"
            >
              {(['7', '30', '90'] as SalesChartRange[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setChartRange(range)}
                  aria-pressed={chartRange === range}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    chartRange === range
                      ? 'bg-[#2E4D34] text-white shadow-xs'
                      : 'text-[#637365] hover:text-[#223B28]'
                  }`}
                >
                  {range} Days
                </button>
              ))}
            </div>
          </div>

          {/* Chart Canvas */}
          {isChartLoading ? (
            <div className="h-72 w-full flex flex-col justify-center gap-3">
              <Skeleton className="h-56 w-full rounded-2xl" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ) : isChartError ? (
            <div className="h-72 flex items-center justify-center">
              <ErrorState
                title="Failed to load sales chart"
                message="Chart statistics could not be loaded."
                onRetry={() => refetchChart()}
              />
            </div>
          ) : formattedChartPoints.length === 0 ? (
            <div className="h-72 flex items-center justify-center">
              <EmptyState
                title="No sales recorded yet"
                description="Once you start selling handcrafted products, your revenue curve will appear here."
              />
            </div>
          ) : (
            <>
              {/* Screen reader text summary alternative */}
              <div className="sr-only">
                <table>
                  <caption>Sales history for past {chartRange} days</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Sales</th>
                      <th scope="col">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formattedChartPoints.map((pt) => (
                      <tr key={pt.date}>
                        <td>{pt.date}</td>
                        <td>{formatINR(pt.sales_paise)}</td>
                        <td>{pt.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Accessible Recharts Curve */}
              <div className="h-72 w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedChartPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2E4D34" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2E4D34" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE5DB" />
                    <XAxis
                      dataKey="formattedDate"
                      tickLine={false}
                      axisLine={{ stroke: '#EAE5DB' }}
                      tick={{ fill: '#8E9B90', fontSize: 11 }}
                      interval={chartRange === '7' ? 0 : chartRange === '30' ? 4 : 14}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={{ stroke: '#EAE5DB' }}
                      tick={{ fill: '#8E9B90', fontSize: 11 }}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-lg border border-[#EAE5DB] text-xs space-y-1">
                            <p className="font-semibold text-[#223B28]">{data.date}</p>
                            <p className="text-[#2E4D34] font-bold">
                              Sales: {formatINR(data.sales_paise)}
                            </p>
                            <p className="text-[#637365]">Orders: {data.orders}</p>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="salesRupees"
                      stroke="#2E4D34"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#salesGradient)"
                      activeDot={{ r: 6, fill: '#2E4D34', stroke: '#FAF7F2', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>

        {/* Right: Seller Alerts Panel (4 Cols) */}
        <section
          aria-labelledby="alerts-panel-heading"
          className="lg:col-span-4 bg-white rounded-3xl border border-[#EAE5DB] p-5 sm:p-7 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE5DB] mb-4">
              <h3 id="alerts-panel-heading" className="font-serif text-lg font-bold text-[#223B28]">
                Store Alerts
              </h3>
              <span className="text-xs font-semibold text-[#8E9B90]">
                {alertsData?.length || 0} active
              </span>
            </div>

            {isAlertsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isAlertsError ? (
              <ErrorState
                title="Could not load alerts"
                message="Failed to fetch notifications."
                onRetry={() => refetchAlerts()}
              />
            ) : !alertsData || alertsData.length === 0 ? (
              <EmptyState
                title="All caught up!"
                description="There are no pending warnings or store notices."
              />
            ) : (
              <div className="space-y-3.5 max-h-[290px] overflow-y-auto pr-1">
                {alertsData.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3.5 rounded-2xl bg-[#FAF7F2]/80 border border-[#EAE5DB] flex items-start gap-3 hover:bg-[#FAF7F2] transition-colors"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <StatusBadge status={alert.type} size="sm" label="" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#223B28]">{alert.title}</p>
                      <p className="text-[11px] text-[#637365] mt-0.5 leading-snug">
                        {alert.message}
                      </p>
                      <span className="text-[10px] text-[#8E9B90] mt-1.5 block">
                        {new Date(alert.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#EAE5DB] mt-4 text-center">
            <Link
              to="/vendor/support"
              className="text-xs font-semibold text-[#2E4D34] hover:underline"
            >
              Contact Seller Concierge →
            </Link>
          </div>
        </section>
      </div>

      {/* ======================================================== */}
      {/* 3. RECENT ORDERS & INVENTORY / REVIEWS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Orders DataTable (7 Cols) */}
        <section
          aria-labelledby="recent-orders-heading"
          className="lg:col-span-7 bg-white rounded-3xl border border-[#EAE5DB] p-5 sm:p-7 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE5DB] mb-4">
              <div>
                <h3 id="recent-orders-heading" className="font-serif text-lg sm:text-xl font-bold text-[#223B28]">
                  Recent Orders
                </h3>
                <p className="text-xs text-[#8E9B90]">Orders placed by conscious buyers</p>
              </div>

              <Link
                to="/vendor/orders"
                className="text-xs font-semibold text-[#2E4D34] hover:underline inline-flex items-center gap-1"
              >
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isOrdersError ? (
              <ErrorState
                title="Could not load orders"
                message="Failed to fetch recent orders list."
                onRetry={() => refetchOrders()}
              />
            ) : (
              <DataTable<RecentOrder>
                columns={orderColumns}
                data={ordersData?.results || []}
                keyExtractor={(order) => order.id}
                isLoading={isOrdersLoading}
                loadingRowCount={5}
                emptyState={
                  <EmptyState
                    title="No orders yet"
                    description="When customers purchase your handmade creations, orders will appear here."
                    action={{
                      label: 'Add Product',
                      href: '/vendor/products',
                      icon: <Plus className="w-4 h-4" />,
                    }}
                  />
                }
              />
            )}
          </div>

          {ordersData && ordersData.count > ordersPageSize && (
            <Pagination
              currentPage={ordersPage}
              totalItems={ordersData.count}
              pageSize={ordersPageSize}
              onPageChange={(page) => setOrdersPage(page)}
            />
          )}
        </section>

        {/* Right: Low Stock & Reviews (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          {/* Low Stock Items List */}
          <section
            aria-labelledby="low-stock-heading"
            className="bg-white rounded-3xl border border-[#EAE5DB] p-5 sm:p-7 shadow-xs flex-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DB] mb-4">
                <div>
                  <h3 id="low-stock-heading" className="font-serif text-base sm:text-lg font-bold text-[#223B28]">
                    Low Stock Alerts
                  </h3>
                  <p className="text-xs text-[#8E9B90]">Items below inventory threshold</p>
                </div>
                <Link
                  to="/vendor/products"
                  className="text-xs font-semibold text-[#2E4D34] hover:underline inline-flex items-center gap-1"
                >
                  Manage <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {isLowStockLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : isLowStockError ? (
                <ErrorState
                  title="Could not load stock list"
                  onRetry={() => refetchLowStock()}
                />
              ) : !lowStockData || lowStockData.results.length === 0 ? (
                <EmptyState
                  title="Stock Levels Healthy"
                  description="All your artisan products have sufficient inventory."
                />
              ) : (
                <div className="divide-y divide-[#EAE5DB]/60">
                  {lowStockData.results.map((item: LowStockItem) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#223B28] truncate">
                          {item.product_name}
                        </p>
                        <p className="text-[11px] text-[#8E9B90] truncate">
                          {item.category}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#FFF0F0] text-[#C53030] border border-[#FED7D7]">
                          {item.stock_left} left
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Recent Reviews (with ?fail=reviews test support) */}
          <section
            aria-labelledby="recent-reviews-heading"
            className="bg-white rounded-3xl border border-[#EAE5DB] p-5 sm:p-7 shadow-xs flex-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DB] mb-4">
                <div>
                  <h3 id="recent-reviews-heading" className="font-serif text-base sm:text-lg font-bold text-[#223B28]">
                    Recent Customer Reviews
                  </h3>
                  <p className="text-xs text-[#8E9B90]">Verified buyer experiences</p>
                </div>
                <Link
                  to="/vendor/reviews"
                  className="text-xs font-semibold text-[#2E4D34] hover:underline inline-flex items-center gap-1"
                >
                  View all <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {isReviewsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              ) : isReviewsError ? (
                <ErrorState
                  title="Could not load reviews"
                  message="Failed to retrieve reviews from the server. (Testing ?fail=reviews)"
                  onRetry={() => refetchReviews()}
                />
              ) : !reviewsData || reviewsData.results.length === 0 ? (
                <EmptyState
                  title="No reviews yet"
                  description="When customers review your craft orders, their feedback will show here."
                />
              ) : (
                <div className="space-y-3.5">
                  {reviewsData.results.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3 rounded-2xl bg-[#FAF7F2]/60 border border-[#EAE5DB] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[#E29D38]">
                          {Array.from({ length: 5 }).map((_, sIdx) => (
                            <Star
                              key={sIdx}
                              className={`w-3.5 h-3.5 ${
                                sIdx < rev.rating
                                  ? 'fill-[#E29D38] text-[#E29D38]'
                                  : 'text-[#EAE5DB]'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-[#8E9B90]">
                          {new Date(rev.date).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-[#223B28] italic leading-snug">
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                      <p className="text-[11px] text-[#637365] font-medium flex items-center justify-between">
                        <span>— {rev.customer_name}</span>
                        <span className="text-[#8E9B90] text-[10px] truncate max-w-[140px]">
                          {rev.product_name}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboardPage;
