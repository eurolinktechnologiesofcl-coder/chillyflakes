import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ArrowRight, Star } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatRupees } from '../utils/currency';

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { wishlist, products, addToCart, toggleWishlist, showToast, setIsCartOpen } = useStore();

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  const handleAddAllToCart = () => {
    wishlistedProducts.forEach((p) => {
      addToCart(p, 1);
    });
    setIsCartOpen(true);
    showToast(`Added ${wishlistedProducts.length} items to your cart!`, 'success');
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-8 sm:py-12 border-b border-[#ECE7DD]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#6C7B6D] mb-4">
          <Link to="/" className="hover:text-[#2E4D34]">Home</Link>
          <span>/</span>
          <span className="font-semibold text-[#223B28]">My Wishlist</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#ECE7DD] gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#223B28] tracking-tight">
              My Saved Favorites
            </h1>
            <p className="text-xs sm:text-sm text-[#6C7B6D] mt-1">
              You have {wishlistedProducts.length} handcrafted items saved to your personal collection.
            </p>
          </div>

          {wishlistedProducts.length > 0 && (
            <button
              onClick={handleAddAllToCart}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-full shadow-xs transition-colors self-start"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Move All to Cart</span>
            </button>
          )}
        </div>

        {/* Empty State */}
        {wishlistedProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 sm:p-16 text-center border border-[#ECE7DD] shadow-xs max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#FAF0ED] text-[#D82C20] flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#223B28]">
              Your Wishlist is Empty
            </h2>
            <p className="text-xs sm:text-sm text-[#6C7B6D] leading-relaxed">
              Explore our handmade organic face elixirs, Malabar spices, terracotta pottery, and artisan jewelry to save your favorites.
            </p>
            <div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-full shadow-xs"
              >
                <span>Browse Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {wishlistedProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => navigate(`/products/${prod.id}`)}
                className="group bg-white rounded-2xl overflow-hidden border border-[#ECE7DD] hover:border-[#2E4D34]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                <div className="relative aspect-square overflow-hidden bg-[#FAF7F2]">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Remove from wishlist button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(prod);
                    }}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 text-[#D82C20] flex items-center justify-center shadow-md hover:bg-white transition-colors"
                    title="Remove from Wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Rating Badge */}
                  <div className="absolute bottom-2.5 left-2.5 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span>{prod.rating.toFixed(1)}</span>
                    <Star className="w-2.5 h-2.5 fill-[#FBBF24] text-[#FBBF24]" />
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-grow justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6C7B6D]">
                      {prod.category}
                    </span>
                    <h3 className="font-semibold text-xs sm:text-sm text-[#223B28] group-hover:text-[#2E4D34] transition-colors mt-0.5 line-clamp-2">
                      {prod.name}
                    </h3>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#F2ECE1] flex items-center justify-between">
                    <span className="font-bold text-sm text-[#223B28]">
                      {formatRupees(prod.price)}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(prod, 1);
                        showToast(`Added ${prod.name} to cart`, 'success');
                      }}
                      className="px-3 py-1.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default WishlistPage;
