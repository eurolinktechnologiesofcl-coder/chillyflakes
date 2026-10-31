import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Star, 
  Heart, 
  ShoppingCart, 
  Zap, 
  ShieldCheck, 
  Check, 
  Share2, 
  MapPin, 
  ChevronRight,
  Leaf,
  Plus,
  Minus,
  MessageSquare,
  Maximize2,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatRupees, FREE_SHIPPING_THRESHOLD } from '../utils/currency';
import { axiosClient } from '../api/client';

interface ProductReviewItem {
  id: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { 
    products, 
    addToCart, 
    toggleWishlist, 
    isInWishlist, 
    setIsCartOpen, 
    user,
    showToast 
  } = useStore();

  const product = useMemo(() => {
    return products.find((p) => p.id === id);
  }, [products, id]);

  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryPincode, setDeliveryPincode] = useState<string>('682001');
  const [pincodeChecked, setPincodeChecked] = useState<boolean>(true);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  // Real backend reviews state
  const [reviews, setReviews] = useState<ProductReviewItem[]>([]);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Review form state
  const [isReviewFormOpen, setIsReviewFormOpen] = useState<boolean>(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');

  const fetchReviews = async (productId: string) => {
    try {
      const res = await axiosClient.get(`/api/v1/products/${productId}/reviews/`);
      if (res.data) {
        setReviews(res.data.results || []);
        setReviewsCount(res.data.totalCount ?? 0);
        setAverageRating(res.data.averageRating ?? 0);
      }
    } catch (err) {
      console.warn('Error fetching reviews:', err);
    }
  };

  useEffect(() => {
    if (product) {
      setSelectedImage(product.image);
      setQuantity(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      fetchReviews(product.id);
    }
  }, [product?.id]);

  if (!product) {
    return (
      <div className="min-h-[70vh] bg-[#FAF7F2] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#FAF0ED] text-[#D82C20] flex items-center justify-center mx-auto text-2xl">
            📦
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#223B28]">
            Product Not Found
          </h2>
          <p className="text-xs sm:text-sm text-[#6C7B6D]">
            The product you're looking for may have been archived or is temporarily out of stock.
          </p>
          <button
            onClick={() => navigate('/shop')}
            className="px-6 py-2.5 bg-[#2E4D34] hover:bg-[#223E27] text-white text-xs font-semibold rounded-full shadow-xs cursor-pointer"
          >
            Browse Marketplace Catalog
          </button>
        </div>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product.id);

  const galleryImages = Array.from(new Set([
    product.image,
    ...(product.additionalImages || []),
  ].filter(Boolean)));

  // Related products
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Product link copied to clipboard!', 'success');
    }
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    navigate('/checkout');
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      showToast('Please provide both a title and review comment.', 'warning');
      return;
    }
    setIsSubmittingReview(true);
    try {
      const res = await axiosClient.post(`/api/v1/products/${product.id}/reviews/`, {
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
        customerName: reviewerName.trim() || (user?.name || 'Verified Customer'),
        customerEmail: user?.email || undefined,
      });
      showToast(
        res.data?.message ||
          'Thank you! Your review is important to us and has been submitted successfully. It will be reviewed by admin for approval before being published.',
        'success'
      );
      setReviewTitle('');
      setReviewComment('');
      setReviewerName('');
      setIsReviewFormOpen(false);
      fetchReviews(product.id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to submit review.', 'warning');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-6 sm:py-10 border-b border-[#ECE7DD]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#6C7B6D] mb-6 overflow-x-auto no-scrollbar">
          <Link to="/" className="hover:text-[#2E4D34] transition-colors whitespace-nowrap">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-[#2E4D34] transition-colors whitespace-nowrap">Shop</Link>
          <span>/</span>
          <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-[#2E4D34] transition-colors whitespace-nowrap">
            {product.category}
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#223B28] line-clamp-1">{product.name}</span>
        </nav>

        {/* Main Product Showcase Grid */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 lg:p-10 border border-[#ECE7DD] shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* ==================================================== */}
          {/* LEFT: Image Gallery                                  */}
          {/* ==================================================== */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Primary Large Image */}
            <div 
              onClick={() => setIsZoomOpen(true)}
              className="relative aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#ECE7DD] flex items-center justify-center p-3 cursor-zoom-in group shadow-xs"
              title="Click to view full-size image"
            >
              <img
                src={selectedImage || product.image}
                alt={product.name}
                className="w-full h-full object-contain sm:object-cover rounded-xl transition-all duration-300 group-hover:scale-102"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80';
                }}
              />

              {/* Zoom hint badge */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                <Maximize2 className="w-3 h-3" />
                <span>Zoom</span>
              </div>

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(product);
                }}
                className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
                  isWishlisted
                    ? 'bg-[#D82C20] text-white'
                    : 'bg-white/90 text-[#6C7B6D] hover:text-[#D82C20] hover:bg-white'
                }`}
                aria-label="Save to Wishlist"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>

              {/* Assured Badge */}
              {product.isAssured && (
                <div className="absolute bottom-4 left-4 bg-[#2E4D34] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#A3D9A5]" />
                  <span>CHILLY ASSURED • 100% AUTHENTIC</span>
                </div>
              )}
            </div>

            {/* Thumbnail Carousel */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all p-1 flex-shrink-0 bg-[#FAF7F2] cursor-pointer ${
                      (selectedImage || product.image) === img
                        ? 'border-[#2E4D34] ring-2 ring-[#2E4D34]/20 scale-102'
                        : 'border-[#E2D8C6] hover:border-[#2E4D34]/50'
                    }`}
                  >
                    <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                  </button>
                ))}
              </div>
            )}

            {/* Sourcing guarantee note */}
            <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#ECE7DD] flex items-center gap-3 text-xs text-[#506052]">
              <Leaf className="w-5 h-5 text-[#2E4D34] flex-shrink-0" />
              <span>
                Crafted with responsibly harvested ingredients and packaged plastic-free in recyclable materials.
              </span>
            </div>

          </div>

          {/* ==================================================== */}
          {/* RIGHT: Product Details & Purchase Controls           */}
          {/* ==================================================== */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6C7B6D]">
                  {product.category}
                </span>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1 text-xs text-[#5E6D60] hover:text-[#2E4D34] transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#223B28] mt-1.5 leading-tight">
                {product.name}
              </h1>

              {/* Real Ratings and Reviews count */}
              <div className="flex items-center gap-3 mt-3 text-xs">
                {averageRating > 0 && reviewsCount > 0 && (
                  <div className="flex items-center gap-1 bg-[#FAF7F2] px-2.5 py-1 rounded-md border border-[#ECE7DD] text-[#223B28] font-bold">
                    <span>{averageRating.toFixed(1)}</span>
                    <Star className="w-3.5 h-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                  </div>
                )}
                <span className="text-[#6C7B6D]">
                  {reviewsCount > 0 ? `${reviewsCount} Verified Customer Review${reviewsCount > 1 ? 's' : ''}` : 'No reviews yet'}
                </span>
                <span className="text-[#B6C6B5]">•</span>
                <span className="text-[#2E4D34] font-semibold">
                  {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of stock'}
                </span>
              </div>
            </div>

            {/* Price block */}
            <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#ECE7DD] flex items-baseline gap-3">
              <span className="font-serif text-3xl font-extrabold text-[#223B28]">
                {formatRupees(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <>
                  <span className="text-sm text-[#869584] line-through font-medium">
                    {formatRupees(product.originalPrice)}
                  </span>
                  <span className="bg-[#D82C20] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {product.discount}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Product Narrative Description */}
            <p className="text-xs sm:text-sm text-[#4E5D4F] leading-relaxed">
              {product.description}
            </p>

            {/* Key Handcrafted Attributes */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6C7B6D]">
                Product Specifications
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-[#FAF7F2] rounded-xl border border-[#ECE7DD]">
                  <span className="text-[#6C7B6D] block text-[10px]">Materials / Extracts</span>
                  <span className="font-semibold text-[#223B28]">{product.material}</span>
                </div>
                <div className="p-2.5 bg-[#FAF7F2] rounded-xl border border-[#ECE7DD]">
                  <span className="text-[#6C7B6D] block text-[10px]">Batch Condition</span>
                  <span className="font-semibold text-[#223B28]">{product.conditionDetails}</span>
                </div>
              </div>
            </div>

            {/* Delivery Pincode Checker */}
            <div className="p-4 rounded-2xl border border-[#ECE7DD] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#223B28]">
                <MapPin className="w-3.5 h-3.5 text-[#2E4D34]" />
                <span>Check Delivery & Cash on Delivery Availability</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={deliveryPincode}
                  onChange={(e) => setDeliveryPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit PIN"
                  className="px-3 py-1.5 text-xs bg-[#FAF7F2] rounded-xl border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34] w-36"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (deliveryPincode.length === 6) {
                      setPincodeChecked(true);
                      showToast(`Verified: Standard Eco delivery available to ${deliveryPincode}`, 'success');
                    } else {
                      showToast('Please enter a valid 6-digit Indian PIN code', 'warning');
                    }
                  }}
                  className="px-4 py-1.5 bg-white border border-[#D5C9B3] hover:border-[#2E4D34] text-xs font-semibold text-[#2E4D34] rounded-xl transition-colors"
                >
                  Verify
                </button>
              </div>
              {pincodeChecked && (
                <p className="text-[11px] text-[#2E4D34] font-medium flex items-center gap-1 pt-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Delivery to {deliveryPincode} in 2-3 business days • Free above ₹{FREE_SHIPPING_THRESHOLD}</span>
                </p>
              )}
            </div>

            {/* Quantity Selector + Actions */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-[#6C7B6D]">Quantity:</span>
                <div className="flex items-center border border-[#D5C9B3] rounded-xl bg-[#FAF7F2] overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2 hover:bg-white text-[#223B28] transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-4 text-xs font-bold text-[#223B28]">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="p-2 hover:bg-white text-[#223B28] transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Purchase CTA Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    addToCart(product, quantity);
                    setIsCartOpen(true);
                    showToast(`Added ${quantity} × ${product.name} to cart`, 'success');
                  }}
                  className="w-full py-3 px-6 bg-[#FAF7F2] hover:bg-[#EAF1EA] border-2 border-[#2E4D34] text-[#2E4D34] font-bold text-xs sm:text-sm rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  className="w-full py-3 px-6 bg-[#2E4D34] hover:bg-[#233B27] text-white font-bold text-xs sm:text-sm rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Zap className="w-4 h-4 text-[#FBBF24] fill-[#FBBF24]" />
                  <span>Buy Now</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* ==================================================== */}
        {/* CUSTOMER REVIEWS & RATINGS SECTION                   */}
        {/* ==================================================== */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#ECE7DD] mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#ECE7DD] gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#223B28]">
                Customer Ratings & Reviews
              </h2>
              <p className="text-xs sm:text-sm text-[#6C7B6D] mt-1">
                Authentic feedback from verified ChillyFlakes marketplace customers.
              </p>
            </div>

            <button
              onClick={() => setIsReviewFormOpen(!isReviewFormOpen)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-full shadow-xs self-start"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{isReviewFormOpen ? 'Close Form' : 'Write a Review'}</span>
            </button>
          </div>

          {/* Interactive Review Form */}
          {isReviewFormOpen && (
            <form onSubmit={handleAddReview} className="p-5 bg-[#FAF7F2] rounded-2xl border border-[#ECE7DD] space-y-4">
              <h3 className="font-semibold text-sm text-[#223B28]">
                Share Your Experience with {product.name}
              </h3>

              {/* Star selector */}
              <div>
                <label className="text-xs font-semibold text-[#6C7B6D] block mb-1">
                  Overall Rating
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setReviewRating(s)}
                      className="p-1 text-2xl hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          s <= reviewRating
                            ? 'fill-[#FBBF24] text-[#FBBF24]'
                            : 'text-[#D5C9B3]'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-[#223B28] ml-2">
                    {reviewRating} of 5 Stars
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#6C7B6D] block mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Radhika Menon"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6C7B6D] block mb-1">
                    Review Headline
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="e.g. Pure soothing botanical scent!"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#6C7B6D] block mb-1">
                  Your Detailed Review
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tell other buyers how the product looks, smells, feels, and performs..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="px-6 py-2.5 bg-[#2E4D34] hover:bg-[#233B27] disabled:bg-[#8F9E8F] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
              >
                {isSubmittingReview ? 'Submitting Review...' : 'Submit Verified Review'}
              </button>
            </form>
          )}

          {/* Existing Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-8 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#ECE7DD] space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-[#7E8F80]" />
                <p className="text-xs text-[#506052] font-semibold">
                  No verified customer reviews yet.
                </p>
                <p className="text-[11px] text-[#7E8F80]">
                  Be the first to share your experience with this handcrafted creation!
                </p>
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#ECE7DD] space-y-2">
                  <div className="flex items-center justify-between">
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
                    <span className="text-[11px] text-[#7E8F80]">{rev.createdAt}</span>
                  </div>

                  <p className="text-xs text-[#506052] leading-relaxed">
                    {rev.comment}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] text-[#2E4D34] font-semibold pt-1">
                    <Check className="w-3 h-3 text-[#2E4D34]" />
                    <span>{rev.userName} {rev.verifiedPurchase ? '• Verified Purchase' : '• Customer Review'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Similar Products Recommendation */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DD]">
              <h3 className="font-serif text-2xl font-bold text-[#223B28]">
                You May Also Like
              </h3>
              <Link to="/shop" className="text-xs font-semibold text-[#2E4D34] hover:underline flex items-center gap-1">
                <span>View Full Catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => navigate(`/products/${rel.id}`)}
                  className="group bg-white rounded-2xl overflow-hidden border border-[#ECE7DD] hover:border-[#2E4D34]/40 hover:shadow-lg transition-all duration-300 p-3 flex flex-col justify-between cursor-pointer"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-[#FAF7F2] mb-3">
                    <img src={rel.image} alt={rel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#223B28] group-hover:text-[#2E4D34] line-clamp-1">{rel.name}</h4>
                    <span className="text-xs font-bold text-[#223B28] mt-1 block">{formatRupees(rel.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Fullscreen Image Lightbox */}
      {isZoomOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[85vh] w-full bg-white rounded-3xl p-4 flex flex-col items-center justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-[#ECE7DD]">
              <h3 className="text-sm font-bold text-[#223B28]">{product.name}</h3>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="p-1.5 hover:bg-[#FAF7F2] rounded-full text-[#506052] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 w-full max-h-[65vh] flex items-center justify-center py-4 overflow-hidden">
              <img
                src={selectedImage || product.image}
                alt={product.name}
                className="max-h-[60vh] max-w-full object-contain rounded-xl"
              />
            </div>

            {/* Thumbnail selector in modal */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-2 border-t border-[#ECE7DD] w-full justify-center">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                      (selectedImage || product.image) === img
                        ? 'border-[#2E4D34] ring-2 ring-[#2E4D34]/30'
                        : 'border-[#ECE7DD] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover rounded-md" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailsPage;
