import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  Send,
  X,
  BadgePercent,
} from 'lucide-react';
import { useAdminFinance } from '../hooks/useAdminFinance';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../../../components/vendor/Toast';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { Skeleton } from '../../../components/vendor/Skeleton';
import { formatRupees } from '../../../utils/currency';
import { useLivePlatformSettings } from '../../../utils/platformSync';
import type { AdminPayoutBatch, AdminPayoutStatus } from '../../../types/admin';

export const AdminFinancePage: React.FC = () => {
  const toast = useToast();
  const { canDecide } = usePermission();
  const { settings: liveSettings } = useLivePlatformSettings();
  const feePercent = liveSettings.marketplace.platform_fee_percent;
  const tcsPercent = liveSettings.marketplace.tcs_tax_percent;
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
    approveBatch,
    isApprovingBatch,
    disburseBatch,
    isDisbursingBatch,
    generateBatches,
    isGeneratingBatches,
  } = useAdminFinance();

  // Selected Batch for Disburse Modal
  const [disburseModalBatch, setDisburseModalBatch] = useState<AdminPayoutBatch | null>(null);
  const [utrInput, setUtrInput] = useState('');

  const summary = data?.summary;
  const batches = data?.batches || [];

  const handleGenerateBatches = async () => {
    try {
      const res = await generateBatches();
      if (res.created > 0) {
        toast.showToast(`${res.created} settlement batch${res.created === 1 ? '' : 'es'} generated.`, 'success');
      } else if (res.skipped_below_minimum > 0) {
        toast.showToast(
          `No batch generated: ${res.skipped_below_minimum} vendor balance(s) are below the minimum payout of ₹${liveSettings.marketplace.minimum_payout_amount}.`,
          'warning'
        );
      } else {
        toast.showToast('Nothing to settle. Batches are created from delivered & paid vendor orders.', 'info');
      }
    } catch {
      toast.showToast('Failed to generate settlement batches.', 'error');
    }
  };

  const handleApproveBatch = async (batch: AdminPayoutBatch) => {
    try {
      await approveBatch(batch.id);
      toast.showToast(`Batch ${batch.batch_number} approved for disbursement processing.`, 'success');
    } catch {
      toast.showToast('Failed to approve payout batch.', 'error');
    }
  };

  const handleOpenDisburseModal = (batch: AdminPayoutBatch) => {
    setDisburseModalBatch(batch);
    setUtrInput('');
  };

  const handleConfirmDisbursement = async () => {
    if (!disburseModalBatch) return;
    try {
      await disburseBatch({
        id: disburseModalBatch.id,
        utr_reference: utrInput.trim(),
      });
      toast.showToast(
        `Disbursement of ${formatRupees(disburseModalBatch.net_payout)} confirmed with UTR ${utrInput.trim()}.`,
        'success'
      );
      setDisburseModalBatch(null);
    } catch {
      toast.showToast('Failed to record disbursement.', 'error');
    }
  };

  const handleExportCsv = () => {
    if (!batches.length) {
      toast.showToast('No payout records to export.', 'warning');
      return;
    }
    const headers = [
      'Batch Number',
      'Artisan Store',
      'Bank',
      'IFSC',
      'Account Masked',
      'Gross Sales (INR)',
      'Platform Fee (INR)',
      'TCS Tax (INR)',
      'Net Payout (INR)',
      'Status',
      'UTR Reference',
      'Disbursed At',
    ];
    const rows = batches.map((b) => [
      b.batch_number,
      `"${b.store_name}"`,
      `"${b.bank_name}"`,
      b.ifsc_code,
      b.account_number_masked,
      b.gross_sales,
      b.platform_fee_amount,
      b.tcs_tax_amount,
      b.net_payout,
      b.status,
      b.utr_reference || 'N/A',
      b.disbursed_at || 'N/A',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_settlements_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.showToast('Financial statements exported.', 'success');
  };

  const getStatusBadge = (status: AdminPayoutStatus) => {
    switch (status) {
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending Approval
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            <Send className="w-3 h-3" />
            Ready for Payout
          </span>
        );
      case 'disbursed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Disbursed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3" />
            Failed / Held
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#EAE5DB] pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2E4D34] bg-[#EAF1EA] px-2.5 py-1 rounded-md">
            Treasury & Settlements
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#223B28] mt-2">
            Finance & Vendor Settlements
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6D61] mt-1">
            Reconcile platform commission earnings, monitor Gross Merchandise Value, and disburse scheduled payouts to verified artisan banks.
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

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#D1DDD0] bg-white text-xs font-semibold text-[#223B28] hover:bg-[#FAF7F2] transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#2E4D34]" />
            <span>Export Statement</span>
          </button>
        </div>
      </div>

      {/* Financial Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GMV */}
        <div className="bg-white p-5 rounded-2xl border border-[#EAE5DB] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#8E9B90] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Gross Merchandise Value</span>
              <DollarSign className="w-4 h-4 text-[#2E4D34]" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 my-1" />
            ) : (
              <div className="text-2xl font-serif font-bold text-[#223B28]">
                {formatRupees(summary?.gmv || 0)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0EDE6] flex items-center justify-between text-[11px] text-[#5F6D61]">
            <span>Paid orders (COD counts once delivered)</span>
          </div>
        </div>

        {/* Platform Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-[#EAE5DB] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#8E9B90] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Platform Commission ({feePercent}%)</span>
              <BadgePercent className="w-4 h-4 text-[#2E4D34]" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 my-1" />
            ) : (
              <div className="text-2xl font-serif font-bold text-[#2E4D34]">
                {formatRupees(summary?.platform_revenue || 0)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0EDE6] text-[11px] text-[#5F6D61]">
            On vendor sales of {formatRupees(summary?.vendor_sales || 0)} · First-party sales{' '}
            {formatRupees(summary?.first_party_sales || 0)}
          </div>
        </div>

        {/* Disbursed Payouts */}
        <div className="bg-white p-5 rounded-2xl border border-[#EAE5DB] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#8E9B90] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Settled Artisan Disbursals</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 my-1" />
            ) : (
              <div className="text-2xl font-serif font-bold text-emerald-900">
                {formatRupees(summary?.disbursed_total || 0)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0EDE6] text-[11px] text-[#5F6D61]">
            Directly credited to verified artisan bank accounts
          </div>
        </div>

        {/* Pending Settlement */}
        <div className="bg-white p-5 rounded-2xl border border-[#EAE5DB] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#8E9B90] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Settlement Pool</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 my-1" />
            ) : (
              <div className="text-2xl font-serif font-bold text-amber-900">
                {formatRupees(summary?.pending_settlement_total || 0)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F0EDE6] text-[11px] text-[#5F6D61]">
            {summary?.payout_batches_pending
              ? `${summary.payout_batches_pending} batch${summary.payout_batches_pending === 1 ? '' : 'es'} awaiting admin approval`
              : 'No settlement batches pending'}
          </div>
        </div>
      </div>

      {/* Settlements Table Card */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0EDE6] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#223B28]">Artisan Settlement Batches</h2>
            <p className="text-xs text-[#8E9B90] mt-0.5">
              Generated from delivered &amp; paid vendor orders ({liveSettings.marketplace.payout_frequency} cycle, minimum payout ₹
              {liveSettings.marketplace.minimum_payout_amount}).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5F6D61] bg-[#FAF7F2] border border-[#EAE5DB] px-3 py-1.5 rounded-xl font-medium">
              Fee {feePercent}% · TCS {tcsPercent}% (Sec 194-O)
            </span>
            {canDecide('payouts') && (
              <button
                type="button"
                id="admin-generate-batches"
                onClick={handleGenerateBatches}
                disabled={isGeneratingBatches}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] transition-colors disabled:opacity-50 shadow-2xs"
              >
                <RefreshCw className={`w-3 h-3 ${isGeneratingBatches ? 'animate-spin' : ''}`} />
                <span>{isGeneratingBatches ? 'Generating…' : 'Generate Settlement Batches'}</span>
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-xs text-rose-600">Failed to load settlement batches.</div>
        ) : batches.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-8 h-8 text-[#8E9B90]" />}
            title="No settlement batches"
            description="Mark vendor orders as delivered, then click “Generate Settlement Batches”."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#223B28]">
              <thead>
                <tr className="border-b border-[#F0EDE6] text-[11px] font-bold text-[#8E9B90] uppercase tracking-wider bg-[#FAF7F2]">
                  <th className="py-3 px-3">Batch Reference</th>
                  <th className="py-3 px-3">Artisan Merchant</th>
                  <th className="py-3 px-3">Bank Details</th>
                  <th className="py-3 px-3">Gross Sales</th>
                  <th className="py-3 px-3">Deductions</th>
                  <th className="py-3 px-3">Net Payout</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Settlement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE6]">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-[#FDFCF9] transition-colors group">
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-[#223B28]">{batch.batch_number}</span>
                      <p className="text-[10px] text-[#8E9B90] mt-0.5">
                        {new Date(batch.period_start).toLocaleDateString()} – {new Date(batch.period_end).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-[#5F6D61]">{batch.order_count} completed orders</p>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-bold text-[#223B28]">{batch.store_name}</div>
                      <div className="text-[11px] text-[#8E9B90]">{batch.seller_name}</div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 font-medium text-[#223B28]">
                        <Building className="w-3.5 h-3.5 text-[#8E9B90]" />
                        <span>{batch.bank_name}</span>
                      </div>
                      <div className="font-mono text-[11px] text-[#5F6D61] mt-0.5">
                        {batch.account_number_masked}
                      </div>
                      <div className="font-mono text-[10px] text-[#8E9B90]">
                        IFSC: {batch.ifsc_code}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-serif font-bold text-[#223B28]">
                      {formatRupees(batch.gross_sales)}
                    </td>

                    <td className="py-3.5 px-3 text-[11px] text-[#5F6D61]">
                      <div>
                        Fee ({batch.platform_fee_percent}%): <span className="font-mono text-rose-700">-{formatRupees(batch.platform_fee_amount)}</span>
                      </div>
                      <div>
                        TCS: <span className="font-mono text-rose-700">-{formatRupees(batch.tcs_tax_amount)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-serif font-bold text-sm text-[#2E4D34]">
                        {formatRupees(batch.net_payout)}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      {getStatusBadge(batch.status)}
                      {batch.utr_reference && (
                        <div className="font-mono text-[10px] text-[#5F6D61] mt-1">
                          UTR: {batch.utr_reference}
                        </div>
                      )}
                      {batch.notes && (
                        <div className="text-[10px] text-rose-700 mt-1 max-w-xs">{batch.notes}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {batch.status === 'pending_approval' && canDecide('payouts') && (
                        <button
                          type="button"
                          onClick={() => handleApproveBatch(batch)}
                          disabled={isApprovingBatch}
                          className="px-3 py-1.5 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] transition-colors disabled:opacity-50 shadow-2xs"
                        >
                          Approve Batch
                        </button>
                      )}

                      {batch.status === 'processing' && canDecide('payouts') && (
                        <button
                          type="button"
                          onClick={() => handleOpenDisburseModal(batch)}
                          className="px-3 py-1.5 rounded-xl bg-sky-700 text-white text-xs font-semibold hover:bg-sky-800 transition-colors shadow-2xs inline-flex items-center gap-1.5"
                        >
                          <Send className="w-3 h-3" />
                          <span>Record Disbursal</span>
                        </button>
                      )}

                      {batch.status === 'disbursed' && (
                        <span className="text-[11px] font-mono text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                          Settled
                        </span>
                      )}

                      {batch.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => handleApproveBatch(batch)}
                          className="px-2.5 py-1 rounded-lg border border-rose-300 text-rose-800 text-xs font-semibold hover:bg-rose-50"
                        >
                          Retry Batch
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Disbursement Modal */}
      {disburseModalBatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EAE5DB] shadow-2xl max-w-md w-full p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#F0EDE6] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAF1EA] border border-[#D1DDD0] flex items-center justify-center text-[#2E4D34]">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#223B28]">Record Bank Transfer</h3>
                  <p className="text-xs text-[#8E9B90]">Batch {disburseModalBatch.batch_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDisburseModalBatch(null)}
                className="w-8 h-8 rounded-full hover:bg-[#F5F2EB] flex items-center justify-center text-[#8E9B90]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DB] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8E9B90]">Beneficiary:</span>
                <span className="font-bold text-[#223B28]">{disburseModalBatch.seller_name} ({disburseModalBatch.store_name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E9B90]">Bank:</span>
                <span className="font-medium text-[#223B28]">{disburseModalBatch.bank_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E9B90]">Account:</span>
                <span className="font-mono text-[#223B28]">{disburseModalBatch.account_number_masked}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E9B90]">IFSC:</span>
                <span className="font-mono text-[#223B28]">{disburseModalBatch.ifsc_code}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#EAE5DB] font-bold text-sm">
                <span className="text-[#223B28]">Net Disbursal Amount:</span>
                <span className="text-[#2E4D34] font-serif">{formatRupees(disburseModalBatch.net_payout)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#223B28] mb-1.5">
                Bank UTR / Transaction Reference Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. SBIN002938192847"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#D1DDD0] text-xs font-mono bg-white text-[#223B28] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
              />
              <p className="text-[11px] text-[#8E9B90] mt-1">
                Enter the unique UTR code provided by the settlement bank after RTGS/NEFT payment dispatch.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDisburseModalBatch(null)}
                className="px-4 py-2 rounded-xl border border-[#D1DDD0] text-xs font-semibold text-[#5F6D61] hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisbursement}
                disabled={!utrInput.trim() || isDisbursingBatch}
                className="px-4 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] transition-colors disabled:opacity-50 shadow-xs"
              >
                {isDisbursingBatch ? 'Recording...' : 'Confirm Disbursement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinancePage;
