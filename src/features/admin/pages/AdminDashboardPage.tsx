import React from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Users,
  Package,
  CheckSquare,
  Clock,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShoppingBag,
  CreditCard,
  Settings,
} from 'lucide-react';
import { useAdminOverview } from '../hooks/useAdminOverview';
import { useAdminOrders } from '../hooks/useAdminOrders';
import { useAdminFinance } from '../hooks/useAdminFinance';
import { formatRupees, formatIndianNumber } from '../../../utils/currency';
import { Skeleton } from '../../../components/vendor/Skeleton';
import { useLivePlatformSettings } from '../../../utils/platformSync';

export const AdminDashboardPage: React.FC = () => {
  const { data, isLoading, isError, refetch, isFetching } = useAdminOverview();
  const { data: ordersData } = useAdminOrders();
  const { data: financeData } = useAdminFinance();
  const { settings: liveSettings } = useLivePlatformSettings();

  const metrics = data?.metrics;
  const alerts = data?.alerts || [];

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-7xl mx-auto">
      {/* Page Title Area Pattern */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#EAE5DB] pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2E4D34] bg-[#EAF1EA] px-2.5 py-1 rounded-md">
            Marketplace Control Plane
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#223B28] mt-2">
            Marketplace Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6D61] mt-1">
            Real-time platform metrics, merchant compliance queues, catalog health, and system alerts.
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

          <Link
            to="/admin/people/sellers"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] transition-colors shadow-xs"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Review Merchants</span>
          </Link>
        </div>
      </div>

      {/* Urgent Operational & Compliance Alerts Panel */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#223B28]">
                Urgent Operational & Compliance Alerts
              </h2>
              <p className="text-xs text-[#8E9B90]">
                Immediate attention required to satisfy merchant SLAs and platform security standards.
              </p>
            </div>
          </div>
          {alerts.length > 0 && (
            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              {alerts.length} Active
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#223B28]">All clear</h3>
            <p className="text-xs text-[#8E9B90] max-w-sm mt-0.5">
              No delayed merchant KYC documents, overdue catalog product reviews, or security warnings detected.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                to={alert.target_url}
                className="flex items-start justify-between p-4 rounded-xl border border-[#F0EDE6] hover:border-[#D1DDD0] bg-[#FDFCF9] hover:bg-white transition-all group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        alert.severity === 'danger'
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : alert.severity === 'warning'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {alert.count} Pending
                    </span>
                    <h3 className="text-xs font-bold text-[#223B28] group-hover:text-[#2E4D34] transition-colors">
                      {alert.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#5F6D61] leading-relaxed">
                    {alert.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#8E9B90] group-hover:text-[#2E4D34] group-hover:translate-x-0.5 transition-all shrink-0 ml-3 mt-1" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Operational Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* 1. Registered Vendors */}
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
          <div>
            <div className="flex items-center justify-between text-[#8E9B90] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Registered Vendors</span>
              <Store className="w-4 h-4 text-[#2E4D34]" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 my-1" />
            ) : isError || !metrics ? (
              <p className="text-xs text-red-600">Failed to load</p>
            ) : (
              <div className="text-2xl font-bold font-serif text-[#223B28]">
                {formatIndianNumber(metrics.registered_vendors.approved)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0EDE6] text-[11px] text-[#5F6D61]">
            {metrics?.registered_vendors.pending_review ?? 0} onboarding applications awaiting review
          </div>
        </div>

        {/* 2. Active Customers */}
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
          <div>
            <div className="flex items-center justify-between text-[#8E9B90] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Customers</span>
              <Users className="w-4 h-4 text-[#2E4D34]" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 my-1" />
            ) : isError || !metrics ? (
              <p className="text-xs text-red-600">Failed to load</p>
            ) : (
              <div className="text-2xl font-bold font-serif text-[#223B28]">
                {formatIndianNumber(metrics.active_customers)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0EDE6] text-[11px] text-[#5F6D61]">
            Verified buyer accounts across platforms
          </div>
        </div>

        {/* 3. Catalog Products */}
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
          <div>
            <div className="flex items-center justify-between text-[#8E9B90] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Catalog Products</span>
              <Package className="w-4 h-4 text-[#2E4D34]" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 my-1" />
            ) : isError || !metrics ? (
              <p className="text-xs text-red-600">Failed to load</p>
            ) : (
              <div className="text-2xl font-bold font-serif text-[#223B28]">
                {formatIndianNumber(metrics.catalog_products.live)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0EDE6] text-[11px] text-[#5F6D61]">
            Active, published listings in consumer store
          </div>
        </div>

        {/* 4. Products Awaiting Review (Clickable) */}
        <Link
          to="/admin/product-reviews"
          className="bg-white rounded-2xl border border-[#EAE5DB] hover:border-[#2E4D34] p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all group"
        >
          <div>
            <div className="flex items-center justify-between text-[#8E9B90] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-[#2E4D34]">
                Products in Review
              </span>
              <CheckSquare className="w-4 h-4 text-amber-600" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 my-1" />
            ) : isError || !metrics ? (
              <p className="text-xs text-red-600">Failed to load</p>
            ) : (
              <div className="text-2xl font-bold font-serif text-amber-800">
                {formatIndianNumber(metrics.products_awaiting_review)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0EDE6] text-[11px] text-amber-800 font-medium flex items-center justify-between">
            <span>Click to inspect queue</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 5. Sellers Awaiting Review (Clickable) */}
        <Link
          to="/admin/people/sellers"
          className="bg-white rounded-2xl border border-[#EAE5DB] hover:border-[#2E4D34] p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all group"
        >
          <div>
            <div className="flex items-center justify-between text-[#8E9B90] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-[#2E4D34]">
                Sellers in Review
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 my-1" />
            ) : isError || !metrics ? (
              <p className="text-xs text-red-600">Failed to load</p>
            ) : (
              <div className="text-2xl font-bold font-serif text-amber-800">
                {formatIndianNumber(metrics.sellers_awaiting_review)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0EDE6] text-[11px] text-amber-800 font-medium flex items-center justify-between">
            <span>Click to review KYC</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Operational & Governance Mission Control Hub */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#223B28]">Operations, Treasury & Storefront Governance</h2>
            <p className="text-xs text-[#8E9B90]">
              Direct access into platform logistics, settlement disbursements, CMS merchandising, and tax compliance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Orders & Returns */}
          <Link
            to="/admin/orders"
            className="p-5 rounded-2xl border border-[#EAE5DB] bg-white hover:border-[#2E4D34] shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[#8E9B90] mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-[#2E4D34]">
                  Orders & Returns
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#EAF1EA] text-[#2E4D34] flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-serif font-bold text-[#223B28]">
                {ordersData?.tab_counts?.all ?? 0} Orders
              </div>
              <div className="text-xs text-[#5F6D61] mt-1 space-y-0.5">
                <p>• {ordersData?.tab_counts?.pending_dispatch ?? 0} pending dispatch</p>
                <p className="text-rose-700 font-semibold">• {ordersData?.tab_counts?.return_requested ?? 0} return claim open</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F0EDE6] text-xs font-semibold text-[#2E4D34] flex items-center justify-between">
              <span>Inspect Shipments</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 2. Finance & Settlements */}
          <Link
            to="/admin/finance"
            className="p-5 rounded-2xl border border-[#EAE5DB] bg-white hover:border-[#2E4D34] shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[#8E9B90] mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-[#2E4D34]">
                  Finance & Settlements
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-serif font-bold text-[#223B28]">
                {formatRupees(financeData?.summary?.gmv ?? 0)}
              </div>
              <div className="text-xs text-[#5F6D61] mt-1 space-y-0.5">
                <p>• Net Revenue: <span className="font-semibold text-emerald-700">{formatRupees(financeData?.summary?.platform_revenue ?? 0)}</span></p>
                <p className="text-amber-800 font-semibold">• {financeData?.summary?.payout_batches_pending ?? 0} settlement batches ready</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F0EDE6] text-xs font-semibold text-[#2E4D34] flex items-center justify-between">
              <span>Manage Treasury</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 3. Global Settings */}
          <Link
            to="/admin/settings"
            className="p-5 rounded-2xl border border-[#EAE5DB] bg-white hover:border-[#2E4D34] shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[#8E9B90] mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-[#2E4D34]">
                  Platform Settings
                </span>
                <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-serif font-bold text-[#223B28]">
                Governance
              </div>
              <div className="text-xs text-[#5F6D61] mt-1 space-y-0.5">
                <p>• Take rate: {liveSettings.marketplace.platform_fee_percent}% | TCS: {liveSettings.marketplace.tcs_tax_percent}%</p>
                <p>• Free shipping above: {formatRupees(liveSettings.shipping.free_shipping_threshold)}</p>
                <p className={liveSettings.system_flags.eco_delivery_enabled ? 'text-emerald-700 font-semibold' : 'text-zinc-500'}>
                  • {liveSettings.system_flags.eco_delivery_enabled ? 'Eco delivery active' : 'Eco delivery paused'}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F0EDE6] text-xs font-semibold text-[#2E4D34] flex items-center justify-between">
              <span>Configure Settings</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>

  );
};

export default AdminDashboardPage;
