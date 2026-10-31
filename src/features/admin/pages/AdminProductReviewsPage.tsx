import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  X,
  CheckSquare,
  Clock,
  ArrowUpDown,
  ExternalLink,
  Star,
  XCircle,
  Trash2,
  MessageSquare,
  ShieldCheck,
  Package,
  Check,
  Loader2,
} from 'lucide-react';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { PageHeader } from '../../../components/vendor/PageHeader';
import { StatusBadge } from '../../../components/vendor/StatusBadge';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { ErrorState } from '../../../components/vendor/ErrorState';
import { formatINR } from '../../../utils/currency';
import { categories } from '../../../data/categories';
import { axiosClient } from '../../../api/client';
import { useToast } from '../../../components/vendor/Toast';

const SELLABLE_CATEGORIES = categories.filter((c) => c.id !== 'services');

interface CustomerReviewItem {
  id: string;
  product_id: string;
  product_title: string;
  product_sku: string;
  product_image: string;
  user_name: string;
  user_email: string;
  rating: number;
  title: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  verified_purchase: boolean;
  created_at: string;
}

export const AdminProductReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Top Section Mode: Customer Reviews vs Artisan Listing Queue
  const [viewMode, setViewMode] = useState<'customer_reviews' | 'listing_queue'>('customer_reviews');

  /* -------------------------------------------------------------------------- */
  /* CUSTOMER REVIEWS STATE & QUERIES                                           */
  /* -------------------------------------------------------------------------- */
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviewSearchTerm, setReviewSearchTerm] = useState('');

  const {
    data: customerReviewsData,
    isLoading: isLoadingCustomerReviews,
  } = useQuery<{
    results: CustomerReviewItem[];
    count: number;
    status_counts: { all: number; pending: number; approved: number; rejected: number };
  }>({
    queryKey: ['admin-customer-reviews', reviewStatusFilter, reviewSearchTerm],
    queryFn: async () => {
      const res = await axiosClient.get('/api/v1/admin/reviews/', {
        params: {
          status: reviewStatusFilter,
          search: reviewSearchTerm.trim() || undefined,
        },
      });
      return res.data;
    },
    enabled: viewMode === 'customer_reviews',
  });

  const updateReviewStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      return axiosClient.patch(`/api/v1/admin/reviews/${id}/status/`, { status });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer-reviews'] });
      showToast(`Review marked as ${vars.status}.`, 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to update review status.', 'error');
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return axiosClient.delete(`/api/v1/admin/reviews/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer-reviews'] });
      showToast('Review permanently deleted.', 'info');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to delete review.', 'error');
    },
  });

  /* -------------------------------------------------------------------------- */
  /* ARTISAN LISTINGS QUEUE STATE & QUERIES                                     */
  /* -------------------------------------------------------------------------- */
  const currentStatus = searchParams.get('status') || 'pending_review';
  const currentCategory = searchParams.get('category') || '';
  const currentSeller = searchParams.get('seller') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentOrdering = searchParams.get('ordering') || 'submitted_asc';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = 10;

  const [searchInput, setSearchInput] = useState(currentSearch);

  const queryParams = useMemo(
    () => ({
      status: currentStatus,
      category: currentCategory || undefined,
      seller: currentSeller || undefined,
      search: currentSearch || undefined,
      ordering: currentOrdering,
      page: currentPage,
      page_size: pageSize,
    }),
    [currentStatus, currentCategory, currentSeller, currentSearch, currentOrdering, currentPage]
  );

  const { data, isLoading, isError, refetch } = useAdminProducts(queryParams);

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    setSearchParams(next);
  };

  const handleStatusTab = (status: string) => {
    updateParams({ status, page: '1' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput.trim() || null, page: '1' });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams({ status: 'pending_review', ordering: 'submitted_asc' }));
  };

  const hasActiveFilters = Boolean(
    currentCategory || currentSeller || currentSearch || currentStatus !== 'pending_review'
  );

  const listingStatusTabs = [
    { id: 'pending_review', label: 'Pending Review', count: data?.status_counts?.pending_review ?? 0 },
    { id: 'approved', label: 'Approved', count: data?.status_counts?.approved ?? 0 },
    { id: 'rejected', label: 'Rejected', count: data?.status_counts?.rejected ?? 0 },
    { id: 'all', label: 'All Submissions', count: data?.status_counts?.all ?? 0 },
  ];

  const reviewStatusTabs = [
    { id: 'all', label: 'All Reviews', count: customerReviewsData?.status_counts?.all ?? 0 },
    { id: 'pending', label: 'Pending Moderation', count: customerReviewsData?.status_counts?.pending ?? 0 },
    { id: 'approved', label: 'Approved (Live)', count: customerReviewsData?.status_counts?.approved ?? 0 },
    { id: 'rejected', label: 'Rejected', count: customerReviewsData?.status_counts?.rejected ?? 0 },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Product Reviews & Moderation"
        description="Moderate customer product ratings & testimonials, and approve artisan catalog submissions before they go live on ChillyFlakes."
      />

      {/* Primary Mode Switcher (Customer Reviews vs Artisan Listings Queue) */}
      <div className="flex items-center gap-2 border-b border-[#EAE5DB] pb-3">
        <button
          type="button"
          onClick={() => setViewMode('customer_reviews')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            viewMode === 'customer_reviews'
              ? 'bg-[#2E4D34] text-white shadow-xs'
              : 'text-[#5F6D61] hover:text-[#223B28] hover:bg-[#FAF7F2]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Customer Product Reviews</span>
          {(customerReviewsData?.status_counts?.pending ?? 0) > 0 && (
            <span className="bg-amber-400 text-amber-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {customerReviewsData?.status_counts?.pending}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setViewMode('listing_queue')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            viewMode === 'listing_queue'
              ? 'bg-[#2E4D34] text-white shadow-xs'
              : 'text-[#5F6D61] hover:text-[#223B28] hover:bg-[#FAF7F2]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Artisan Product Listings Queue</span>
          {(data?.status_counts?.pending_review ?? 0) > 0 && (
            <span className="bg-amber-400 text-amber-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {data?.status_counts?.pending_review}
            </span>
          )}
        </button>
      </div>

      {/* ==================================================================== */}
      {/* MODE 1: CUSTOMER REVIEWS MODERATION                                   */}
      {/* ==================================================================== */}
      {viewMode === 'customer_reviews' && (
        <div className="space-y-4">
          {/* Status Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {reviewStatusTabs.map((tab) => {
              const active = reviewStatusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReviewStatusFilter(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#2E4D34] text-white shadow-xs'
                      : 'bg-white border border-[#EAE5DB] text-[#5F6D61] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-white/20 text-white' : 'bg-[#EAE5DB] text-[#5F6D61]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 shadow-xs flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8E9B90] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={reviewSearchTerm}
                onChange={(e) => setReviewSearchTerm(e.target.value)}
                placeholder="Search reviews by customer name, email, product, or keyword..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#EAE5DB] bg-[#FAF7F2]/60 text-xs sm:text-sm text-[#223B28] placeholder-[#8E9B90] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] focus:bg-white transition-all"
              />
            </div>
            {reviewSearchTerm && (
              <button
                type="button"
                onClick={() => setReviewSearchTerm('')}
                className="px-3 py-2 text-xs font-semibold text-[#8E9B90] hover:text-[#223B28] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Reviews List */}
          {isLoadingCustomerReviews ? (
            <div className="py-16 text-center text-[#5F6D61] text-xs bg-white rounded-2xl border border-[#EAE5DB]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2E4D34]" />
              Loading customer reviews...
            </div>
          ) : !customerReviewsData || customerReviewsData.results.length === 0 ? (
            <div className="py-16 text-center text-[#5F6D61] space-y-2 bg-white rounded-2xl border border-[#EAE5DB] shadow-xs">
              <MessageSquare className="w-8 h-8 text-[#8E9B90] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#223B28]">No customer reviews found</p>
              <p className="text-xs text-[#8E9B90]">
                {reviewStatusFilter !== 'all' || reviewSearchTerm
                  ? 'No reviews match your selected filter.'
                  : 'Customer reviews submitted through product pages will appear here for moderation.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customerReviewsData.results.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-xs space-y-3 hover:border-[#2E4D34]/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAE5DB]/60 pb-3">
                    {/* Product & User Details */}
                    <div className="flex items-center gap-3">
                      <img
                        src={rev.product_image}
                        alt={rev.product_title}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-[#EAE5DB]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <div>
                        <p className="font-semibold text-xs sm:text-sm text-[#223B28]">
                          {rev.product_title} <span className="font-mono text-[11px] text-[#8E9B90]">({rev.product_sku})</span>
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-[#5F6D61]">
                          <span className="font-medium text-[#223B28]">{rev.user_name}</span>
                          {rev.user_email && <span>• {rev.user_email}</span>}
                          <span>• {new Date(rev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {rev.verified_purchase && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF1EA] text-[#2E4D34]">
                          <ShieldCheck className="w-3 h-3" /> Verified Purchase
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          rev.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rev.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rev.status}
                      </span>
                    </div>
                  </div>

                  {/* Rating Stars and Comment */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-[#FBBF24]">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-current' : 'text-[#D5C9B3]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-xs text-[#223B28]">{rev.title}</span>
                    </div>
                    <p className="text-xs text-[#506052] leading-relaxed bg-[#FAF7F2] p-3 rounded-xl border border-[#EAE5DB]">
                      &quot;{rev.comment}&quot;
                    </p>
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#EAE5DB]/60">
                    {rev.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => updateReviewStatusMutation.mutate({ id: rev.id, status: 'approved' })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Publish</span>
                      </button>
                    )}

                    {rev.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => updateReviewStatusMutation.mutate({ id: rev.id, status: 'rejected' })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-rose-200"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Permanently delete this customer review?')) {
                          deleteReviewMutation.mutate(rev.id);
                        }
                      }}
                      className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer ml-1"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODE 2: ARTISAN PRODUCT LISTINGS QUEUE                               */}
      {/* ==================================================================== */}
      {viewMode === 'listing_queue' && (
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="border-b border-[#EAE5DB] -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
            <nav className="flex space-x-1 sm:space-x-2 min-w-max pb-2" aria-label="Review Queue Tabs">
              {listingStatusTabs.map((tab) => {
                const isActive = currentStatus === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleStatusTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#2E4D34] text-white shadow-xs'
                        : 'text-[#5F6D61] hover:text-[#223B28] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#EAE5DB] text-[#5F6D61]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
              <form onSubmit={handleSearchSubmit} className="lg:col-span-5 relative">
                <Search className="w-4 h-4 text-[#8E9B90] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by title, SKU or seller..."
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-[#EAE5DB] bg-[#FAF7F2]/60 text-xs sm:text-sm text-[#223B28] placeholder-[#8E9B90] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] focus:bg-white transition-all"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      updateParams({ search: null, page: '1' });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9B90] hover:text-[#223B28]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              <div className="lg:col-span-3">
                <select
                  value={currentCategory}
                  onChange={(e) => updateParams({ category: e.target.value || null, page: '1' })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE5DB] bg-white text-xs sm:text-sm text-[#223B28] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {SELLABLE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-4">
                <div className="relative">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#8E9B90] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={currentOrdering}
                    onChange={(e) => updateParams({ ordering: e.target.value, page: '1' })}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#EAE5DB] bg-white text-xs sm:text-sm text-[#223B28] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] cursor-pointer"
                  >
                    <option value="submitted_asc">Oldest Submitted (Queue Order)</option>
                    <option value="submitted_desc">Newest Submitted First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-[#EAE5DB]/60 text-xs">
                <span className="text-[#5F6D61]">Filtering results</span>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#DC2626] hover:text-[#991B1B] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              </div>
            )}
          </div>

          {/* Review Queue Table */}
          {isError ? (
            <ErrorState
              title="Failed to load review queue"
              message="Could not connect to moderation database. Please check your connection and retry."
              onRetry={() => refetch()}
            />
          ) : isLoading ? (
            <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-[#EAE5DB]/60 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-1/3 h-4 bg-[#EAE5DB]/70 rounded" />
                    <div className="w-1/4 h-3 bg-[#EAE5DB]/40 rounded" />
                  </div>
                  <div className="w-24 h-4 bg-[#EAE5DB]/50 rounded" />
                </div>
              ))}
            </div>
          ) : data?.results.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="w-8 h-8 text-[#8E9B90]" />}
              title={
                currentStatus === 'pending_review'
                  ? 'No products waiting for review'
                  : 'No matching products found'
              }
              description={
                currentStatus === 'pending_review'
                  ? 'All submitted artisan products have been reviewed! Check back when sellers submit new listings.'
                  : 'Try clearing your search query or filters to view other products.'
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#EAE5DB] bg-white shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#EAE5DB] text-xs font-semibold text-[#5F6D61] uppercase tracking-wider">
                    <th scope="col" className="py-3.5 px-4 w-[34%]">Product Listing</th>
                    <th scope="col" className="py-3.5 px-4">Seller / Studio</th>
                    <th scope="col" className="py-3.5 px-4">Category</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Price</th>
                    <th scope="col" className="py-3.5 px-4">Submitted Date</th>
                    <th scope="col" className="py-3.5 px-4">Status</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5DB] text-xs sm:text-sm">
                  {data?.results.map((product) => {
                    const submittedFormatted = new Date(product.submitted_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr
                        key={product.id}
                        onClick={() => navigate(`/admin/product-reviews/${product.id}`)}
                        className="hover:bg-[#FAF7F2]/70 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.main_image_url}
                              alt={product.title}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80';
                              }}
                              className="w-12 h-12 rounded-xl object-cover border border-[#EAE5DB] bg-[#FAF7F2] flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[#223B28] truncate group-hover:text-[#2E4D34] transition-colors">
                                {product.title}
                              </p>
                              <span className="font-mono text-[11px] text-[#8E9B90]">{product.sku}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-[#223B28]">
                          {product.seller.store_name}
                        </td>
                        <td className="py-3.5 px-4 text-[#5F6D61] whitespace-nowrap">
                          {product.category.name}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#223B28] whitespace-nowrap">
                          {formatINR(product.price_paise)}
                        </td>
                        <td className="py-3.5 px-4 text-[#5F6D61] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#8E9B90]" />
                            <span>{submittedFormatted}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={product.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAE5DB] bg-white group-hover:bg-[#2E4D34] group-hover:text-white text-xs font-semibold text-[#2E4D34] transition-all">
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminProductReviewsPage;
