import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Star, 
  Heart, 
  ShoppingCart, 
  Zap, 
  Truck, 
  RotateCcw, 
  ShieldCheck, 
  Check, 
  Share2, 
  MapPin, 
  Sparkles,
  ChevronRight,
  Package,
  Award,
  Leaf
} from 'lucide-react';
import type { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { formatRupees, FREE_SHIPPING_THRESHOLD } from '../utils/currency';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack,
  onSelectProduct,
}) => {
  const { 
    products, 
    addToCart, 
    toggleWishlist, 
    isInWishlist, 
    setIsCartOpen, 
    showToast 
  } = useStore();

  const isWishlisted = isInWishlist(product.id);
  const [selectedImage, setSelectedImage] = useState<string>(product.image);
  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryPincode, setDeliveryPincode] = useState<string>('682001');
  const [pincodeChecked, setPincodeChecked] = useState<boolean>(true);

  // Sync selected image when product changes
  useEffect(() => {
    setSelectedImage(product.image);
    setQuantity(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product]);

  // Gallery images list
  const galleryImages = [
    product.image,
    ...(product.additionalImages || []).filter((img) => img !== product.image)
  ];

  // Intelligent matching of similar products based on item type and category
  const relatedProducts = React.useMemo(() => {
    const nameLower = product.name.toLowerCase();
    const catLower = product.category.toLowerCase();

    const isDress = nameLower.includes('dress') || catLower.includes('fashion') || catLower.includes('clothes');
    const isSoap = nameLower.includes('soap') || nameLower.includes('bath bar');
    const isCream = nameLower.includes('cream');
    const isJewelry = catLower.includes('jewelry') || nameLower.includes('necklace') || nameLower.includes('ring') || nameLower.includes('earring');
    const isBambooOrHome = nameLower.includes('bamboo') || nameLower.includes('basket') || nameLower.includes('lantern') || nameLower.includes('planter') || nameLower.includes('hanger') || catLower.includes('home');

    const otherProducts = products.filter((p) => p.id !== product.id);

    let filtered: Product[] = [];

    if (isDress) {
      filtered = otherProducts.filter((p) => 
        p.name.toLowerCase().includes('dress') || 
        p.category === 'Clothes & Fashion'
      );
    } else if (isSoap) {
      filtered = otherProducts.filter((p) => 
        p.name.toLowerCase().includes('soap') || 
        p.name.toLowerCase().includes('bar')
      );
    } else if (isCream) {
      filtered = otherProducts.filter((p) => 
        p.name.toLowerCase().includes('cream') || 
        (p.category === 'Natural Products' && !p.name.toLowerCase().includes('soap'))
      );
    } else if (isJewelry) {
      filtered = otherProducts.filter((p) => 
        p.category === 'Jewelry' || 
        p.name.toLowerCase().includes('necklace') || 
        p.name.toLowerCase().includes('ring')
      );
    } else if (isBambooOrHome) {
      filtered = otherProducts.filter((p) => 
        p.category === 'Home & Living' || 
        p.name.toLowerCase().includes('bamboo') ||
        p.name.toLowerCase().includes('basket') ||
        p.name.toLowerCase().includes('hanger')
      );
    } else {
      filtered = otherProducts.filter((p) => p.category === product.category);
    }

    // If still not enough, fallback to same category items
    if (filtered.length < 6) {
      const sameCategory = otherProducts.filter(
        (p) => p.category === product.category && !filtered.some((f) => f.id === p.id)
      );
      filtered = [...filtered, ...sameCategory];
    }

    return filtered.slice(0, 6);
  }, [product, products]);

  // Dynamic subtitle describing the similar products section
  const dynamicSubtitle = React.useMemo(() => {
    const nameLower = product.name.toLowerCase();
    const catLower = product.category.toLowerCase();
    if (nameLower.includes('dress') || catLower.includes('fashion') || catLower.includes('clothes')) {
      return 'Explore more handcrafted dresses & sustainable fashion items you might love';
    }
    if (nameLower.includes('soap')) {
      return 'Explore more cold-process botanical soaps & bath bars you might love';
    }
    if (nameLower.includes('cream')) {
      return 'Explore more organic face creams & nourishing botanical skincare you might love';
    }
    if (catLower.includes('jewelry') || nameLower.includes('necklace') || nameLower.includes('ring')) {
      return 'Explore more handcrafted sterling silver & artisan gemstone jewelry';
    }
    if (nameLower.includes('bamboo') || catLower.includes('home') || nameLower.includes('hanger')) {
      return 'Explore more bamboo home décor & sustainable handicrafts you might love';
    }
    return `Handpicked artisan items matching ${product.name}`;
  }, [product]);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    showToast(`Added ${quantity} × ${product.name} to Cart`, 'success');
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    setIsCartOpen(true);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Product link copied to clipboard!', 'info');
    }
  };

  const savings = Math.max(0, product.originalPrice - product.price);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#203D26] pb-20">
      
      {/* Top Breadcrumb & Back Bar */}
      <div className="bg-white border-b border-[#ECE7DD] sticky top-20 z-20 shadow-2xs">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-[#6C7B6D] overflow-hidden whitespace-nowrap">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 font-medium text-[#203D26] hover:text-[#2D4F32] hover:bg-[#F2ECE1] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-[#C5D0C3]">/</span>
            <button
              onClick={onBack}
              className="hover:text-[#203D26] transition-colors"
            >
              Home
            </button>
            <span className="text-[#C5D0C3]">/</span>
            <span className="text-[#6C7B6D] hidden sm:inline">{product.category}</span>
            <span className="text-[#C5D0C3] hidden sm:inline">/</span>
            <span className="font-semibold text-[#203D26] truncate max-w-[200px] sm:max-w-xs">
              {product.name}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleShare}
              className="p-2 rounded-full border border-[#ECE7DD] hover:bg-[#FAF7F2] text-[#6C7B6D] hover:text-[#203D26] transition-colors"
              title="Share Product"
              aria-label="Share Product"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleWishlist(product)}
              className={`p-2 rounded-full border border-[#ECE7DD] hover:bg-[#FAF7F2] transition-colors ${
                isWishlisted ? 'text-[#D82C20] fill-[#D82C20]' : 'text-[#6C7B6D] hover:text-[#D82C20]'
              }`}
              title="Add to Wishlist"
              aria-label="Wishlist"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current text-[#D82C20]' : ''}`} />
            </button>
          </div>

        </div>
      </div>

      {/* Main Product Stage */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="bg-white rounded-3xl border border-[#ECE7DD] shadow-sm p-5 sm:p-8 lg:p-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* ==================================================== */}
            {/* LEFT COLUMN: Gallery & Interactive Images & Actions */}
            {/* ==================================================== */}
            <div className="lg:col-span-5 flex flex-col space-y-5">
              
              {/* Main Image Showcase */}
              <div className="relative aspect-square w-full rounded-2xl bg-[#FAF7F2] border border-[#ECE7DD] overflow-hidden flex items-center justify-center p-3 sm:p-4 group">
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80';
                  }}
                />

                {/* Badge Overlay */}
                <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-[#203D26] text-white shadow-xs">
                    <Leaf className="w-3 h-3 text-[#A8C7A0]" />
                    100% Natural & Artisan
                  </span>
                  {product.discount > 0 && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#7B3F1B] text-white shadow-xs self-start">
                      {product.discount}% OFF
                    </span>
                  )}
                </div>

                <div className="absolute top-4 right-4">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/95 text-[#203D26] border border-[#ECE7DD] shadow-2xs">
                    {product.condition}
                  </span>
                </div>
              </div>

              {/* Thumbnails Strip */}
              {galleryImages.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 p-1 bg-[#FAF7F2] transition-all flex-shrink-0 cursor-pointer ${
                        selectedImage === img
                          ? 'border-[#203D26] ring-2 ring-[#203D26]/20 shadow-xs'
                          : 'border-[#ECE7DD] hover:border-[#A8C7A0]'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Action Buttons for Mobile / Desktop */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  className="flex items-center justify-center gap-2 py-3.5 px-4 bg-[#203D26] hover:bg-[#182F1D] text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  className="flex items-center justify-center gap-2 py-3.5 px-4 bg-[#7B3F1B] hover:bg-[#643214] text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Buy Now</span>
                </button>
              </div>

              {/* Quick Trust Highlights under buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#ECE7DD] text-center text-[11px] text-[#6C7B6D]">
                <div className="p-2 rounded-xl bg-[#FAF7F2] flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#203D26]" />
                  <span className="font-medium text-[#203D26]">Verified Purity</span>
                  <span className="text-[10px] text-[#869584]">Toxic-free batch</span>
                </div>
                <div className="p-2 rounded-xl bg-[#FAF7F2] flex flex-col items-center gap-1">
                  <Truck className="w-4 h-4 text-[#203D26]" />
                  <span className="font-medium text-[#203D26]">Eco Delivery</span>
                  <span className="text-[10px] text-[#869584]">Carbon neutral</span>
                </div>
                <div className="p-2 rounded-xl bg-[#FAF7F2] flex flex-col items-center gap-1">
                  <RotateCcw className="w-4 h-4 text-[#203D26]" />
                  <span className="font-medium text-[#203D26]">7-Day Return</span>
                  <span className="text-[10px] text-[#869584]">Hassle-free</span>
                </div>
              </div>

            </div>

            {/* ==================================================== */}
            {/* RIGHT COLUMN: Product Information & Purchase Flow    */}
            {/* ==================================================== */}
            <div className="lg:col-span-7 flex flex-col space-y-5">
              
              {/* Brand Store Link */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider uppercase text-[#6C7B6D] flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#7B3F1B]" />
                  ChillyFlakes Artisan Guild • Verified Store
                </span>
                <span className="text-[11px] font-medium text-[#2D4F32] bg-[#E9F0E8] px-2.5 py-0.5 rounded-full">
                  In Stock ({product.stock} available)
                </span>
              </div>

              {/* Title */}
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#203D26] leading-tight">
                {product.name}
              </h1>

              {/* Ratings and Reviews Strip */}
              <div className="flex flex-wrap items-center gap-3 pb-2 border-b border-[#ECE7DD]">
                {Boolean(product.rating && product.rating > 0 && product.reviewsCount && product.reviewsCount > 0) ? (
                  <>
                    <div className="inline-flex items-center gap-1 bg-[#203D26] text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-2xs">
                      <span>{product.rating.toFixed(1)}</span>
                      <Star className="w-3.5 h-3.5 fill-current text-[#FBBF24]" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[#6C7B6D]">
                      {product.reviewsCount} Ratings & {Math.max(4, Math.floor(product.reviewsCount * 0.75))} Verified Reviews
                    </span>
                    <span className="text-[#C5D0C3]">|</span>
                  </>
                ) : null}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2D4F32]">
                  <Check className="w-3.5 h-3.5" />
                  ChillyFlakes Assured
                </span>
              </div>

              {/* Limited Deal Banner (Flipkart-style functional promotion, tailored aesthetics) */}
              <div className="bg-[#F6EFEB] border border-[#ECD9CC] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-[#7B3F1B]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#7B3F1B]" />
                  <span className="font-semibold">Special Artisan Batch Price</span>
                </div>
                <span className="text-[11px] font-medium bg-[#7B3F1B] text-white px-2 py-0.5 rounded-md">
                  Limited Time
                </span>
              </div>

              {/* Price Details */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-3">
                  {product.discount > 0 && (
                    <span className="text-sm font-bold text-[#2D4F32] bg-[#E9F0E8] px-2 py-0.5 rounded-md">
                      ↓ {product.discount}% OFF
                    </span>
                  )}
                  <span className="text-xs text-[#869584] line-through font-normal">
                    {formatRupees(product.originalPrice)}
                  </span>
                  <span className="text-3xl sm:text-4xl font-bold font-serif text-[#203D26]">
                    {formatRupees(product.price)}
                  </span>
                </div>
                {savings > 0 && (
                  <p className="text-xs font-medium text-[#2D4F32]">
                    You save {formatRupees(savings)} on this order
                  </p>
                )}
                <p className="text-[11px] text-[#869584]">Inclusive of all local craft taxes and sustainable packing.</p>
              </div>

              {/* Special Offers Box */}
              <div className="rounded-2xl bg-[#FAF7F2] border border-[#ECE7DD] p-4 space-y-2">
                <div className="text-xs font-bold text-[#203D26] uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#7B3F1B]" />
                  Available Artisan Offers & Perks
                </div>
                <ul className="text-xs text-[#4F5B4E] space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[#203D26]">•</span>
                    <span><strong>Member Code:</strong> Use <code className="bg-[#E9F0E8] text-[#203D26] px-1.5 py-0.5 rounded font-mono font-semibold">CHILLY10</code> for an instant 10% off on check-out.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[#203D26]">•</span>
                    <span><strong>Complimentary Gift:</strong> Includes complimentary lavender mini soap bar on orders over ₹999.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[#203D26]">•</span>
                    <span><strong>Free Shipping:</strong> Zero shipping fee across India on orders above {formatRupees(FREE_SHIPPING_THRESHOLD)}.</span>
                  </li>
                </ul>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4 pt-1">
                <span className="text-xs font-medium text-[#6C7B6D]">Quantity:</span>
                <div className="flex items-center border border-[#ECE7DD] rounded-xl bg-white shadow-2xs">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-9 h-9 flex items-center justify-center text-[#203D26] hover:bg-[#FAF7F2] rounded-l-xl transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-[#203D26]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    className="w-9 h-9 flex items-center justify-center text-[#203D26] hover:bg-[#FAF7F2] rounded-r-xl transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-[#869584]">
                  Total: <strong className="text-[#203D26]">{formatRupees(product.price * quantity)}</strong>
                </span>
              </div>

              {/* Delivery & Pincode Checker */}
              <div className="border-t border-[#ECE7DD] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#203D26]">
                    <MapPin className="w-4 h-4 text-[#7B3F1B]" />
                    <span>Delivery Details</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 max-w-sm">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={deliveryPincode}
                      onChange={(e) => setDeliveryPincode(e.target.value)}
                      placeholder="Enter Delivery PIN Code"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#ECE7DD] bg-[#FAF7F2] focus:bg-white focus:border-[#203D26] focus:outline-none transition-all uppercase"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setPincodeChecked(true);
                      showToast(`Delivery available for ${deliveryPincode}!`, 'info');
                    }}
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-[#203D26] hover:bg-[#182F1D] rounded-xl transition-colors cursor-pointer"
                  >
                    Check
                  </button>
                </div>

                {pincodeChecked && (
                  <div className="text-xs space-y-1 text-[#4F5B4E] bg-[#F2F7F1] p-3 rounded-xl border border-[#D8E6D6]">
                    <p className="flex items-center gap-1.5 font-medium text-[#203D26]">
                      <Truck className="w-4 h-4 text-[#2D4F32]" />
                      Delivery by <strong>Saturday, 18 Oct</strong> | <span className="text-[#2D4F32] font-semibold">FREE Delivery</span>
                    </p>
                    <p className="text-[11px] text-[#6C7B6D]">
                      Ships directly from artisan studio in handmade protected packaging.
                    </p>
                  </div>
                )}
              </div>

              {/* Product Specifications & Features */}
              <div className="border-t border-[#ECE7DD] pt-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#6C7B6D]">
                  Product Highlights & Materials
                </h3>
                
                <p className="text-xs sm:text-sm text-[#4F5B4E] leading-relaxed">
                  {product.description}
                </p>

                {product.features && product.features.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {product.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#203D26]">
                        <div className="w-4 h-4 rounded-full bg-[#E9F0E8] flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-[#2D4F32]" />
                        </div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#ECE7DD] text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6C7B6D]">Primary Ingredients / Materials:</span>
                    <span className="font-semibold text-[#203D26]">{product.material}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6C7B6D]">Batch Condition:</span>
                    <span className="font-semibold text-[#203D26]">{product.conditionDetails}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* ==================================================== */}
      {/* RELATED PRODUCTS / SIMILAR PRODUCTS SECTION          */}
      {/* ==================================================== */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
        
        {/* Section Header */}
        <div className="flex items-end justify-between mb-6 pb-3 border-b border-[#ECE7DD]">
          <div>
            <div className="text-[11px] font-bold tracking-[0.2em] text-[#7B3F1B] uppercase">
              Handpicked Artisan Recommendations
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#203D26] mt-1">
              Similar Products
            </h2>
            <p className="text-xs sm:text-sm text-[#6C7B6D] mt-1">
              {dynamicSubtitle}
            </p>
          </div>

          <button
            onClick={onBack}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#203D26] hover:text-[#7B3F1B] transition-colors"
          >
            <span>View All Products</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Similar Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {relatedProducts.map((relProduct) => (
            <div
              key={relProduct.id}
              onClick={() => onSelectProduct(relProduct)}
              className="group bg-white rounded-2xl overflow-hidden border border-[#ECE7DD] hover:border-[#203D26]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer"
            >
              {/* Product Image */}
              <div className="relative aspect-square overflow-hidden bg-[#FAF7F2] p-2">
                <img
                  src={relProduct.image}
                  alt={relProduct.name}
                  className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80';
                  }}
                />

                {/* Rating Badge */}
                {Boolean(relProduct.rating && relProduct.rating > 0) && (
                  <div className="absolute bottom-2 left-2 bg-[#203D26]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                    <span>{relProduct.rating.toFixed(1)}</span>
                    <Star className="w-2.5 h-2.5 fill-current text-[#FBBF24]" />
                  </div>
                )}

                {relProduct.discount > 0 && (
                  <span className="absolute top-2 right-2 bg-[#7B3F1B] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                    {relProduct.discount}% OFF
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div className="p-3 flex flex-col flex-grow justify-between">
                <div>
                  <h3 className="font-medium text-xs text-[#203D26] group-hover:text-[#2D4F32] transition-colors line-clamp-2 leading-snug">
                    {relProduct.name}
                  </h3>
                  <p className="text-[10px] text-[#6C7B6D] mt-1 line-clamp-1">
                    {relProduct.material}
                  </p>
                </div>

                <div className="pt-2 mt-2 border-t border-[#ECE7DD] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#203D26]">
                      {formatRupees(relProduct.price)}
                    </div>
                    {relProduct.originalPrice > relProduct.price && (
                      <div className="text-[10px] text-[#869584] line-through">
                        {formatRupees(relProduct.originalPrice)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(relProduct, 1);
                      showToast(`Added ${relProduct.name} to cart`, 'success');
                    }}
                    className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#203D26] text-[#203D26] hover:text-white transition-colors"
                    title="Quick add to cart"
                    aria-label="Add to cart"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>

    </div>
  );
};

export default ProductDetailPage;
