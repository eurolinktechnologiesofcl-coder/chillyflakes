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
  MessageSquare
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatRupees, FREE_SHIPPING_THRESHOLD } from '../utils/currency';

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { 
    products, 
    addToCart, 
    toggleWishlist, 
    isInWishlist, 
    setIsCartOpen, 
    productReviews, 
    addProductReview,
    showToast 
  } = useStore();

  const product = useMemo(() => {
    return products.find((p) => p.id === id);
  }, [products, id]);

  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryPincode, setDeliveryPincode] = useState<string>('682001');
  const [pincodeChecked, setPincodeChecked] = useState<boolean>(true);

  // Review form state
  const [isReviewFormOpen, setIsReviewFormOpen] = useState<boolean>(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');

  useEffect(() => {
    if (product) {
      setSelectedImage(product.image);
      setQuantity(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [product]);

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
            className="px-6 py-2.5 bg-[#2E4D34] hover:bg-[#223E27] text-white text-xs font-semibold rounded-full shadow-xs"
          >
            Browse Marketplace Catalog
          </button>
        </div>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product.id);
  const reviews = productReviews[product.id] || [];

  const galleryImages = [
    product.image,
    ...(product.additionalImages || []).filter((img) => img !== product.image),
  ];

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

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      showToast('Please provide both a title and review comment.', 'warning');
      return;
    }
    addProductReview({
      productId: product.id,
      rating: reviewRating,
      userName: reviewerName.trim() || 'Handmade Enthusiast',
      title: reviewTitle.trim(),
      comment: reviewComment.trim(),
    });
    setReviewTitle('');
    setReviewComment('');
    setReviewerName('');
    setIsReviewFormOpen(false);
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
            <div className="relative aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#ECE7DD] flex items-center justify-center p-3">
              <img
                src={selectedImage || product.image}
                alt={product.name}
                className="w-full h-full object-contain sm:object-cover rounded-xl transition-all duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/hero-banner.jpg';
                }}
              />

              {/* Wishlist Button */}
              <button
                onClick={() => toggleWishlist(product)}
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
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all p-1 flex-shrink-0 bg-[#FAF7F2] ${
                      selectedImage === img
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
                  className="inline-flex items-center gap-1 text-xs text-[#5E6D60] hover:text-[#2E4D34] transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#223B28] mt-1.5 leading-tight">
                {product.name}
              </h1>

              {/* Ratings and Reviews count */}
              <div className="flex items-center gap-3 mt-3 text-xs">
                <div className="flex items-center gap-1 bg-[#FAF7F2] px-2.5 py-1 rounded-md border border-[#ECE7DD] text-[#223B28] font-bold">
                  <span>{product.rating.toFixed(1)}</span>
                  <Star className="w-3.5 h-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                </div>
                <span className="text-[#6C7B6D]">
                  {product.reviewsCount + reviews.length} Verified Customer Reviews
                </span>
                <span className="text-[#B6C6B5]">•</span>
                <span className="text-[#2E4D34] font-semibold">
                  {product.stock > 0 ? `In Stock (${product.stock} left)` : 'Out of stock'}
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
                className="px-6 py-2.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Submit Verified Review
              </button>
            </form>
          )}

          {/* Existing Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-xs text-[#7E8F80] py-4">
                No customer reviews yet. Be the first to review this handcrafted product!
              </p>
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
                    <span>{rev.userName} • Verified ChillyFlakes Buyer</span>
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
    </div>
  );
};

export default ProductDetailsPage;
