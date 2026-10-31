import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Star,
  Search,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '../../../components/vendor/PageHeader';
import { StatCard } from '../../../components/vendor/StatCard';
import { Pagination } from '../../../components/vendor/Pagination';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { ErrorState } from '../../../components/vendor/ErrorState';
import { getVendorReviews } from '../../../api/vendorPortalApi';

export const VendorReviewsPage: React.FC = () => {
  const [ratingFilter, setRatingFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['vendor-reviews', ratingFilter, search, page],
    queryFn: () => getVendorReviews({
      rating: ratingFilter,
      search: search || undefined,
      page,
      page_size: pageSize,
    }),
  });

  const reviews = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const verifiedCount = reviews.filter((r) => r.verified_purchase).length;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Customer Reviews"
        description="Genuine feedback and star ratings from buyers who purchased your artisan creations."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Average Rating"
          value={`${avgRating} / 5.0`}
          subtext="Based on approved buyer reviews"
          icon={<Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
        />
        <StatCard
          label="Total Reviews"
          value={totalCount}
          icon={<MessageSquare className="w-5 h-5 text-[#2E4D34]" />}
        />
        <StatCard
          label="Verified Purchases"
          value={`${verifiedCount} / ${reviews.length}`}
          subtext="Confirmed delivery before review"
          icon={<ShieldCheck className="w-5 h-5 text-[#2E4D34]" />}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { label: 'All Ratings', value: 'all' },
            { label: '5 Stars ★', value: '5' },
            { label: '4 Stars ★', value: '4' },
            { label: '3 Stars ★', value: '3' },
            { label: '1-2 Stars ★', value: '2' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setRatingFilter(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                ratingFilter === tab.value
                  ? 'bg-[#2E4D34] text-white shadow-xs'
                  : 'bg-[#FAF7F2] text-[#4F5E51] hover:bg-[#EAE5DB]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-[#8E9B90] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search reviews or products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
          />
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#2E4D34] mb-3" />
          <p className="text-xs font-medium text-[#637365]">Loading customer reviews...</p>
        </div>
      ) : isError ? (
        <ErrorState message="Failed to load customer reviews." onRetry={refetch} />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No reviews found"
          description={
            search || ratingFilter !== 'all'
              ? 'No customer reviews match your active filter.'
              : 'Your products have not received any customer reviews yet. As verified buyers receive their orders, their ratings will appear here.'
          }
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-xs hover:border-[#2E4D34]/40 transition-all space-y-3"
            >
              {/* Product Info Bar */}
              <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={r.product_image || '/botanical-care-banner.jpg'}
                    alt={r.product_title}
                    className="w-10 h-10 rounded-lg object-cover bg-[#FAF7F2]"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#223B28]">{r.product_title}</h4>
                    <p className="text-[11px] text-[#8E9B90]">
                      Review by <strong className="text-[#4F5E51]">{r.customer_name}</strong> •{' '}
                      {new Date(r.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {r.verified_purchase && (
                  <span className="flex items-center gap-1 text-[11px] text-[#2E4D34] bg-[#EAF1EA] px-2 py-0.5 rounded-full font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Purchase
                  </span>
                )}
              </div>

              {/* Star Rating & Comment */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= r.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-stone-200 fill-stone-100'
                      }`}
                    />
                  ))}
                  {r.title && (
                    <span className="font-semibold text-xs text-[#223B28] ml-2">{r.title}</span>
                  )}
                </div>

                <p className="text-xs text-[#4F5E51] leading-relaxed pt-1">{r.comment}</p>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default VendorReviewsPage;
