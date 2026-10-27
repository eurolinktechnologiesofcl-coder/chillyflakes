import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Heart, 
  ShoppingCart, 
  Zap, 
  Star, 
  Truck, 
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatRupees, FREE_SHIPPING_THRESHOLD } from '../utils/currency';

export const QuickViewModal: React.FC = () => {
  const navigate = useNavigate();
  const { 
    quickViewProduct, 
    setQuickViewProduct, 
    addToCart, 
    toggleWishlist, 
    isInWishlist,
    setIsCartOpen 
  } = useStore();

  const [selectedImg, setSelectedImg] = useState<string>('');
  const [deliveryPincode, setDeliveryPincode] = useState('682001');

  if (!quickViewProduct) return null;

  const isWishlisted = isInWishlist(quickViewProduct.id);
  const currentImage = selectedImg || quickViewProduct.image;

  const handleBuyNow = () => {
    addToCart(quickViewProduct, 1);
    setQuickViewProduct(null);
    setIsCartOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => setQuickViewProduct(null)}
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className="relative transform overflow-hidden rounded-3xl bg-white text-[#223B28] text-left shadow-2xl transition-all w-full max-w-4xl border border-[#ECE7DD]">
          
          {/* Close button */}
          <button
            onClick={() => setQuickViewProduct(null)}
            className="absolute top-4 right-4 text-[#7E8F80] hover:text-[#223B28] hover:bg-[#FAF7F2] rounded-full z-20 p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-12 p-6 sm:p-8 gap-6 sm:gap-8">
            
            {/* Left Column: Image Box & Buttons */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-4">
              <div className="relative aspect-square w-full border border-[#ECE7DD] rounded-2xl p-4 flex items-center justify-center bg-[#FAF7F2] overflow-hidden">
                <img
                  src={currentImage}
                  alt={quickViewProduct.name}
                  className="max-h-full max-w-full object-cover rounded-xl"
                />

                {/* Wishlist */}
                <button
                  onClick={() => toggleWishlist(quickViewProduct)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-[#223B28] shadow-xs hover:text-[#DC2626] transition-colors"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#DC2626] text-[#DC2626]' : 'text-[#7E8F80]'}`} />
                </button>

                {/* Condition / Eco tag */}
                <span className="absolute top-3 left-3 text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs bg-[#2E4D34] text-white">
                  Handmade
                </span>
              </div>

              {/* Thumbnails */}
              {quickViewProduct.additionalImages && quickViewProduct.additionalImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {quickViewProduct.additionalImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImg(img)}
                      className={`w-14 h-14 p-1 border rounded-xl bg-[#FAF7F2] flex-shrink-0 transition-all ${
                        currentImage === img ? 'border-[#2E4D34] ring-1 ring-[#2E4D34]' : 'border-[#ECE7DD]'
                      }`}
                    >
                      <img src={img} alt="Thumbnail" className="w-full h-full object-cover rounded-lg" />
                    </button>
                  ))}
                </div>
              )}

              {/* Dual Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    addToCart(quickViewProduct, 1);
                    setQuickViewProduct(null);
                  }}
                  className="py-3 bg-white border border-[#2E4D34] hover:bg-[#FAF7F2] text-[#2E4D34] text-xs font-semibold rounded-full shadow-2xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  className="py-3 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-bold rounded-full shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Buy Now</span>
                </button>
              </div>
            </div>

            {/* Right Column: Product Specs, Ratings & Delivery */}
            <div className="md:col-span-7 space-y-4">
              
              <div>
                <p className="text-xs text-[#556956] uppercase font-bold tracking-wider">
                  {quickViewProduct.category}
                </p>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#223B28] mt-1 leading-snug">
                  {quickViewProduct.name}
                </h3>

                {/* Rating Bar */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center text-[#E5A024]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current text-[#E5A024]" />
                    ))}
                  </div>
                  <span className="text-xs text-[#6C7B6D] font-medium">
                    {quickViewProduct.reviewsCount} Customer Reviews
                  </span>
                  <span className="ml-2 inline-flex items-center text-xs font-bold text-[#2E4D34] bg-[#EAF1EA] px-2.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Verified Artisan
                  </span>
                </div>
              </div>

              {/* Special Price Display */}
              <div className="pt-2 border-t border-[#ECE7DD]">
                <div className="text-[11px] text-[#2E4D34] font-bold uppercase tracking-wider">Special Price</div>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-bold text-[#223B28]">
                    {formatRupees(quickViewProduct.price)}
                  </span>
                  {quickViewProduct.originalPrice > quickViewProduct.price && (
                    <>
                      <span className="text-sm line-through text-[#8F9E8F]">
                        {formatRupees(quickViewProduct.originalPrice)}
                      </span>
                      <span className="text-xs font-bold text-[#2E4D34]">
                        {quickViewProduct.discount}% off
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[#506052] leading-relaxed">
                {quickViewProduct.description}
              </p>

              {/* Product Details Specs */}
              <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#ECE7DD] space-y-1.5 text-xs text-[#223B28]">
                <div className="flex">
                  <span className="w-28 text-[#6C7B6D] font-medium">Material:</span>
                  <span className="font-semibold text-[#223B28]">{quickViewProduct.material}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-[#6C7B6D] font-medium">Eco Standard:</span>
                  <span className="font-semibold text-[#2E4D34]">100% Sustainable & Handcrafted</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-[#6C7B6D] font-medium">Stock Status:</span>
                  <span className="font-semibold text-[#223B28]">In Stock ({quickViewProduct.stock} left)</span>
                </div>
              </div>

              {/* Delivery Pin Check */}
              <div className="pt-2">
                <div className="text-xs font-semibold text-[#223B28] mb-1.5 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-[#2E4D34]" />
                  <span>Check Delivery Date</span>
                </div>
                <div className="flex items-center gap-2 max-w-xs">
                  <input
                    type="text"
                    value={deliveryPincode}
                    onChange={(e) => setDeliveryPincode(e.target.value)}
                    placeholder="Enter PIN Code"
                    className="w-full text-xs px-3 py-2 border border-[#ECE7DD] rounded-xl focus:outline-none focus:border-[#2E4D34]"
                  />
                  <button className="px-4 py-2 bg-[#2E4D34] text-white text-xs font-medium rounded-xl hover:bg-[#233B27]">
                    Check
                  </button>
                </div>
                <p className="text-[11px] text-[#6C7B6D] mt-1.5">
                  Delivery by <strong>Tomorrow, 5:00 PM</strong> | Free shipping on orders over {formatRupees(FREE_SHIPPING_THRESHOLD)}
                </p>
              </div>

              {/* View Full Product Details Link */}
              <div className="pt-2 border-t border-[#ECE7DD]">
                <button
                  onClick={() => {
                    const id = quickViewProduct.id;
                    setQuickViewProduct(null);
                    navigate(`/products/${id}`);
                  }}
                  className="w-full py-2.5 px-4 bg-[#FAF7F2] hover:bg-[#EAF1EA] text-[#2E4D34] font-semibold text-xs rounded-xl border border-[#D5DDD0] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>View Complete Details, Ingredients & Customer Reviews</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
