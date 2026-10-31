import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  TrendingUp,
  Percent,
  Receipt,
  CheckCircle2,
  Building,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '../../../components/vendor/PageHeader';
import { StatCard } from '../../../components/vendor/StatCard';
import { StatusBadge } from '../../../components/vendor/StatusBadge';
import { Pagination } from '../../../components/vendor/Pagination';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { useToast } from '../../../components/vendor/Toast';
import { Button } from '../../../components/ui/Button';
import { formatINR } from '../../../utils/currency';
import {
  getVendorEarningsSummary,
  getVendorLedger,
  getVendorPayouts,
  requestVendorPayout,
} from '../../../api/vendorPortalApi';

export const VendorEarningsPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'payouts'>('overview');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['vendor-earnings-summary'],
    queryFn: getVendorEarningsSummary,
  });

  const { data: ledgerData, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['vendor-ledger', ledgerPage],
    queryFn: () => getVendorLedger(ledgerPage, 20),
    enabled: activeTab === 'ledger',
  });

  const { data: payoutsData, isLoading: isPayoutsLoading } = useQuery({
    queryKey: ['vendor-payouts'],
    queryFn: getVendorPayouts,
    enabled: activeTab === 'payouts' || activeTab === 'overview',
  });

  const payoutMutation = useMutation({
    mutationFn: requestVendorPayout,
    onSuccess: (res) => {
      toast.showToast(res.message || 'Payout request submitted successfully.', 'success');
      setIsPayoutModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['vendor-earnings-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['vendor-payouts'] });
      void queryClient.invalidateQueries({ queryKey: ['vendor-ledger'] });
    },
    onError: (err: any) => {
      toast.showToast(err?.message || 'Failed to submit payout request.', 'error');
    },
  });

  const payouts = payoutsData?.results || [];
  const ledgerEntries = ledgerData?.results || [];
  const ledgerCount = ledgerData?.count || 0;
  const ledgerPages = Math.ceil(ledgerCount / 20);

  const grossSalesRupees = summary ? summary.gross_sales_paise / 100 : 0;
  const commissionRupees = summary ? summary.commission_paid_paise / 100 : 0;
  const tcsTaxRupees = summary ? summary.tcs_tax_paise / 100 : 0;
  const netEarningsRupees = summary ? summary.net_earnings_paise / 100 : 0;
  const availableRupees = summary ? summary.available_balance_paise / 100 : 0;
  const withdrawnRupees = summary ? summary.withdrawn_paise / 100 : 0;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Earnings & Payouts"
          description="Transparent commission breakdown, auditable transaction ledger, and payout requests."
        />

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsPayoutModalOpen(true)}
            disabled={!summary?.is_eligible_for_payout}
            leftIcon={<Wallet className="w-4 h-4" />}
          >
            Request Payout
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Gross Sales"
          value={formatINR(grossSalesRupees)}
          icon={<TrendingUp className="w-5 h-5 text-[#2E4D34]" />}
        />
        <StatCard
          label="Platform Commission"
          value={formatINR(commissionRupees)}
          subtext={`${summary?.commission_rate_percent || 8.5}% marketplace fee`}
          icon={<Percent className="w-5 h-5 text-[#B87A00]" />}
        />
        <StatCard
          label="Net Earnings"
          value={formatINR(netEarningsRupees)}
          subtext={`After ${summary?.tcs_tax_percent || 1}% TCS deduction`}
          icon={<Receipt className="w-5 h-5 text-[#2E4D34]" />}
        />
        <StatCard
          label="Available Balance"
          value={formatINR(availableRupees)}
          subtext={summary?.is_eligible_for_payout ? 'Eligible for withdrawal' : 'Min. ₹1,000 threshold'}
          icon={<Wallet className="w-5 h-5 text-[#2E4D34]" />}
          className={summary?.is_eligible_for_payout ? 'border-emerald-400 bg-emerald-50/20' : ''}
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[#EAE5DB] flex items-center gap-6 text-xs font-semibold">
        {[
          { key: 'overview', label: 'Financial Summary & Bank' },
          { key: 'ledger', label: `Auditable Ledger (${ledgerCount || 0})` },
          { key: 'payouts', label: `Payout History (${payouts.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-[#2E4D34] text-[#2E4D34]'
                : 'border-transparent text-[#8E9B90] hover:text-[#223B28]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Financial Summary & Bank Information */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Detailed Breakdown */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EAE5DB] p-6 space-y-4 shadow-xs">
            <h3 className="font-serif text-lg font-bold text-[#223B28]">
              Marketplace Earnings Calculation
            </h3>
            <p className="text-xs text-[#637365]">
              Real-time calculation derived from your delivered orders in accordance with ChillyFlakes artisan terms.
            </p>

            <div className="divide-y divide-[#FAF7F2] space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs py-2">
                <span className="text-[#637365]">Total Gross Order Sales (Delivered Items)</span>
                <span className="font-bold text-[#223B28]">{formatINR(grossSalesRupees)}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-2">
                <span className="text-[#637365]">ChillyFlakes Platform Fee (8.5%)</span>
                <span className="font-bold text-[#D82C20]">- {formatINR(commissionRupees)}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-2">
                <span className="text-[#637365]">Tax Collected at Source (TCS 1.0%)</span>
                <span className="font-bold text-[#D82C20]">- {formatINR(tcsTaxRupees)}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-2">
                <span className="text-[#637365]">Previously Disbursed to Bank</span>
                <span className="font-bold text-[#4F5E51]">- {formatINR(withdrawnRupees)}</span>
              </div>
              <div className="flex items-center justify-between text-sm py-3 font-bold bg-[#FAF7F2] px-3 rounded-xl">
                <span className="text-[#223B28]">Current Ready for Payout</span>
                <span className="text-[#2E4D34] font-serif text-base">{formatINR(availableRupees)}</span>
              </div>
            </div>
          </div>

          {/* Verified Settlement Bank */}
          <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-[#2E4D34]" />
              <h3 className="font-serif text-base font-bold text-[#223B28]">
                Settlement Bank Account
              </h3>
            </div>
            <p className="text-xs text-[#637365]">
              Payouts are transferred via NEFT/RTGS to your verified artisan bank account.
            </p>

            <div className="bg-[#FAF7F2] p-4 rounded-xl space-y-2 border border-[#EAE5DB]">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#8E9B90] block">Bank Name</span>
                <span className="text-xs font-bold text-[#223B28]">
                  {summary?.bank_info.bank_name || 'HDFC Bank'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#8E9B90] block">Account Number</span>
                <span className="text-xs font-mono font-bold text-[#2E4D34]">
                  {summary?.bank_info.account_number_masked || '•••• •••• 4589'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#8E9B90] block">IFSC Code</span>
                <span className="text-xs font-mono font-bold text-[#223B28]">
                  {summary?.bank_info.ifsc_code || 'HDFC0001234'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[#637365] bg-[#EAF1EA] p-3 rounded-xl border border-[#D1DDD0] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2E4D34] shrink-0 mt-0.5" />
              <span>Bank verification confirmed. Payouts require administrative review and verification before bank settlement.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Auditable Transaction Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-[#223B28]">
              Transaction Ledger
            </h3>
            <span className="text-xs text-[#8E9B90]">
              Immutable financial log of credits, commissions, and debits
            </span>
          </div>

          {isLedgerLoading ? (
            <div className="p-8 text-center text-xs text-[#8E9B90]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2E4D34]" />
              Loading ledger records...
            </div>
          ) : ledgerEntries.length === 0 ? (
            <EmptyState
              title="Ledger is empty"
              description="No financial transactions recorded yet. Transactions are automatically created when customer orders are fulfilled and delivered."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#FAF7F2] text-[#8E9B90] uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {ledgerEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="py-3 px-3 text-[#637365] whitespace-nowrap">
                        {new Date(e.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            e.type === 'earning'
                              ? 'bg-[#EAF1EA] text-[#2E4D34]'
                              : e.type === 'commission'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-red-50 text-red-800'
                          }`}
                        >
                          {e.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#223B28]">{e.description}</td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${
                        e.amount_paise > 0 ? 'text-[#2E4D34]' : 'text-[#D82C20]'
                      }`}>
                        {e.amount_paise > 0 ? '+' : ''}
                        {formatINR(e.amount_paise / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {ledgerPages > 1 && (
                <div className="pt-4">
                  <Pagination
                    currentPage={ledgerPage}
                    totalItems={ledgerData?.count || 0}
                    pageSize={20}
                    onPageChange={setLedgerPage}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Payout History */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-[#223B28]">
              Payout Batches
            </h3>
            <span className="text-xs text-[#8E9B90]">
              History of withdrawal requests and bank settlement batches
            </span>
          </div>

          {isPayoutsLoading ? (
            <div className="p-8 text-center text-xs text-[#8E9B90]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2E4D34]" />
              Loading payout history...
            </div>
          ) : payouts.length === 0 ? (
            <EmptyState
              title="No payouts requested yet"
              description="Once you request your first payout batch, tracking and settlement references will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#FAF7F2] text-[#8E9B90] uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Batch #</th>
                    <th className="py-2.5 px-3">Requested</th>
                    <th className="py-2.5 px-3">Gross Sales</th>
                    <th className="py-2.5 px-3">Net Payout</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">UTR Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="py-3 px-3 font-mono font-bold text-[#2E4D34]">
                        {p.batch_number}
                      </td>
                      <td className="py-3 px-3 text-[#637365]">
                        {new Date(p.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3 text-[#223B28]">{formatINR(p.gross_sales)}</td>
                      <td className="py-3 px-3 font-bold text-[#2E4D34]">{formatINR(p.net_payout)}</td>
                      <td className="py-3 px-3">
                        <StatusBadge
                          status={
                            p.status === 'disbursed'
                              ? 'success'
                              : p.status === 'failed'
                              ? 'danger'
                              : p.status === 'processing'
                              ? 'warning'
                              : 'pending'
                          }
                          label={p.status.replace('_', ' ')}
                        />
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#637365]">
                        {p.utr_reference ? (
                          <span className="text-[#2E4D34] font-semibold">{p.utr_reference}</span>
                        ) : (
                          <span className="text-[#8E9B90] italic">Pending approval</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Request Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#D1DDD0] shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-lg font-bold text-[#223B28]">
              Request Settlement Payout
            </h3>
            <p className="text-xs text-[#637365]">
              Withdraw your cleared net earnings to your verified bank account.
            </p>

            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE5DB] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#637365]">Available Balance</span>
                <span className="font-bold text-[#2E4D34]">{formatINR(availableRupees)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#637365]">Receiving Bank</span>
                <span className="font-medium text-[#223B28]">
                  {summary?.bank_info.bank_name} ({summary?.bank_info.account_number_masked})
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[#637365] space-y-1">
              <p>• Payout batch will be submitted to the Super Admin finance desk for approval.</p>
              <p>• Once approved, funds will be disbursed via NEFT with a valid UTR reference number.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#FAF7F2]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPayoutModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => payoutMutation.mutate()}
                disabled={payoutMutation.isPending}
              >
                {payoutMutation.isPending ? 'Submitting Request...' : `Submit Request (${formatINR(availableRupees)})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorEarningsPage;
