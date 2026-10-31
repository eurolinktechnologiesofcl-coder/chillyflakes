import React, { useState } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { useAdminSellers, useAdminSellerMutations } from '../hooks/useAdminSellers';
import { useToast } from '../../../components/vendor/Toast';
import { Pagination } from '../../../components/vendor/Pagination';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { Skeleton } from '../../../components/vendor/Skeleton';
import { AdminSellerReviewModal } from '../components/AdminSellerReviewModal';
import type { SellerOnboardingStatus } from '../../../types/admin';

export const AdminSellersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: routeSellerId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  // Query Params
  const statusParam = (searchParams.get('status') || 'under_review') as SellerOnboardingStatus | 'all';
  const search = searchParams.get('search') || '';
  const businessType = searchParams.get('type') || 'all';
  const stateFilter = searchParams.get('state') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('page_size') || '25', 10);

  // Review Modal selection (from route param or local state)
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(routeSellerId || null);

  const toast = useToast();
  const { approveSeller, isApproving } = useAdminSellerMutations();

  const handleQuickApprove = async (id: string, name: string) => {
    try {
      await approveSeller({ sellerId: id, reason: 'Approved by administrator' });
      toast.success(`Merchant "${name}" approved successfully!`);
      refetch();
    } catch {
      toast.error('Failed to approve merchant');
    }
  };

  const { data, isLoading, isError, refetch, isFetching } = useAdminSellers({
    status: statusParam !== 'all' ? statusParam : undefined,
    search: search || undefined,
    business_type: businessType !== 'all' ? businessType : undefined,
    state: stateFilter !== 'all' ? stateFilter : undefined,
    page,
    page_size: pageSize,
  });

  const updateParams = (updates: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === '' || v === 'all') {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    });
    setSearchParams(next);
  };

  const handleTabChange = (newStatus: SellerOnboardingStatus | 'all') => {
    updateParams({ status: newStatus, page: 1 });
  };

  const handleSearchChange = (val: string) => {
    updateParams({ search: val, page: 1 });
  };

  const sellers = data?.results || [];
  const counts = data?.tab_counts;
  const pendingCount = counts?.under_review ?? 0;

  return (
    <div className="space-y-6 pb-16 animate-fadeIn max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#EAE5DB] pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2E4D34] bg-[#EAF1EA] px-2.5 py-1 rounded-md">
            Merchant Operations
          </span>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#223B28]">
              Vendor & Seller Hub
            </h1>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => handleTabChange('under_review')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF3E0] text-[#8A5A00] border border-[#F3E2B8] hover:bg-[#F6ECDA] transition-colors shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingCount} pending reviews</span>
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#5F6D61] mt-1">
            Review onboarding applications, verify merchant KYC documents, and monitor seller status.
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
        </div>
      </div>

      {/* Tabs with Counts */}
      <div className="flex items-center border-b border-[#EAE5DB] gap-2 overflow-x-auto">
        {[
          { key: 'under_review', label: 'Under Review' },
          { key: 'resubmission_requested', label: 'Resubmission Requested' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'suspended', label: 'Suspended' },
          { key: 'all', label: 'All Merchants' },
        ].map((tab) => {
          const tabKey = tab.key as SellerOnboardingStatus | 'all';
          const isActive = statusParam === tabKey;
          const count = counts ? (counts as any)[tabKey] : undefined;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tabKey)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-[#2E4D34] text-[#2E4D34]'
                  : 'border-transparent text-[#5F6D61] hover:text-[#223B28]'
              }`}
            >
              <span>{tab.label}</span>
              {count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-[#EAF1EA] text-[#2E4D34]' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Toolbar: Search, Business Type, State, Page Size */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9B90]" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by store name, legal entity, or PAN..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#D1DDD0] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] bg-[#FAF7F2]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Business Type Filter */}
          <select
            value={businessType}
            onChange={(e) => updateParams({ type: e.target.value, page: 1 })}
            className="text-xs px-3 py-2 rounded-xl border border-[#D1DDD0] bg-white text-[#223B28] focus:outline-none focus:ring-2 focus:ring-[#2E4D34]"
          >
            <option value="all">All Entity Types</option>
            <option value="individual">Individual</option>
            <option value="small_business">Small Business</option>
            <option value="registered_company">Registered Company</option>
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => updateParams({ page_size: e.target.value, page: 1 })}
            className="text-xs px-3 py-2 rounded-xl border border-[#D1DDD0] bg-white text-[#223B28] focus:outline-none focus:ring-2 focus:ring-[#2E4D34]"
          >
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>

      {/* Sellers DataTable & Responsive Mobile Cards */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-xs text-red-600">
            Failed to load merchants. Please check your connection and retry.
          </div>
        ) : sellers.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              title="No Merchants in Queue"
              description="No seller onboarding records match the selected status or search query."
              action={{
                label: 'View All Merchants',
                onClick: () => updateParams({ status: 'all', search: '', type: 'all', page: 1 }),
              }}
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF7F2] text-[#8E9B90] border-b border-[#EAE5DB] uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Merchant & Store</th>
                    <th className="py-3 px-4">Jurisdiction & Tax ID</th>
                    <th className="py-3 px-4">Business Type</th>
                    <th className="py-3 px-4">KYC Documents</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDE6] text-[#223B28]">
                  {sellers.map((seller) => {
                    const isFullyVerified =
                      seller.verified_docs_count > 0 &&
                      seller.verified_docs_count === seller.total_required_docs_count;
                    const hasNoDocs = seller.verified_docs_count === 0 && seller.total_required_docs_count === 0;

                    return (
                      <tr key={seller.id} className="hover:bg-[#FDFCF9] transition-colors">
                        {/* Merchant & Store */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-xs text-[#223B28]">{seller.store_name}</div>
                          <div className="text-[11px] text-[#5F6D61] mt-0.5">{seller.legal_name}</div>
                          <span className="font-mono text-[10px] text-[#8E9B90]">/{seller.store_slug}</span>
                        </td>

                        {/* Jurisdiction & Tax ID */}
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-[#223B28] block">{seller.jurisdiction}</span>
                          <span className="font-mono text-[11px] text-[#5F6D61] block mt-0.5">
                            PAN: {seller.pan_masked}
                          </span>
                        </td>

                        {/* Business Type */}
                        <td className="py-3.5 px-4 capitalize font-medium text-[#5F6D61]">
                          {seller.business_type.replace('_', ' ')}
                        </td>

                        {/* KYC Documents Badge */}
                        <td className="py-3.5 px-4">
                          {hasNoDocs ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                              No documents uploaded
                            </span>
                          ) : isFullyVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              All verified ({seller.verified_docs_count}/{seller.total_required_docs_count})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {seller.verified_docs_count} of {seller.total_required_docs_count} verified
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              seller.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : seller.status === 'under_review'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : seller.status === 'resubmission_requested'
                                ? 'bg-orange-50 text-orange-800 border-orange-200'
                                : seller.status === 'suspended'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }`}
                          >
                            {seller.status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {seller.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleQuickApprove(seller.id, seller.store_name)}
                                disabled={isApproving}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedSellerId(seller.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2E4D34] hover:bg-[#233B28] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden divide-y divide-[#EAE5DB]">
              {sellers.map((seller) => (
                <div key={seller.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-xs text-[#223B28]">{seller.store_name}</h3>
                      <p className="text-[11px] text-[#5F6D61]">{seller.legal_name}</p>
                      <p className="font-mono text-[10px] text-[#8E9B90]">/{seller.store_slug}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        seller.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {seller.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#F0EDE6]">
                    <span className="text-[#5F6D61]">
                      KYC: {seller.verified_docs_count}/{seller.total_required_docs_count} verified
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSellerId(seller.id)}
                      className="px-3 py-1 rounded-xl bg-[#2E4D34] text-white font-semibold text-xs"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-[#EAE5DB] bg-[#FAF7F2]">
              <Pagination
                currentPage={page}
                totalItems={data?.count || 0}
                pageSize={pageSize}
                onPageChange={(p) => updateParams({ page: p })}
              />
            </div>
          </>
        )}
      </div>

      {/* SELLER REVIEW MODAL / DRAWER */}
      {selectedSellerId && (
        <AdminSellerReviewModal
          sellerId={selectedSellerId}
          onClose={() => {
            setSelectedSellerId(null);
            if (routeSellerId) {
              navigate('/admin/people/sellers');
            }
          }}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default AdminSellersPage;
