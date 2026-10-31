import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Filter, 
  X, 
  Star, 
  Heart, 
  ShoppingCart, 
  Eye, 
  Search, 
  RotateCcw,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { categories } from '../data/categories';
import { formatRupees } from '../utils/currency';

export const ShopPage: React.FC = () => {
  const { t } = useTranslation();
  const { 
    products, 
    addToCart, 
    toggleWishlist, 
    isInWishlist, 
    setQuickViewProduct,
    showToast 
  } = useStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filters state initialized from query params if available
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'All'
  );
  const [priceRange, setPriceRange] = useState<string>(
    searchParams.get('price') || 'all'
  );
  const [minRating, setMinRating] = useState<number>(
    Number(searchParams.get('rating')) || 0
  );
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>(
    searchParams.get('q') || ''
  );
  const [sortBy, setSortBy] = useState<string>('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Sync state if URL search params change
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
    const q = searchParams.get('q');
    if (q !== null) setSearchTerm(q);
  }, [searchParams]);

  // Update URL params when key filters change
  const updateUrlParams = (cat: string, q: string) => {
    const params = new URLSearchParams();
    if (cat && cat !== 'All') params.set('category', cat);
    if (q) params.set('q', q);
    setSearchParams(params, { replace: true });
  };

  const getCategoryLabel = (name: string) => {
    const keyMap: Record<string, string> = {
      'Natural Products': 'categories.naturalProducts',
      'Handmade Products': 'categories.handmadeProducts',
      'Jewelry': 'categories.jewelry',
      'Clothes & Fashion': 'categories.clothesFashion',
      'Home & Living': 'categories.homeLiving',
      'Retail Products': 'categories.retailProducts',
      'Services': 'categories.services',
      'Books': 'categories.books',
    };
    const key = keyMap[name];
    return key ? t(key, name) : name;
  };

  const priceOptions = [
    { id: 'all', label: t('shop.allPrices', 'All Prices') },
    { id: 'under-500', label: t('shop.under500', 'Under ₹500') },
    { id: '500-1000', label: t('shop.from500to1000', '₹500 - ₹1,000') },
    { id: '1000-2000', label: t('shop.from1000to2000', '₹1,000 - ₹2,000') },
    { id: 'above-2000', label: t('shop.above2000', 'Above ₹2,000') },
  ];

  const ratingOptions = [
    { value: 4.5, label: `4.5 ${t('shop.starsAndAbove', '★ & above')}` },
    { value: 4.0, label: `4.0 ${t('shop.starsAndAbove', '★ & above')}` },
    { value: 3.5, label: `3.5 ${t('shop.starsAndAbove', '★ & above')}` },
  ];

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Category filter
      if (selectedCategory !== 'All' && prod.category !== selectedCategory) {
        return false;
      }
      // Search term
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(query);
        const matchesCategory = prod.category.toLowerCase().includes(query);
        const matchesDesc = prod.description.toLowerCase().includes(query);
        const matchesMaterial = prod.material?.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesDesc && !matchesMaterial) {
          return false;
        }
      }
      // Price range
      if (priceRange === 'under-500' && prod.price >= 500) return false;
      if (priceRange === '500-1000' && (prod.price < 500 || prod.price > 1000)) return false;
      if (priceRange === '1000-2000' && (prod.price < 1000 || prod.price > 2000)) return false;
      if (priceRange === 'above-2000' && prod.price <= 2000) return false;

      // Rating filter
      if (minRating > 0 && prod.rating < minRating) return false;

      // In stock only
      if (inStockOnly && prod.stock <= 0) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'discount') return b.discount - a.discount;
      return 0; // 'featured' retains natural curated rank
    });
  }, [products, selectedCategory, searchTerm, priceRange, minRating, inStockOnly, sortBy]);

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setPriceRange('all');
    setMinRating(0);
    setInStockOnly(false);
    setSearchTerm('');
    setSortBy('featured');
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = 
    selectedCategory !== 'All' || 
    priceRange !== 'all' || 
    minRating > 0 || 
    inStockOnly || 
    searchTerm.trim() !== '';

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-6 sm:py-10 border-b border-[#ECE7DD]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#6C7B6D] mb-4">
          <button onClick={() => navigate('/')} className="hover:text-[#2E4D34] transition-colors">
            {t('nav.home', 'Home')}
          </button>
          <span>/</span>
          <span className="font-semibold text-[#223B28]">
            {selectedCategory === 'All' ? t('shop.catalog', 'Catalog') : getCategoryLabel(selectedCategory)}
          </span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#ECE7DD]">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#223B28] tracking-tight">
              {selectedCategory === 'All' ? t('shop.marketplace', 'Handcrafted Marketplace') : getCategoryLabel(selectedCategory)}
            </h1>
            <p className="text-xs sm:text-sm text-[#5E6D60] mt-1">
              {t('shop.tagline', 'Explore 100% natural, artisanal products sourced directly from Indian farmers and master craftspeople.')}
            </p>
          </div>

          {/* Quick Search inside catalog */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#7E8F80] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  updateUrlParams(selectedCategory, e.target.value);
                }}
                placeholder={t('shop.searchPlaceholder', 'Search catalog...')}
                className="w-full pl-9 pr-8 py-2 bg-white rounded-full text-xs border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34] focus:ring-1 focus:ring-[#2E4D34]"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    updateUrlParams(selectedCategory, '');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7E8F80] hover:text-[#223B28]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile Filter Trigger Button */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-4 py-2 bg-white border border-[#D5C9B3] rounded-full text-xs font-semibold text-[#2E4D34]"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{t('shop.filters', 'Filters')}</span>
            </button>
          </div>
        </div>

        {/* Main Content Layout: Sidebar + Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
          
          {/* ==================================================== */}
          {/* DESKTOP FILTER SIDEBAR                               */}
          {/* ==================================================== */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6">
            
            {/* Filter Header with Reset */}
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DD]">
              <span className="font-semibold text-sm text-[#223B28] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#2E4D34]" />
                {t('shop.filters', 'Filters')}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-[#D82C20] hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t('shop.resetAll', 'Reset All')}</span>
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C7B6D]">
                {t('shop.categories', 'Categories')}
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    updateUrlParams('All', searchTerm);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === 'All'
                      ? 'bg-[#2E4D34] text-white'
                      : 'text-[#2D3A2F] hover:bg-white'
                  }`}
                >
                  <span>{t('shop.allCategories', 'All Categories')}</span>
                  <span className="text-[10px] opacity-75">{products.length}</span>
                </button>

                {categories.map((cat) => {
                  const count = products.filter((p) => p.category === cat.name).length;
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        updateUrlParams(cat.name, searchTerm);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-[#2E4D34] text-white'
                          : 'text-[#2D3A2F] hover:bg-white'
                      }`}
                    >
                      <span className="line-clamp-1 text-left">{getCategoryLabel(cat.name)}</span>
                      <span className="text-[10px] opacity-75">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Filter */}
            <div className="pt-4 border-t border-[#ECE7DD] space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C7B6D]">
                {t('shop.priceRange', 'Price Range')}
              </h3>
              <div className="space-y-1.5 text-xs text-[#2D3A2F]">
                {priceOptions.map((item) => (
                  <label key={item.id} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                    <input
                      type="radio"
                      name="priceRange"
                      checked={priceRange === item.id}
                      onChange={() => setPriceRange(item.id)}
                      className="accent-[#2E4D34]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Customer Rating Filter */}
            <div className="pt-4 border-t border-[#ECE7DD] space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C7B6D]">
                {t('shop.minRating', 'Customer Rating')}
              </h3>
              <div className="space-y-1.5 text-xs text-[#2D3A2F]">
                {ratingOptions.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setMinRating(minRating === r.value ? 0 : r.value)}
                    className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md text-xs transition-colors ${
                      minRating === r.value ? 'bg-[#EAF1EA] text-[#2E4D34] font-bold' : 'hover:bg-white'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                      <span>{r.label}</span>
                    </span>
                    {minRating === r.value && <Check className="w-3.5 h-3.5 text-[#2E4D34]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* In-Stock Toggle */}
            <div className="pt-4 border-t border-[#ECE7DD]">
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-xs font-semibold text-[#2D3A2F]">{t('shop.inStockOnly', 'In Stock Only')}</span>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 accent-[#2E4D34] rounded-sm cursor-pointer"
                />
              </label>
            </div>

          </aside>

          {/* ==================================================== */}
          {/* MAIN PRODUCT CATALOG GRID                            */}
          {/* ==================================================== */}
          <main className="lg:col-span-9 space-y-6">
            
            {/* Top Bar: Results Count + Sort Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#ECE7DD] shadow-2xs">
              <span className="text-xs text-[#5E6D60] font-medium">
                {t('shop.showingCount', { count: filteredProducts.length, defaultValue: `Showing ${filteredProducts.length} items` })}
                {selectedCategory !== 'All' && <span> in <strong>{getCategoryLabel(selectedCategory)}</strong></span>}
              </span>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#6C7B6D]">{t('shop.sortBy', 'Sort by:')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#FAF7F2] border border-[#D5C9B3] rounded-lg px-2.5 py-1.5 text-xs text-[#223B28] font-semibold focus:outline-none focus:border-[#2E4D34]"
                >
                  <option value="featured">{t('shop.sortFeatured', 'Featured / Recommended')}</option>
                  <option value="price-low">{t('shop.sortPriceLow', 'Price: Low to High')}</option>
                  <option value="price-high">{t('shop.sortPriceHigh', 'Price: High to Low')}</option>
                  <option value="rating">{t('shop.sortRating', 'Highest Rated')}</option>
                  <option value="discount">{t('shop.sortDiscount', 'Biggest Discount')}</option>
                </select>
              </div>
            </div>

            {/* Active Filter Tags */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {selectedCategory !== 'All' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2E4D34] text-white text-xs font-medium rounded-full">
                    <span>{t('shop.categories', 'Category')}: {getCategoryLabel(selectedCategory)}</span>
                    <button onClick={() => setSelectedCategory('All')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchTerm && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2E4D34] text-white text-xs font-medium rounded-full">
                    <span>{t('nav.searchPlaceholder', 'Search')}: "{searchTerm}"</span>
                    <button onClick={() => setSearchTerm('')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {priceRange !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] border border-[#D5C9B3] text-[#223B28] text-xs font-medium rounded-full">
                    <span>{t('shop.priceRange', 'Price')}: {priceRange}</span>
                    <button onClick={() => setPriceRange('all')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {minRating > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] border border-[#D5C9B3] text-[#223B28] text-xs font-medium rounded-full">
                    <span>{t('shop.minRating', 'Rating')}: {minRating}★+</span>
                    <button onClick={() => setMinRating(0)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-[#D82C20] hover:underline ml-2"
                >
                  {t('shop.clearFilters', 'Clear all filters')}
                </button>
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#ECE7DD] space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#FAF7F2] flex items-center justify-center text-3xl">
                  🔍
                </div>
                <h3 className="font-serif text-xl font-bold text-[#223B28]">
                  {t('shop.noProducts', 'No matching handcrafted products found')}
                </h3>
                <p className="text-xs sm:text-sm text-[#6C7B6D] max-w-md mx-auto">
                  {t('shop.noProductsDesc', 'Try clearing your active filters, adjusting price ranges, or searching with broader keywords.')}
                </p>
                <div>
                  <button
                    onClick={handleResetFilters}
                    className="px-6 py-2.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-full shadow-xs"
                  >
                    {t('shop.clearFilters', 'Reset All Filters')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((prod) => {
                  const wishlisted = isInWishlist(prod.id);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => navigate(`/products/${prod.id}`)}
                      className="group bg-white rounded-2xl overflow-hidden border border-[#ECE7DD] hover:border-[#2E4D34]/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
                    >
                      {/* Image Container */}
                      <div className="relative aspect-square overflow-hidden bg-[#FAF7F2]">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/hero-banner.jpg';
                          }}
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10">
                          {prod.discount > 0 && (
                            <span className="bg-[#D82C20] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                              {prod.discount}% OFF
                            </span>
                          )}
                          {prod.isAssured && (
                            <span className="bg-[#2E4D34] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
                              CHILLY ASSURED
                            </span>
                          )}
                        </div>

                        {/* Action Icons Overlay */}
                        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
                          {/* Wishlist button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWishlist(prod);
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
                              wishlisted
                                ? 'bg-[#D82C20] text-white'
                                : 'bg-white/90 text-[#6C7B6D] hover:text-[#D82C20] hover:bg-white'
                            }`}
                            title="Save to wishlist"
                          >
                            <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
                          </button>

                          {/* Quick view button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickViewProduct(prod);
                            }}
                            className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#2E4D34] flex items-center justify-center transition-all duration-200 shadow-md opacity-0 group-hover:opacity-100"
                            title={t('shop.quickView', 'Quick View')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Rating pill bottom-left */}
                        {Boolean(prod.rating && prod.rating > 0) && (
                          <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span>{prod.rating.toFixed(1)}</span>
                            <Star className="w-2.5 h-2.5 fill-[#FBBF24] text-[#FBBF24]" />
                          </div>
                        )}
                      </div>

                      {/* Product Content */}
                      <div className="p-4 flex flex-col flex-grow justify-between">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6C7B6D]">
                            {getCategoryLabel(prod.category)}
                          </span>
                          <h3 className="font-semibold text-sm text-[#223B28] group-hover:text-[#2E4D34] transition-colors mt-0.5 line-clamp-2 leading-snug">
                            {prod.name}
                          </h3>
                          <p className="text-[11px] text-[#6C7B6D] mt-1 line-clamp-1">
                            {prod.material || prod.conditionDetails}
                          </p>
                        </div>

                        {/* Price & Add to Cart */}
                        <div className="pt-3 mt-3 border-t border-[#F2ECE1] flex items-center justify-between">
                          <div>
                            <div className="text-sm sm:text-base font-bold text-[#223B28]">
                              {formatRupees(prod.price)}
                            </div>
                            {prod.originalPrice > prod.price && (
                              <div className="text-[11px] text-[#869584] line-through">
                                {formatRupees(prod.originalPrice)}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(prod, 1);
                              showToast(`Added ${prod.name} to cart`, 'success');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-lg shadow-2xs hover:shadow-sm transition-all duration-200 active:scale-95"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>{t('home.addToCart', 'Add')}</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </main>

        </div>

      </div>

      {/* ======================================================== */}
      {/* MOBILE FILTER DRAWER                                     */}
      {/* ======================================================== */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden overflow-hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white p-6 shadow-2xl flex flex-col justify-between overflow-y-auto z-50">
            <div className="space-y-6">
              
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DD]">
                <h3 className="font-serif font-bold text-lg text-[#223B28]">{t('shop.filters', 'Filter Products')}</h3>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded-full text-[#7E8F80] hover:text-[#223B28]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Categories */}
              <div>
                <h4 className="text-xs font-bold text-[#6C7B6D] uppercase mb-2">{t('shop.categories', 'Category')}</h4>
                <div className="space-y-1">
                  <button
                    onClick={() => { setSelectedCategory('All'); setMobileFilterOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs ${
                      selectedCategory === 'All' ? 'bg-[#2E4D34] text-white' : 'text-[#2D3A2F]'
                    }`}
                  >
                    {t('shop.allCategories', 'All Categories')}
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCategory(c.name); setMobileFilterOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs ${
                        selectedCategory === c.name ? 'bg-[#2E4D34] text-white' : 'text-[#2D3A2F]'
                      }`}
                    >
                      {getCategoryLabel(c.name)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <h4 className="text-xs font-bold text-[#6C7B6D] uppercase mb-2">{t('shop.priceRange', 'Price Range')}</h4>
                <div className="space-y-1.5 text-xs text-[#2D3A2F]">
                  {priceOptions.map((p) => (
                    <label key={p.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mobPrice"
                        checked={priceRange === p.id}
                        onChange={() => setPriceRange(p.id)}
                        className="accent-[#2E4D34]"
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            <div className="pt-6 border-t border-[#ECE7DD] flex gap-3">
              <button
                onClick={() => { handleResetFilters(); setMobileFilterOpen(false); }}
                className="w-1/2 py-2.5 text-xs font-semibold text-[#6C7B6D] bg-[#FAF7F2] rounded-xl"
              >
                {t('shop.resetAll', 'Reset')}
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-1/2 py-2.5 text-xs font-semibold text-white bg-[#2E4D34] rounded-xl shadow-xs"
              >
                {t('shop.filters', 'Apply')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ShopPage;
