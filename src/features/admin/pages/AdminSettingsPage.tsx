import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Building,
  Save,
  RefreshCw,
  Percent,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { useAdminSettings } from '../hooks/useAdminSettings';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../../../components/vendor/Toast';
import { Skeleton } from '../../../components/vendor/Skeleton';
import { savePlatformSettings, clearLocalTestCaches } from '../../../utils/platformSync';
import { resetAdminPlatformData } from '../../../api/admin';
import type { AdminPlatformSettings } from '../../../types/admin';

const RESET_REMOVES = [
  { label: 'Orders & Returns', detail: 'all orders, items, status history, return requests' },
  { label: 'Finance & Payouts', detail: 'payout batches & seller ledger entries' },
  { label: 'Coupons & Promos', detail: 'all coupons and redemptions' },
  { label: 'Audit Log', detail: 'entire governance trail' },
  { label: 'Product Reviews & Moderation', detail: 'customer reviews & listing decision history' },
  { label: 'Vendor & Seller Hub', detail: 'seller accounts, KYC documents, support tickets' },
  { label: 'Customer Directory', detail: 'shopper accounts, sessions & service bookings' },
];

const RESET_KEEPS = ['Products & variants', 'Services', 'Categories', 'Staff & roles', 'Store settings'];

const RESET_COUNT_LABELS: Record<string, string> = {
  orders: 'Orders',
  payout_batches: 'Payout batches',
  coupons: 'Coupons',
  audit_logs: 'Audit entries',
  reviews: 'Reviews',
  sellers: 'Sellers',
  customers: 'Customers',
};

export const AdminSettingsPage: React.FC = () => {
  const toast = useToast();
  const { canEdit, isSuperAdmin } = usePermission();
  const { data, isLoading, isError, refetch, isFetching, updateSettings, isUpdatingSettings } = useAdminSettings();

  const [settings, setSettings] = useState<AdminPlatformSettings | null>(null);

  useEffect(() => {
    if (data) {
      setSettings(JSON.parse(JSON.stringify(data)));
    }
  }, [data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      savePlatformSettings(settings);
      await updateSettings(settings);
      toast.showToast('Marketplace configuration updated successfully.', 'success');
    } catch {
      toast.showToast('Failed to update platform settings.', 'error');
    }
  };

  const handleResetAll = () => {
    setResetConfirmText('');
    setResetResult(null);
    setResetOpen(true);
  };

  const queryClient = useQueryClient();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetResult, setResetResult] = useState<Record<string, number> | null>(null);

  const resetMutation = useMutation({
    mutationFn: resetAdminPlatformData,
    onSuccess: (res) => {
      clearLocalTestCaches();
      setResetResult(res.deleted);
      // Refetch every admin view (orders, finance, coupons, sellers, customers, audit, reviews…)
      queryClient.invalidateQueries();
      toast.showToast('Platform data reset complete. Products and services were kept.', 'success');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || 'Reset failed. No data was changed.';
      toast.showToast(msg, 'error');
    },
  });

  const closeResetModal = () => {
    if (resetMutation.isPending) return;
    setResetOpen(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#EAE5DB] pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2E4D34] bg-[#EAF1EA] px-2.5 py-1 rounded-md">
            Platform Configuration
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#223B28] mt-2">
            Store & Governance Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6D61] mt-1">
            Global marketplace commission economics, shipping fee thresholds, tax compliances, and system security flags.
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
            <span>Discard Changes</span>
          </button>

          {canEdit('settings') && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isUpdatingSettings || !settings}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] transition-colors disabled:opacity-50 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isUpdatingSettings ? 'Saving...' : 'Save Settings'}</span>
            </button>
          )}
        </div>
      </div>

      {isLoading || !settings ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <div className="py-8 text-center text-xs text-rose-600">Failed to load platform settings.</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Marketplace Commission & Settlements */}
          <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#F0EDE6] pb-3">
              <div className="w-8 h-8 rounded-xl bg-[#EAF1EA] border border-[#D1DDD0] flex items-center justify-center text-[#2E4D34]">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#223B28]">Marketplace Commission & Economics</h2>
                <p className="text-xs text-[#8E9B90]">
                  Take rates deducted automatically from artisan order payouts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  Platform Commission Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    value={settings.marketplace.platform_fee_percent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        marketplace: {
                          ...settings.marketplace,
                          platform_fee_percent: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] font-mono focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8E9B90]">%</span>
                </div>
                <p className="text-[10px] text-[#8E9B90] mt-1">Deducted from vendor sales when settlement batches are generated.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  TCS Rate (Sec 194-O) (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={settings.marketplace.tcs_tax_percent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        marketplace: {
                          ...settings.marketplace,
                          tcs_tax_percent: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] font-mono focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8E9B90]">%</span>
                </div>
                <p className="text-[10px] text-[#8E9B90] mt-1">Statutory Indian e-commerce Tax Collected at Source.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  Settlement Payout Cycle
                </label>
                <select
                  value={settings.marketplace.payout_frequency}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      marketplace: {
                        ...settings.marketplace,
                        payout_frequency: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                >
                  <option value="weekly">Weekly (Every Monday)</option>
                  <option value="biweekly">Bi-weekly (1st & 15th)</option>
                  <option value="monthly">Monthly</option>
                </select>
                <p className="text-[10px] text-[#8E9B90] mt-1">Settlement period used when generating payout batches.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  Minimum Payout Threshold (₹)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="50"
                    min="100"
                    value={settings.marketplace.minimum_payout_amount}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        marketplace: {
                          ...settings.marketplace,
                          minimum_payout_amount: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] font-mono focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8E9B90]">₹</span>
                </div>
                <p className="text-[10px] text-[#8E9B90] mt-1">Minimum seller balance required to generate batch.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Shipping & Delivery Rules */}
          <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#F0EDE6] pb-3">
              <div className="w-8 h-8 rounded-xl bg-[#EAF1EA] border border-[#D1DDD0] flex items-center justify-center text-[#2E4D34]">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#223B28]">Shipping, Logistics & Eco Packaging</h2>
                <p className="text-xs text-[#8E9B90]">
                  Buyer delivery pricing, free shipping cart qualifications, and eco charges.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  Free Shipping Minimum Cart (₹)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={settings.shipping.free_shipping_threshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        shipping: {
                          ...settings.shipping,
                          free_shipping_threshold: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] font-mono focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8E9B90]">₹</span>
                </div>
                <p className="text-[10px] text-[#8E9B90] mt-1">Orders above this qualify for free standard shipping.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  Standard Delivery Fee (₹)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={settings.shipping.standard_delivery_fee}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        shipping: {
                          ...settings.shipping,
                          standard_delivery_fee: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] font-mono focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8E9B90]">₹</span>
                </div>
                <p className="text-[10px] text-[#8E9B90] mt-1">Applied when cart is below free shipping threshold.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  Eco Packaging Surcharge (₹)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={settings.shipping.eco_packaging_fee}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        shipping: {
                          ...settings.shipping,
                          eco_packaging_fee: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] font-mono focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8E9B90]">₹</span>
                </div>
                <p className="text-[10px] text-[#8E9B90] mt-1">Optional add-on buyers can choose at checkout.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  Standard Delivery SLA (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={settings.shipping.estimated_delivery_days}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      shipping: {
                        ...settings.shipping,
                        estimated_delivery_days: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] font-mono focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                />
                <p className="text-[10px] text-[#8E9B90] mt-1">Shown to buyers as the estimated delivery date at checkout.</p>
              </div>
            </div>
          </div>

          {/* Section 3: Legal & Corporate Identity */}
          <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#F0EDE6] pb-3">
              <div className="w-8 h-8 rounded-xl bg-[#EAF1EA] border border-[#D1DDD0] flex items-center justify-center text-[#2E4D34]">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#223B28]">Corporate & Regulatory Compliance</h2>
                <p className="text-xs text-[#8E9B90]">
                  Shown in the storefront footer (legal name, GSTIN, address, support contacts).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  Registered Legal Entity Name
                </label>
                <input
                  type="text"
                  value={settings.compliance.legal_entity_name}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      compliance: {
                        ...settings.compliance,
                        legal_entity_name: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  Platform GSTIN
                </label>
                <input
                  type="text"
                  value={settings.compliance.gstin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      compliance: {
                        ...settings.compliance,
                        gstin: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs font-mono bg-white text-[#223B28] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  Registered Office Address
                </label>
                <input
                  type="text"
                  value={settings.compliance.registered_office_address}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      compliance: {
                        ...settings.compliance,
                        registered_office_address: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  Official Support Email
                </label>
                <input
                  type="email"
                  value={settings.compliance.support_email}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      compliance: {
                        ...settings.compliance,
                        support_email: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#223B28] mb-1">
                  Helpline Contact Number
                </label>
                <input
                  type="text"
                  value={settings.compliance.support_phone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      compliance: {
                        ...settings.compliance,
                        support_phone: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                />
              </div>
            </div>
          </div>



          {isSuperAdmin && (
            <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
              <div className="bg-gradient-to-r from-rose-50 to-white px-6 py-4 border-b border-rose-100 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-rose-900">Danger Zone — Complete Reset</h2>
                  <p className="text-xs text-rose-700">Super Admin only. Permanently deletes operational data from the database.</p>
                </div>
              </div>

              <div className="p-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 flex-1">
                  {RESET_REMOVES.map((item) => (
                    <div key={item.label} className="flex items-start gap-2 text-xs">
                      <Trash2 className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                      <span className="font-semibold text-[#223B28]">{item.label}</span>
                    </div>
                  ))}
                  <p className="sm:col-span-2 text-[11px] text-[#5F6D61] mt-2">
                    <span className="font-semibold text-[#2E4D34]">Kept:</span> {RESET_KEEPS.join(' · ')}
                  </p>
                </div>

                <button
                  type="button"
                  id="admin-complete-reset"
                  onClick={handleResetAll}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 active:scale-[0.98] transition-all shadow-xs shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Complete Reset</span>
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {resetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A2B1E]/50 backdrop-blur-sm animate-fadeIn"
          onClick={closeResetModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-rose-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[#F0EDE6]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    resetResult ? 'bg-[#EAF1EA] text-[#2E4D34]' : 'bg-rose-100 text-rose-600'
                  }`}
                >
                  {resetResult ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 id="reset-modal-title" className="text-base font-bold text-[#223B28]">
                    {resetResult ? 'Reset complete' : 'Complete platform reset'}
                  </h3>
                  <p className="text-xs text-[#8E9B90]">
                    {resetResult ? 'The marketplace is now a clean slate.' : 'This cannot be undone.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="admin-reset-modal-close"
                onClick={closeResetModal}
                disabled={resetMutation.isPending}
                className="p-1.5 rounded-lg text-[#8E9B90] hover:bg-[#FAF7F2] hover:text-[#223B28] transition-colors disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetResult ? (
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(RESET_COUNT_LABELS).map(([key, label]) => (
                    <div key={key} className="rounded-xl border border-[#EAE5DB] bg-[#FAF7F2] px-3 py-2">
                      <div className="text-lg font-bold font-mono text-[#223B28]">{resetResult[key] ?? 0}</div>
                      <div className="text-[10px] uppercase tracking-wide text-[#8E9B90] font-semibold">{label} removed</div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#5F6D61]">
                  One audit entry (<span className="font-mono">COMPLETE_DATA_RESET</span>) was recorded so the reset itself is traceable.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    id="admin-reset-done"
                    onClick={closeResetModal}
                    className="px-4 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 mb-2">Will be permanently deleted</p>
                  <ul className="space-y-1.5">
                    {RESET_REMOVES.map((item) => (
                      <li key={item.label} className="flex items-start gap-2 text-xs">
                        <Trash2 className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                        <span>
                          <span className="font-semibold text-[#223B28]">{item.label}</span>
                          <span className="text-[#8E9B90]"> — {item.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-[#EAF1EA] border border-[#D1DDD0] px-3.5 py-2.5 text-xs text-[#2E4D34]">
                  <span className="font-bold">Kept:</span> {RESET_KEEPS.join(' · ')}. Products & services listed by sellers stay live as
                  first-party listings.
                </div>

                <div>
                  <label htmlFor="admin-reset-confirm-input" className="block text-xs font-bold text-[#223B28] mb-1">
                    Type <span className="font-mono text-rose-600">RESET</span> to confirm
                  </label>
                  <input
                    id="admin-reset-confirm-input"
                    type="text"
                    autoFocus
                    autoComplete="off"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && resetConfirmText === 'RESET' && !resetMutation.isPending) {
                        resetMutation.mutate();
                      }
                    }}
                    placeholder="RESET"
                    className="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-sm font-mono bg-white text-[#223B28] focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    id="admin-reset-cancel"
                    onClick={closeResetModal}
                    disabled={resetMutation.isPending}
                    className="px-4 py-2 rounded-xl border border-[#D1DDD0] bg-white text-xs font-semibold text-[#223B28] hover:bg-[#FAF7F2] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="admin-reset-confirm"
                    onClick={() => resetMutation.mutate()}
                    disabled={resetConfirmText !== 'RESET' || resetMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {resetMutation.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>{resetMutation.isPending ? 'Resetting…' : 'Permanently reset'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
