import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  Filter,
  X,
  AlertCircle,
  MoreVertical,
  Edit2,
  Copy,
  Undo2,
  EyeOff,
  Eye,
  Archive,
  Trash2,
  Info,
  Package,
} from 'lucide-react';

import { useVendorProducts } from '../hooks/useVendorProducts';
import { useProductMutations } from '../hooks/useProductMutations';
import { PageHeader } from '../../../components/vendor/PageHeader';
import { StatusBadge } from '../../../components/vendor/StatusBadge';
import { Pagination } from '../../../components/vendor/Pagination';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { ErrorState } from '../../../components/vendor/ErrorState';
import { ConfirmDialog } from '../../../components/vendor/ConfirmDialog';
import { useToast } from '../../../components/vendor/Toast';
import { formatINR } from '../../../utils/currency';
import { categories } from '../../../data/categories';
import type { VendorProduct, ProductOrdering } from '../../../types/product';

// Sellable physical product categories (strictly 7, excluding services)
const SELLABLE_CATEGORIES = categories.filter((c) => c.id !== 'services');

export const VendorProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state synchronization
  const currentStatus = searchParams.get('status') || 'all';
  const currentCategory = searchParams.get('category') || '';
  const currentWholesale = searchParams.get('wholesale') || '';
  const currentLowStock = searchParams.get('low_stock') === 'true';
  const currentSearch = searchParams.get('search') || '';
  const currentOrdering = (searchParams.get('ordering') as ProductOrdering) || 'updated_desc';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = 10;

  // Local state
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal states
  const [deleteProductTarget, setDeleteProductTarget] = useState<VendorProduct | null>(null);
  const [archiveProductTarget, setArchiveProductTarget] = useState<VendorProduct | null>(null);

  // Fetch products query
  const queryParams = useMemo(
    () => ({
      status: currentStatus,
      category: currentCategory || undefined,
      wholesale: currentWholesale === 'true' ? true : currentWholesale === 'false' ? false : undefined,
      low_stock: currentLowStock ? true : undefined,
      search: currentSearch || undefined,
      ordering: currentOrdering,
      page: currentPage,
      page_size: pageSize,
    }),
    [currentStatus, currentCategory, currentWholesale, currentLowStock, currentSearch, currentOrdering, currentPage]
  );

  const { data, isLoading, isError, refetch } = useVendorProducts(queryParams);

  // Mutations
  const {
    duplicateMutation,
    withdrawMutation,
    unpublishMutation,
    republishMutation,
    archiveMutation,
    deleteMutation,
  } = useProductMutations();

  // Helper to update search params
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
    updateParams({ status: status === 'all' ? null : status, page: '1' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput.trim() || null, page: '1' });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(
    currentCategory || currentWholesale || currentLowStock || currentSearch || currentStatus !== 'all'
  );

  // Actions
  const handleDuplicate = async (product: VendorProduct) => {
    setActiveMenuId(null);
    try {
      await duplicateMutation.mutateAsync(product.id);
      toast.success(t('vendorProducts.toastDuplicated', 'Product duplicated successfully as a draft.'));
    } catch {
      toast.error('Failed to duplicate product.');
    }
  };

  const handleWithdraw = async (product: VendorProduct) => {
    setActiveMenuId(null);
    try {
      await withdrawMutation.mutateAsync(product.id);
      toast.success(t('vendorProducts.toastWithdrawn', 'Product withdrawn and moved back to drafts.'));
    } catch {
      toast.error('Failed to withdraw product.');
    }
  };

  const handleUnpublish = async (product: VendorProduct) => {
    setActiveMenuId(null);
    try {
      await unpublishMutation.mutateAsync(product.id);
      toast.info(t('vendorProducts.toastUnpublished', 'Product unpublished and hidden from store.'));
    } catch {
      toast.error('Failed to unpublish product.');
    }
  };

  const handleRepublish = async (product: VendorProduct) => {
    setActiveMenuId(null);
    try {
      await republishMutation.mutateAsync(product.id);
      toast.success(t('vendorProducts.toastRepublished', 'Product republished and is now live.'));
    } catch {
      toast.error('Failed to republish product.');
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveProductTarget) return;
    try {
      await archiveMutation.mutateAsync(archiveProductTarget.id);
      toast.info(t('vendorProducts.toastArchived', 'Product archived.'));
    } catch {
      toast.error('Failed to archive product.');
    } finally {
      setArchiveProductTarget(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProductTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteProductTarget.id);
      toast.success(t('vendorProducts.toastDeleted', 'Draft product deleted.'));
    } catch {
      toast.error('Failed to delete draft product.');
    } finally {
      setDeleteProductTarget(null);
    }
  };

  const statusTabs: { id: string; label: string; count: number }[] = [
    { id: 'all', label: t('vendorProducts.tabAll', 'All'), count: data?.status_counts?.all ?? 0 },
    { id: 'approved', label: t('vendorProducts.tabApproved', 'Live'), count: data?.status_counts?.approved ?? 0 },
    { id: 'pending_review', label: t('vendorProducts.tabPendingReview', 'Under Review'), count: data?.status_counts?.pending_review ?? 0 },
    { id: 'draft', label: t('vendorProducts.tabDraft', 'Drafts'), count: data?.status_counts?.draft ?? 0 },
    { id: 'rejected', label: t('vendorProducts.tabRejected', 'Rejected'), count: data?.status_counts?.rejected ?? 0 },
    { id: 'unpublished', label: t('vendorProducts.tabUnpublished', 'Unpublished'), count: data?.status_counts?.unpublished ?? 0 },
    { id: 'archived', label: t('vendorProducts.tabArchived', 'Archived'), count: data?.status_counts?.archived ?? 0 },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header with Add Product CTA */}
      <PageHeader
        title={t('vendorProducts.title', 'My Products')}
        description={t('vendorProducts.subtitle', 'Manage your product catalogue, stock levels, and review submissions.')}
        breadcrumbs={[
          { label: t('vendorNav.dashboard', 'Dashboard'), href: '/vendor/dashboard' },
          { label: t('vendorProducts.title', 'Products') },
        ]}
        actions={
          <Link
            to="/vendor/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2E4D34] hover:bg-[#233B28] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2E4D34]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('vendorProducts.addProduct', 'Add Product')}</span>
          </Link>
        }
      />

      {/* 2. Platform Review Info Banner */}
      {!bannerDismissed && (
        <div className="relative overflow-hidden rounded-2xl border border-[#D1DDD0] bg-[#EAF1EA]/70 p-4 sm:p-4.5 text-xs sm:text-sm text-[#223B28] flex items-start gap-3 shadow-2xs">
          <div className="w-7 h-7 rounded-lg bg-[#2E4D34]/10 text-[#2E4D34] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="flex-1 pr-6 leading-relaxed">
            <p className="font-semibold text-[#223B28]">
              {t(
                'vendorProducts.infoBanner',
                'New and edited products are reviewed by ChillyFlakes before they go live. This usually takes 1-2 working days.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="p-1 rounded-lg text-[#5F6D61] hover:text-[#223B28] hover:bg-black/5 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Status Filter Tabs */}
      <div className="border-b border-[#EAE5DB] -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
        <nav className="flex space-x-1 sm:space-x-2 min-w-max pb-2" aria-label="Product Status Tabs">
          {statusTabs.map((tab) => {
            const isActive = currentStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleStatusTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
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

      {/* 4. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-[#8E9B90] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('vendorProducts.searchPlaceholder', 'Search by product title or SKU...')}
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

          {/* Category Dropdown (Strictly 7 Sellable Categories) */}
          <div className="lg:col-span-3">
            <select
              value={currentCategory}
              onChange={(e) => updateParams({ category: e.target.value || null, page: '1' })}
              className="w-full px-3 py-2 rounded-xl border border-[#EAE5DB] bg-white text-xs sm:text-sm text-[#223B28] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] cursor-pointer"
            >
              <option value="">{t('vendorProducts.allCategories', 'All Categories')}</option>
              {SELLABLE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Wholesale Filter */}
          <div className="lg:col-span-2">
            <select
              value={currentWholesale}
              onChange={(e) => updateParams({ wholesale: e.target.value || null, page: '1' })}
              className="w-full px-3 py-2 rounded-xl border border-[#EAE5DB] bg-white text-xs sm:text-sm text-[#223B28] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] cursor-pointer"
            >
              <option value="">{t('vendorProducts.wholesaleAll', 'All Types')}</option>
              <option value="true">{t('vendorProducts.wholesaleOnly', 'Wholesale Only')}</option>
              <option value="false">{t('vendorProducts.retailOnly', 'Retail Only')}</option>
            </select>
          </div>

          {/* Ordering Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={currentOrdering}
              onChange={(e) => updateParams({ ordering: e.target.value as ProductOrdering, page: '1' })}
              className="w-full px-3 py-2 rounded-xl border border-[#EAE5DB] bg-white text-xs sm:text-sm text-[#223B28] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] cursor-pointer"
            >
              <option value="updated_desc">{t('vendorProducts.sortRecentlyUpdated', 'Recently Updated')}</option>
              <option value="updated_asc">{t('vendorProducts.sortOldestUpdated', 'Oldest Updated')}</option>
              <option value="price_asc">{t('vendorProducts.sortPriceLow', 'Price: Low to High')}</option>
              <option value="price_desc">{t('vendorProducts.sortPriceHigh', 'Price: High to Low')}</option>
              <option value="stock_asc">{t('vendorProducts.sortStockLow', 'Stock: Low to High')}</option>
              <option value="stock_desc">{t('vendorProducts.sortStockHigh', 'Stock: High to Low')}</option>
            </select>
          </div>
        </div>

        {/* Low Stock Toggle & Clear Filter Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EAE5DB]/60 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={currentLowStock}
              onChange={(e) => updateParams({ low_stock: e.target.checked ? 'true' : null, page: '1' })}
              className="w-4 h-4 rounded text-[#2E4D34] focus:ring-[#2E4D34] border-[#D1DDD0]"
            />
            <span className="font-medium text-[#5F6D61]">
              {t('vendorProducts.filterLowStock', 'Low Stock (≤ 5)')}
            </span>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626] hover:text-[#991B1B] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('vendorProducts.clearFilters', 'Clear Filters')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Products Content Area */}
      {isError ? (
        <ErrorState
          title="Failed to load products"
          message="There was an error retrieving your product inventory. Please check your network and try again."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-[#EAE5DB]/60 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-1/3 h-4 bg-[#EAE5DB]/70 rounded" />
                <div className="w-1/4 h-3 bg-[#EAE5DB]/40 rounded" />
              </div>
              <div className="w-20 h-4 bg-[#EAE5DB]/50 rounded" />
              <div className="w-16 h-6 bg-[#EAE5DB]/40 rounded-full" />
            </div>
          ))}
        </div>
      ) : data?.results.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8 text-[#8E9B90]" />}
          title={t('vendorProducts.emptyTitle', 'No products found')}
          description={t(
            'vendorProducts.emptyDescription',
            "You haven't added any products yet, or no products match your active filters."
          )}
          action={
            hasActiveFilters
              ? {
                  label: t('vendorProducts.emptyReset', 'Clear filters to see all products'),
                  onClick: handleClearFilters,
                  icon: <Filter className="w-3.5 h-3.5" />,
                }
              : {
                  label: t('vendorProducts.addProduct', 'Add Product'),
                  href: '/vendor/products/new',
                  icon: <Plus className="w-3.5 h-3.5" />,
                }
          }
        />
      ) : (
        <div className="space-y-4">
          {/* ======================================================== */}
          {/* DESKTOP DATA TABLE */}
          {/* ======================================================== */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-[#EAE5DB] bg-white shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#EAE5DB] text-xs font-semibold text-[#5F6D61] uppercase tracking-wider">
                  <th scope="col" className="py-3.5 px-4 w-[36%]">
                    {t('vendorProducts.colProduct', 'Product')}
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    {t('vendorProducts.colCategory', 'Category')}
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right">
                    {t('vendorProducts.colPrice', 'Price')}
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-center">
                    {t('vendorProducts.colStock', 'Stock')}
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-center">
                    {t('vendorProducts.colColors', 'Colors')}
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    {t('vendorProducts.colStatus', 'Status')}
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right">
                    {t('vendorProducts.colActions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5DB] text-xs sm:text-sm">
                {data?.results.map((product) => {
                  const isRejected = product.status === 'rejected';
                  const isPending = product.status === 'pending_review';
                  const isDraft = product.status === 'draft';
                  const isApproved = product.status === 'approved';
                  const isUnpublished = product.status === 'unpublished';
                  const isArchived = product.status === 'archived';

                  return (
                    <React.Fragment key={product.id}>
                      <tr className="hover:bg-[#FAF7F2]/60 transition-colors">
                        {/* Product Thumbnail, Title, SKU */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.main_image_url}
                              alt={product.title}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/botanical-care-banner.jpg';
                              }}
                              className="w-12 h-12 rounded-xl object-cover border border-[#EAE5DB] bg-[#FAF7F2] flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[#223B28] truncate hover:text-[#2E4D34] transition-colors">
                                {product.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[11px] text-[#8E9B90]">
                                  {product.sku}
                                </span>
                                {product.wholesale_enabled && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FAF3E0] text-[#8A5A00] border border-[#F3E2B8] px-1.5 py-0.2 rounded">
                                    Wholesale
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 text-[#5F6D61]">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-[#223B28]">
                                {product.category?.name || product.requested_category_name || 'Other'}
                              </span>
                              {product.is_custom_category && product.status !== 'approved' && (
                                <span
                                  title="Waiting for ChillyFlakes to place this product in a category"
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF1EA] text-[#2E4D34] border border-[#2E4D34]/20 cursor-help whitespace-nowrap"
                                >
                                  Custom category
                                </span>
                              )}
                            </div>
                            {product.status === 'approved' &&
                              product.original_requested_category &&
                              product.original_requested_category.toLowerCase() !== (product.category?.name || '').toLowerCase() && (
                                <p className="text-[11px] text-[#5F6D61] italic leading-tight">
                                  Placed under {product.category?.name} by ChillyFlakes
                                </p>
                              )}
                            {product.requested_subcategory_name && (
                              <p className="text-[11px] text-[#8E9B90]">
                                Sub: {product.requested_subcategory_name}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Price in INR */}
                        <td className="py-3.5 px-4 text-right font-medium text-[#223B28] whitespace-nowrap">
                          {formatINR(product.price_paise)}
                        </td>

                        {/* Stock with visual badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {product.total_stock === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#DC2626] bg-[#FFF0F0] px-2 py-0.5 rounded-full border border-[#FED7D7]">
                              Out of stock
                            </span>
                          ) : product.total_stock <= 5 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8A5A00] bg-[#FAF3E0] px-2 py-0.5 rounded-full border border-[#F3E2B8]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E29D38]" />
                              {product.total_stock} left
                            </span>
                          ) : (
                            <span className="font-semibold text-[#223B28]">
                              {product.total_stock}
                            </span>
                          )}
                        </td>

                        {/* Color Swatch Dots */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {product.colors && product.colors.length > 0 ? (
                            <div className="flex items-center justify-center -space-x-1">
                              {product.colors.slice(0, 4).map((c, cIdx) => (
                                <span
                                  key={cIdx}
                                  title={`${c.name} (${c.hex})`}
                                  className="w-4 h-4 rounded-full border-2 border-white shadow-xs cursor-help"
                                  style={{ backgroundColor: c.hex }}
                                />
                              ))}
                              {product.colors.length > 4 && (
                                <span className="text-[10px] font-bold text-[#5F6D61] bg-[#FAF7F2] border border-[#EAE5DB] rounded-full px-1">
                                  +{product.colors.length - 4}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#B0B8B1]">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={product.status} size="sm" />
                        </td>

                        {/* Actions Menu */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap relative">
                          <div className="inline-flex items-center gap-1">
                            {/* Primary Action Button based on status */}
                            {isPending ? (
                              <button
                                type="button"
                                onClick={() => handleWithdraw(product)}
                                className="px-2.5 py-1 text-xs font-semibold text-[#8A5A00] bg-[#FAF3E0] hover:bg-[#F5E8C8] border border-[#F3E2B8] rounded-lg transition-colors"
                                title="Withdraw submission to edit"
                              >
                                {t('vendorProducts.actionWithdraw', 'Withdraw')}
                              </button>
                            ) : isRejected ? (
                              <Link
                                to={`/vendor/products/${product.id}/edit`}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-[#C53030] hover:bg-[#9B2C2C] rounded-lg transition-colors shadow-2xs"
                              >
                                {t('vendorProducts.actionFixResubmit', 'Fix & Resubmit')}
                              </Link>
                            ) : (
                              <Link
                                to={`/vendor/products/${product.id}/edit`}
                                className="p-1.5 text-[#5F6D61] hover:text-[#2E4D34] hover:bg-[#FAF7F2] rounded-lg transition-colors"
                                title={t('vendorProducts.actionEdit', 'Edit')}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Link>
                            )}

                            {/* Dropdown Menu Toggle */}
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuId(activeMenuId === product.id ? null : product.id)
                              }
                              className="p-1.5 text-[#5F6D61] hover:text-[#223B28] hover:bg-[#FAF7F2] rounded-lg transition-colors focus:outline-none"
                              aria-label="More actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Context Dropdown Popover */}
                          {activeMenuId === product.id && (
                            <div className="absolute right-4 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-[#EAE5DB] py-2 z-30 animate-fadeIn text-left text-xs">
                              {/* Edit option */}
                              {isPending ? (
                                <div
                                  className="px-3.5 py-2 text-[#A0ACA2] cursor-not-allowed flex items-center gap-2"
                                  title={t(
                                    'vendorProducts.editDisabledTooltip',
                                    'Product is under review and cannot be modified until the review is complete.'
                                  )}
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-[#C0C8C2]" />
                                  <span>{t('vendorProducts.actionEdit', 'Edit (Locked)')}</span>
                                </div>
                              ) : (
                                <Link
                                  to={`/vendor/products/${product.id}/edit`}
                                  className="px-3.5 py-2 text-[#223B28] hover:bg-[#FAF7F2] flex items-center gap-2 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-[#5F6D61]" />
                                  <span>{t('vendorProducts.actionEdit', 'Edit Details')}</span>
                                </Link>
                              )}

                              {/* Duplicate */}
                              <button
                                type="button"
                                onClick={() => handleDuplicate(product)}
                                className="w-full px-3.5 py-2 text-[#223B28] hover:bg-[#FAF7F2] flex items-center gap-2 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 text-[#5F6D61]" />
                                <span>{t('vendorProducts.actionDuplicate', 'Duplicate')}</span>
                              </button>

                              {/* Withdraw for pending_review */}
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => handleWithdraw(product)}
                                  className="w-full px-3.5 py-2 text-[#8A5A00] hover:bg-[#FAF3E0] flex items-center gap-2 transition-colors"
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                  <span>{t('vendorProducts.actionWithdraw', 'Withdraw to Draft')}</span>
                                </button>
                              )}

                              {/* Unpublish for approved */}
                              {isApproved && (
                                <button
                                  type="button"
                                  onClick={() => handleUnpublish(product)}
                                  className="w-full px-3.5 py-2 text-[#5F6D61] hover:bg-[#FAF7F2] flex items-center gap-2 transition-colors"
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>{t('vendorProducts.actionUnpublish', 'Unpublish')}</span>
                                </button>
                              )}

                              {/* Republish for unpublished */}
                              {isUnpublished && (
                                <button
                                  type="button"
                                  onClick={() => handleRepublish(product)}
                                  className="w-full px-3.5 py-2 text-[#2E4D34] hover:bg-[#EAF1EA] flex items-center gap-2 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{t('vendorProducts.actionRepublish', 'Republish')}</span>
                                </button>
                              )}

                              {/* Archive */}
                              {!isArchived && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setArchiveProductTarget(product);
                                  }}
                                  className="w-full px-3.5 py-2 text-[#737373] hover:bg-[#F5F5F5] flex items-center gap-2 transition-colors"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  <span>{t('vendorProducts.actionArchive', 'Archive')}</span>
                                </button>
                              )}

                              {/* Delete (Draft only) */}
                              {isDraft && (
                                <>
                                  <div className="my-1 border-t border-[#EAE5DB]" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setDeleteProductTarget(product);
                                    }}
                                    className="w-full px-3.5 py-2 text-[#DC2626] hover:bg-[#FFF0F0] flex items-center gap-2 transition-colors font-medium"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{t('vendorProducts.actionDelete', 'Delete Draft')}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Rejection Reason Alert Row */}
                      {isRejected && product.rejection_reason && (
                        <tr className="bg-[#FFF5F5] border-b border-[#FED7D7]/70">
                          <td colSpan={7} className="py-3 px-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-[#C53030] flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-bold text-[#9B2C2C]">
                                    {t('vendorProducts.rejectionReasonTitle', 'Submission Needs Changes')}:
                                  </p>
                                  <p className="text-xs text-[#C53030] mt-0.5 leading-relaxed">
                                    {product.rejection_reason}
                                  </p>
                                </div>
                              </div>
                              <Link
                                to={`/vendor/products/${product.id}/edit`}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-[#FFF0F0] border border-[#FED7D7] rounded-lg text-xs font-semibold text-[#C53030] transition-colors flex-shrink-0"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>{t('vendorProducts.actionFixResubmit', 'Fix & Resubmit')}</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ======================================================== */}
          {/* MOBILE CARDS LIST */}
          {/* ======================================================== */}
          <div className="lg:hidden space-y-3.5">
            {data?.results.map((product) => {
              const isRejected = product.status === 'rejected';
              const isPending = product.status === 'pending_review';

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-[#EAE5DB] p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={product.main_image_url}
                      alt={product.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/botanical-care-banner.jpg';
                      }}
                      className="w-16 h-16 rounded-xl object-cover border border-[#EAE5DB] bg-[#FAF7F2] flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <StatusBadge status={product.status} size="sm" />
                        <span className="font-bold text-xs text-[#223B28]">
                          {formatINR(product.price_paise)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm text-[#223B28] mt-1 line-clamp-2">
                        {product.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-[#8E9B90]">
                          {product.sku}
                        </span>
                        <span className="text-[11px] text-[#5F6D61]">
                          • {product.category?.name || product.requested_category_name || 'Other'}
                        </span>
                        {product.is_custom_category && product.status !== 'approved' && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#EAF1EA] text-[#2E4D34] border border-[#2E4D34]/20">
                            Custom category
                          </span>
                        )}
                      </div>
                      {product.status === 'approved' &&
                        product.original_requested_category &&
                        product.original_requested_category.toLowerCase() !== (product.category?.name || '').toLowerCase() && (
                          <p className="text-[10px] text-[#5F6D61] italic mt-0.5">
                            Placed under {product.category?.name} by ChillyFlakes
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Stock & Colors */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#EAE5DB]/60">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#8E9B90]">Stock:</span>
                      {product.total_stock <= 5 ? (
                        <span className="font-semibold text-[#8A5A00]">
                          {product.total_stock} left
                        </span>
                      ) : (
                        <span className="font-semibold text-[#223B28]">
                          {product.total_stock}
                        </span>
                      )}
                    </div>

                    {product.colors && product.colors.length > 0 && (
                      <div className="flex items-center -space-x-1">
                        {product.colors.slice(0, 4).map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className="w-3.5 h-3.5 rounded-full border border-white"
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rejection Alert Box */}
                  {isRejected && product.rejection_reason && (
                    <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FED7D7] text-xs text-[#C53030] space-y-1">
                      <p className="font-bold">
                        {t('vendorProducts.rejectionReasonTitle', 'Submission Needs Changes')}:
                      </p>
                      <p className="leading-snug">{product.rejection_reason}</p>
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {isPending ? (
                      <button
                        type="button"
                        onClick={() => handleWithdraw(product)}
                        className="w-full py-2 px-3 rounded-xl bg-[#FAF3E0] text-[#8A5A00] font-semibold text-xs border border-[#F3E2B8] hover:bg-[#F5E8C8] transition-colors"
                      >
                        {t('vendorProducts.actionWithdraw', 'Withdraw Submission')}
                      </button>
                    ) : isRejected ? (
                      <Link
                        to={`/vendor/products/${product.id}/edit`}
                        className="w-full text-center py-2 px-3 rounded-xl bg-[#C53030] text-white font-semibold text-xs shadow-xs hover:bg-[#9B2C2C] transition-colors"
                      >
                        {t('vendorProducts.actionFixResubmit', 'Fix & Resubmit')}
                      </Link>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <Link
                          to={`/vendor/products/${product.id}/edit`}
                          className="text-center py-2 px-3 rounded-xl border border-[#EAE5DB] bg-white text-xs font-semibold text-[#223B28] hover:bg-[#FAF7F2] transition-colors"
                        >
                          {t('vendorProducts.actionEdit', 'Edit')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(product)}
                          className="py-2 px-3 rounded-xl border border-[#EAE5DB] bg-white text-xs font-semibold text-[#5F6D61] hover:bg-[#FAF7F2] transition-colors"
                        >
                          {t('vendorProducts.actionDuplicate', 'Duplicate')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 6. Pagination */}
          {data && (
            <Pagination
              currentPage={currentPage}
              totalItems={data.count}
              pageSize={pageSize}
              onPageChange={(page) => updateParams({ page: String(page) })}
            />
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRMATION DIALOGS */}
      {/* ======================================================== */}

      {/* Delete Draft Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteProductTarget)}
        onClose={() => setDeleteProductTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('vendorProducts.deleteDraftTitle', 'Delete Draft Product')}
        message={t(
          'vendorProducts.deleteDraftMessage',
          "Are you sure you want to delete '{{title}}'? This action cannot be undone.",
          { title: deleteProductTarget?.title || '' }
        )}
        confirmText={t('vendorProducts.actionDelete', 'Delete')}
        isDanger={true}
        isLoading={deleteMutation.isPending}
      />

      {/* Archive Modal */}
      <ConfirmDialog
        isOpen={Boolean(archiveProductTarget)}
        onClose={() => setArchiveProductTarget(null)}
        onConfirm={handleArchiveConfirm}
        title={t('vendorProducts.archiveTitle', 'Archive Product')}
        message={t(
          'vendorProducts.archiveMessage',
          "Are you sure you want to archive '{{title}}'? It will be removed from the store.",
          { title: archiveProductTarget?.title || '' }
        )}
        confirmText={t('vendorProducts.actionArchive', 'Archive')}
        isDanger={false}
        isLoading={archiveMutation.isPending}
      />
    </div>
  );
};

export default VendorProductsPage;
