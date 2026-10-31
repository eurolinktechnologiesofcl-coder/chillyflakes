import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Plus, 
  Minus, 
  ShoppingCart, 
  CheckCircle2,
  MapPin,
  Tag,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ordersApi } from '../api';
import { formatRupees } from '../utils/currency';
import { useLivePlatformSettings } from '../utils/platformSync';

export const CartDrawer: React.FC = () => {
  const { t } = useTranslation();
  const { 
    isCartOpen, 
    setIsCartOpen, 
    cart, 
    updateQuantity, 
    removeFromCart, 
    cartTotal,
    showToast,
    openProductPage
  } = useStore();

  const navigate = useNavigate();
  const { freeShippingThreshold, standardDeliveryFee } = useLivePlatformSettings();

  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [postalCode, setPostalCode] = useState('682001');
  const [orderDone, setOrderDone] = useState(false);
  const [createdOrderRef] = useState<string>('');

  const promoApplied = Boolean(appliedCoupon && appliedCoupon.valid);
  let discountAmount = 0;
  if (promoApplied) {
    if (appliedCoupon.discountType === 'FIXED') {
      discountAmount = appliedCoupon.discountValue || 0;
    } else {
      const pct = appliedCoupon.discountValue || appliedCoupon.discountPercent || 0;
      discountAmount = Math.round((cartTotal * pct) / 100);
      if (appliedCoupon.maxDiscountAmount && discountAmount > appliedCoupon.maxDiscountAmount) {
        discountAmount = appliedCoupon.maxDiscountAmount;
      }
    }
    discountAmount = Math.min(discountAmount, cartTotal);
  }

  const deliveryCharge = cartTotal >= freeShippingThreshold || cartTotal === 0 ? 0 : standardDeliveryFee;
  const finalPayable = Math.max(0, cartTotal - discountAmount + deliveryCharge);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    try {
      const res = await ordersApi.validateCoupon(code, cartTotal);
      if (res.data?.valid) {
        setAppliedCoupon(res.data);
        setPromoCode('');
        showToast(res.data.message || `Coupon "${code}" applied!`, 'success');
      } else {
        showToast(res.data?.message || 'Invalid coupon code. Try "POD" or "CHILLY10"', 'warning');
      }
    } catch {
      if (code === 'POD') {
        if (cartTotal >= 500) {
          setAppliedCoupon({
            valid: true,
            code: 'POD',
            discountType: 'FIXED',
            discountValue: 50,
            message: 'Flat ₹50 OFF applied!',
          });
          setPromoCode('');
          showToast('Coupon "POD" applied! Flat ₹50 discount.', 'success');
        } else {
          showToast('Minimum order of ₹500 required for POD coupon.', 'warning');
        }
      } else {
        showToast('Could not validate coupon. Try "CHILLY10"', 'warning');
      }
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon removed.', 'info');
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => { setIsCartOpen(false); setOrderDone(false); }}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-lg bg-white text-[#223B28] shadow-2xl flex flex-col justify-between border-l border-[#ECE7DD]">
          
          {/* Header */}
          <div className="px-5 py-4 bg-[#FAF7F2] text-[#223B28] flex items-center justify-between border-b border-[#ECE7DD]">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-[#2E4D34]" />
              <h2 className="font-serif font-bold text-base tracking-wide">
                {t('cart.myCart', { count: cart.reduce((s, i) => s + i.quantity, 0), defaultValue: `My Cart (${cart.reduce((s, i) => s + i.quantity, 0)})` })}
              </h2>
            </div>
            <button
              onClick={() => { setIsCartOpen(false); setOrderDone(false); }}
              className="p-1.5 hover:bg-[#EAF1EA] rounded-full transition-colors text-[#506052]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Postal Code Strip */}
          <div className="bg-[#FAF7F2] px-5 py-2.5 border-b border-[#ECE7DD] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#223B28]">
              <MapPin className="w-3.5 h-3.5 text-[#2E4D34]" />
              <span>{t('cart.deliverTo', 'Deliver to:')} <strong className="font-semibold text-[#223B28]">{postalCode}</strong></span>
            </div>
            <button 
              onClick={() => {
                const newCode = prompt("Enter PIN code:", postalCode);
                if (newCode) setPostalCode(newCode.trim());
              }}
              className="px-3 py-1 text-[#2E4D34] bg-white border border-[#D1DDD0] rounded-full font-semibold hover:bg-[#EAF1EA] transition-colors"
            >
              {t('cart.change', 'Change')}
            </button>
          </div>

          {/* Dynamic Free Shipping Progress Bar (Driven by Super Admin Settings) */}
          {cart.length > 0 && !orderDone && (
            <div className="bg-[#F4F1EA] px-5 py-2 border-b border-[#ECE7DD] text-[11px]">
              {cartTotal >= freeShippingThreshold ? (
                <div className="flex items-center gap-1.5 text-[#2E4D34] font-semibold">
                  <span>🎉</span>
                  <span>Unlocked FREE Delivery (Orders {formatRupees(freeShippingThreshold)}+)</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[#506052]">
                    <span>Add <strong className="text-[#2E4D34]">{formatRupees(freeShippingThreshold - cartTotal)}</strong> more for FREE delivery</span>
                    <span className="font-mono text-[10px]">{Math.round((cartTotal / freeShippingThreshold) * 100)}%</span>
                  </div>
                  <div className="w-full bg-[#E3DDD1] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#2E4D34] h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round((cartTotal / freeShippingThreshold) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {orderDone ? (
              <div className="bg-[#FAF7F2] rounded-3xl p-8 text-center space-y-4 border border-[#ECE7DD]">
                <div className="w-16 h-16 rounded-full bg-[#EAF1EA] border border-[#C6D5C5] text-[#2E4D34] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#223B28]">
                  {t('cart.orderSuccessTitle', 'Order Placed Successfully!')}
                </h3>
                {createdOrderRef && (
                  <div className="inline-block px-3 py-1 bg-white border border-[#D5DDD0] text-xs font-mono text-[#2E4D34] rounded-full">
                    Order Ref: {createdOrderRef}
                  </div>
                )}
                <p className="text-xs text-[#506052] leading-relaxed max-w-xs mx-auto font-normal">
                  {t('cart.orderSuccessDesc', 'Your handcrafted goods are being lovingly packed by our local artisans. Estimated delivery: 2-3 business days.')}
                </p>
                <button
                  onClick={() => { setOrderDone(false); setIsCartOpen(false); }}
                  className="px-6 py-2.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-full shadow-xs uppercase tracking-wider transition-colors"
                >
                  {t('cart.continueShopping', 'Continue Shopping')}
                </button>
              </div>
            ) : cart.length === 0 ? (
              <div className="bg-[#FAF7F2] rounded-3xl p-12 text-center space-y-4 border border-[#ECE7DD]">
                <div className="w-20 h-20 rounded-full bg-[#EAF1EA] text-[#2E4D34] mx-auto flex items-center justify-center text-3xl">
                  🌿
                </div>
                <h3 className="font-serif font-bold text-base text-[#223B28]">
                  {t('cart.emptyTitle', 'Your cart is empty!')}
                </h3>
                <p className="text-xs text-[#506052]">
                  {t('cart.emptyDesc', 'Explore our curated handmade collection and add items to your cart.')}
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-2.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-full uppercase tracking-wider transition-colors shadow-xs"
                >
                  {t('cart.shopNow', 'Shop Now')}
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-[#FAF7F2] rounded-2xl border border-[#ECE7DD] p-4 flex gap-4"
                >
                  {/* Image */}
                  <div 
                    onClick={() => {
                      openProductPage(item.product);
                      setIsCartOpen(false);
                      navigate(`/products/${item.product.id}`);
                    }}
                    className="w-20 h-20 p-1 flex-shrink-0 flex items-center justify-center bg-white rounded-xl border border-[#ECE7DD] cursor-pointer hover:border-[#203D26]"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="max-h-full max-w-full object-cover rounded-lg"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 
                        onClick={() => {
                          openProductPage(item.product);
                          setIsCartOpen(false);
                          navigate(`/products/${item.product.id}`);
                        }}
                        className="text-xs sm:text-sm font-semibold text-[#223B28] hover:text-[#2D4F32] cursor-pointer line-clamp-1 transition-colors"
                      >
                        {item.product.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-sans uppercase px-2 py-0.5 rounded-full bg-[#EAF1EA] text-[#2E4D34] font-semibold">
                          Handmade
                        </span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-sm font-bold text-[#223B28]">
                        {formatRupees(item.product.price * item.quantity)}
                      </span>
                    </div>

                    {/* Actions & Quantity */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#E5DDD0] text-xs">
                      {/* Quantity stepper */}
                      <div className="flex items-center border border-[#D1DDD0] rounded-full bg-white overflow-hidden shadow-2xs">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-[#506052] hover:text-[#223B28] hover:bg-[#FAF7F2]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-bold text-xs text-[#223B28]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-[#506052] hover:text-[#223B28] hover:bg-[#FAF7F2]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="font-semibold text-[#7E8F80] hover:text-[#DC2626] uppercase text-[11px] transition-colors"
                      >
                        {t('cart.remove', 'Remove')}
                      </button>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>

          {/* Price Details & Place Order Bar */}
          {cart.length > 0 && !orderDone && (
            <div className="bg-[#FAF7F2] border-t border-[#ECE7DD] p-4 sm:p-5 space-y-3.5">
              
              {/* Coupon Box */}
              {promoApplied ? (
                <div className="flex items-center justify-between p-2.5 bg-[#EAF1EA] border border-[#2E4D34]/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#2E4D34]" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-[#2E4D34]">{appliedCoupon.code}</span>
                        <span className="text-[10px] bg-[#2E4D34] text-white px-1.5 py-0.5 rounded font-semibold">APPLIED</span>
                      </div>
                      <p className="text-[11px] text-[#506052]">
                        {appliedCoupon.discountType === 'FIXED' 
                          ? `Flat ₹${appliedCoupon.discountValue} OFF` 
                          : `${appliedCoupon.discountValue || appliedCoupon.discountPercent || 10}% OFF`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-[#DC2626] hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    {t('cart.remove', 'Remove')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7E8F80]" />
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder={t('cart.couponPlaceholder', 'Enter Coupon: POD, CHILLY10')}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#ECE7DD] rounded-xl focus:outline-none focus:border-[#2E4D34] uppercase font-mono bg-white text-[#223B28]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    {t('cart.apply', 'Apply')}
                  </button>
                </form>
              )}

              {/* Bill Summary */}
              <div className="space-y-1.5 text-xs text-[#506052] pt-2 border-t border-[#E5DDD0]">
                <div className="flex justify-between">
                  <span>{t('cart.subtotal', 'Subtotal')}</span>
                  <span className="font-semibold text-[#223B28]">{formatRupees(cartTotal)}</span>
                </div>
                {promoApplied && (
                  <div className="flex justify-between text-[#2E4D34]">
                    <span>
                      {t('cart.couponDiscount', 'Coupon Discount')} ({appliedCoupon.code}
                      {appliedCoupon.discountType === 'FIXED' ? ` - Flat ₹${appliedCoupon.discountValue}` : ` - ${appliedCoupon.discountValue || appliedCoupon.discountPercent || 10}%`})
                    </span>
                    <span>- {formatRupees(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t('cart.shipping', 'Shipping')}</span>
                  <span className={deliveryCharge === 0 ? "text-[#2E4D34] font-semibold" : "font-semibold text-[#223B28]"}>
                    {deliveryCharge === 0 ? t('cart.free', 'FREE') : formatRupees(deliveryCharge)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#223B28] pt-2 border-t border-[#E5DDD0]">
                  <span>{t('cart.totalAmount', 'Total Amount')}</span>
                  <span>{formatRupees(finalPayable)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/checkout');
                }}
                className="w-full py-3.5 bg-[#2E4D34] hover:bg-[#233B27] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{t('cart.proceedToCheckout', 'Proceed to Checkout')} &bull; {formatRupees(finalPayable)}</span>
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
