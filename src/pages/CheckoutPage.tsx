import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CreditCard, 
  Truck, 
  Lock, 
  Plus, 
  Smartphone, 
  Banknote, 
  Building, 
  Check,
  Tag,
  X,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { INDIAN_STATES } from '../data/indianStates';
import { formatRupees } from '../utils/currency';
import { useLivePlatformSettings, syncBuyerOrderToAdmin } from '../utils/platformSync';
import { ordersApi, type CouponValidationResponse } from '../api';
import type { BuyerAddress, BuyerOrder } from '../types';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    freeShippingThreshold,
    standardDeliveryFee,
    maintenanceMode,
    settings: platformSettings,
  } = useLivePlatformSettings();
  const deliveryDays = platformSettings.shipping?.estimated_delivery_days ?? 4;
  const { 
    cart, 
    cartTotal, 
    clearCart, 
    addresses, 
    addAddress, 
    addOrder, 
    showToast, 
    user, 
    setIsLoginOpen,
  } = useStore();

  // Address selection & form state
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    addresses[0]?.id || 'new'
  );
  const [isAddingNewAddress, setIsAddingNewAddress] = useState<boolean>(
    addresses.length === 0
  );

  const [fullName, setFullName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [street, setStreet] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('Karnataka');
  const [postalCode, setPostalCode] = useState<string>('');
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');


  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>('');

  // Promo / Coupon code state
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResponse | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // If cart is empty, render friendly empty state
  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#FAF7F2] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white p-8 sm:p-10 rounded-3xl border border-[#ECE7DD] shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#FAF7F2] text-[#2E4D34] flex items-center justify-center mx-auto text-3xl">
            🛒
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#223B28]">
            Your Shopping Cart is Empty
          </h2>
          <p className="text-xs sm:text-sm text-[#6C7B6D]">
            Explore our curated collections of organic spices, botanical care, and artisanal homeware to add items before checking out.
          </p>
          <Link
            to="/shop"
            className="inline-block px-7 py-3 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs sm:text-sm font-semibold rounded-full shadow-xs transition-colors"
          >
            Explore Marketplace
          </Link>
        </div>
      </div>
    );
  }

  // Financial calculations: Standard delivery + dynamic coupon discount
  const baseDelivery = cartTotal >= freeShippingThreshold ? 0 : standardDeliveryFee;
  const deliveryCharge = baseDelivery;

  let discountAmount = 0;
  if (appliedCoupon && appliedCoupon.valid) {
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

  const finalPayable = Math.max(0, cartTotal - discountAmount + deliveryCharge);
  const estimatedDate = new Date(Date.now() + deliveryDays * 86400000).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await ordersApi.validateCoupon(code, cartTotal);
      if (res.data?.valid) {
        setAppliedCoupon(res.data);
        setPromoCode('');
        showToast(res.data.message || `Coupon "${code}" applied!`, 'success');
      } else {
        setCouponError(res.data?.message || 'Invalid or ineligible coupon code.');
        showToast(res.data?.message || 'Invalid coupon code.', 'warning');
      }
    } catch {
      // Local fallback for offline / test
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
          setCouponError('Minimum order amount of ₹500 required for POD coupon.');
          showToast('Minimum order of ₹500 required for POD coupon.', 'warning');
        }
      } else if (code === 'CHILLY10') {
        setAppliedCoupon({
          valid: true,
          code: 'CHILLY10',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          discountPercent: 10,
          message: '10% discount applied!',
        });
        setPromoCode('');
        showToast('Coupon "CHILLY10" applied! 10% discount added.', 'success');
      } else {
        setCouponError('Invalid coupon code.');
        showToast('Invalid coupon code.', 'warning');
      }
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    showToast('Coupon removed.', 'info');
  };

  const handleFillTestCard = () => {
    setCardNumber('4532 •••• •••• 8910');
    setCardExpiry('12/28');
    setCardCvv('421');
    setCardHolder(fullName || user?.name || '');
    showToast('Test payment card details applied.', 'info');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (maintenanceMode) {
      showToast('The marketplace is under maintenance. Ordering is temporarily paused.', 'warning');
      return;
    }
    if (!user?.isLoggedIn) {
      showToast('Please sign in to place an order.', 'warning');
      setIsLoginOpen(true);
      return;
    }

    const customerId = (user.email || user.phone || '').trim().toLowerCase();
    setIsSubmitting(true);

    try {
      let shippingAddress: BuyerAddress;

      if (isAddingNewAddress || selectedAddressId === 'new') {
        if (!fullName || !phone || !street || !city || !postalCode) {
          showToast('Please fill in all required shipping address fields.', 'warning');
          setIsSubmitting(false);
          return;
        }
        shippingAddress = addAddress({
          fullName,
          phone,
          street,
          landmark,
          city,
          state,
          postalCode,
          type: addressType,
          isDefault: addresses.length === 0,
        });
      } else {
        const found = addresses.find((a) => a.id === selectedAddressId);
        shippingAddress = found || addresses[0];
      }

      const generatedId = `CF-${Math.floor(100000 + Math.random() * 900000)}`;

      // API call to create order with matching orderNumber
      const orderRes = await ordersApi.createOrder({
        orderNumber: generatedId,
        items: cart.map((c) => ({
          productId: c.product.id,
          name: c.product.name,
          price: c.product.price,
          quantity: c.quantity,
        })),
        totalAmount: finalPayable,
        deliveryCharge,
        discountAmount,
        couponCode: appliedCoupon?.code,
        postalCode: shippingAddress.postalCode,
        customerName: shippingAddress.fullName,
        customerEmail: customerId,
        customerPhone: shippingAddress.phone,
        paymentMethod,
        deliverySpeed: 'standard',
        shippingAddress,
      });

      const finalOrderId = orderRes.data?.orderNumber || generatedId;

      const newOrder: BuyerOrder = {
        id: finalOrderId,
        createdAt: orderRes.data?.createdAt || new Date().toISOString(),
        status: 'Placed',
        items: [...cart],
        subtotal: cartTotal,
        discountAmount,
        deliveryCharge,
        totalAmount: finalPayable,
        shippingAddress,
        paymentMethod,
        paymentId: paymentMethod === 'upi' ? `upi_${Date.now()}` : paymentMethod === 'card' ? `card_${Date.now()}` : undefined,
        deliverySpeed: 'standard',
        estimatedDeliveryDate: `By ${estimatedDate}`,
        customerEmail: customerId,
      };

      addOrder(newOrder);
      // Push into the Super Admin order queue (idempotent — one admin order per checkout)
      syncBuyerOrderToAdmin(newOrder);

      clearCart();
      showToast('Order confirmed! Generating receipt...', 'success');
      navigate(`/order-success/${finalOrderId}`);
    } catch (err) {
      console.error('Order error:', err);
      showToast('Error finalizing order. Please try again.', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-8 sm:py-12 border-b border-[#ECE7DD]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-xs text-[#6C7B6D] mb-6">
          <Link to="/" className="hover:text-[#2E4D34]">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-[#2E4D34]">Shop</Link>
          <span>/</span>
          <span className="font-semibold text-[#223B28]">Secure Checkout</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#223B28] mb-6 tracking-tight">
          Checkout & Delivery
        </h1>

        {/* Real-time Super Admin Maintenance Alert */}
        {maintenanceMode && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center gap-3">
            <span className="text-base">⚠️</span>
            <span>
              <strong>Scheduled Maintenance:</strong> Ordering is temporarily paused while we perform platform maintenance. Please check back shortly.
            </span>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* ==================================================== */}
          {/* LEFT COLUMN: Shipping & Payment Steps                */}
          {/* ==================================================== */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Step 1: Delivery Address */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE7DD] shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DD]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#2E4D34] text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <h2 className="font-serif text-xl font-bold text-[#223B28]">
                    Shipping & Delivery Address
                  </h2>
                </div>

                {addresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewAddress(!isAddingNewAddress)}
                    className="text-xs font-semibold text-[#2E4D34] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingNewAddress ? 'Select Saved Address' : 'Add New Address'}</span>
                  </button>
                )}
              </div>

              {/* Saved Addresses Selector */}
              {!isAddingNewAddress && addresses.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#2E4D34] bg-[#FAF7F2] shadow-xs'
                            : 'border-[#ECE7DD] hover:border-[#D5C9B3]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#223B28]">{addr.fullName}</span>
                            <span className="text-[10px] font-semibold bg-white border border-[#D5C9B3] px-2 py-0.5 rounded-full text-[#6C7B6D]">
                              {addr.type}
                            </span>
                          </div>
                          <p className="text-xs text-[#506052] mt-1.5 leading-relaxed">
                            {addr.street}, {addr.landmark && `${addr.landmark}, `}{addr.city}, {addr.state} — {addr.postalCode}
                          </p>
                          <p className="text-[11px] text-[#6C7B6D] mt-2">
                            Phone: +91 {addr.phone}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[#ECE7DD] flex items-center justify-between text-xs">
                          <span className={`font-semibold ${isSelected ? 'text-[#2E4D34]' : 'text-transparent'}`}>
                            ✓ Deliver Here
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* New Address Form */}
              {(isAddingNewAddress || addresses.length === 0) && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#6C7B6D] block mb-1">
                        Full Recipient Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Ananya Sharma"
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#6C7B6D] block mb-1">
                        10-Digit Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#6C7B6D] block mb-1">
                      Flat / House No. / Building & Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="e.g. Flat 402, Green Glen Orchid, Outer Ring Road"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#6C7B6D] block mb-1">
                        Landmark
                      </label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="Near Ecospace"
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#6C7B6D] block mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Bengaluru"
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#6C7B6D] block mb-1">
                        State *
                      </label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34]"
                      >
                        {INDIAN_STATES.map((st) => (
                          <option key={st.code} value={st.name}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#6C7B6D] block mb-1">
                        6-Digit PIN Code *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="560103"
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#6C7B6D] block mb-1">
                        Address Label
                      </label>
                      <div className="flex gap-2">
                        {(['Home', 'Work', 'Other'] as const).map((type) => (
                          <button
                            type="button"
                            key={type}
                            onClick={() => setAddressType(type)}
                            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                              addressType === type
                                ? 'bg-[#2E4D34] text-white border-[#2E4D34]'
                                : 'bg-[#FAF7F2] text-[#2D3A2F] border-[#D5C9B3]'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Delivery Speed */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE7DD] shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#ECE7DD]">
                <div className="w-7 h-7 rounded-full bg-[#2E4D34] text-white flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <h2 className="font-serif text-xl font-bold text-[#223B28]">
                  Delivery Method
                </h2>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl border-2 border-[#2E4D34] bg-[#FAF7F2] flex items-start gap-3.5">
                <div className="w-5 h-5 rounded-full bg-[#2E4D34] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[#2E4D34]" />
                      <span className="text-sm font-bold text-[#223B28]">Standard Delivery</span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#2E4D34]/10 text-[#2E4D34]">
                      {baseDelivery === 0 ? 'FREE DELIVERY' : `+ ${formatRupees(standardDeliveryFee)}`}
                    </span>
                  </div>
                  <p className="text-xs text-[#6C7B6D] mt-1.5 leading-relaxed">
                    Delivered in about {deliveryDays} business days across India (estimated by {estimatedDate}).
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Payment Method */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE7DD] shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#ECE7DD]">
                <div className="w-7 h-7 rounded-full bg-[#2E4D34] text-white flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <h2 className="font-serif text-xl font-bold text-[#223B28]">
                  Payment Method
                </h2>
              </div>

              <div className="space-y-3">
                
                {/* UPI Option */}
                <div className={`p-4 rounded-2xl border-2 transition-all ${
                  paymentMethod === 'upi' ? 'border-[#2E4D34] bg-[#FAF7F2]' : 'border-[#ECE7DD]'
                }`}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'upi'}
                        onChange={() => setPaymentMethod('upi')}
                        className="accent-[#2E4D34]"
                      />
                      <Smartphone className="w-4 h-4 text-[#2E4D34]" />
                      <div>
                        <span className="text-xs font-bold text-[#223B28]">UPI Instant Pay</span>
                        <span className="text-[11px] text-[#6C7B6D] block">Google Pay, PhonePe, Paytm, BHIM</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[#EAF1EA] text-[#2E4D34] font-bold px-2 py-0.5 rounded-full">
                      Zero Fees
                    </span>
                  </label>

                  {paymentMethod === 'upi' && (
                    <div className="mt-3 pt-3 border-t border-[#ECE7DD] flex gap-2">
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="username@okhdfcbank"
                        className="w-full sm:w-64 px-3 py-1.5 text-xs rounded-xl bg-white border border-[#D5C9B3]"
                      />
                      <span className="text-xs font-semibold text-[#2E4D34] flex items-center">
                        ✓ Verified UPI ID
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Option */}
                <div className={`p-4 rounded-2xl border-2 transition-all ${
                  paymentMethod === 'card' ? 'border-[#2E4D34] bg-[#FAF7F2]' : 'border-[#ECE7DD]'
                }`}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'card'}
                        onChange={() => setPaymentMethod('card')}
                        className="accent-[#2E4D34]"
                      />
                      <CreditCard className="w-4 h-4 text-[#2E4D34]" />
                      <div>
                        <span className="text-xs font-bold text-[#223B28]">Credit or Debit Card</span>
                        <span className="text-[11px] text-[#6C7B6D] block">Visa, Mastercard, RuPay, Maestro</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#6C7B6D] font-medium">100% Encrypted</span>
                  </label>

                  {paymentMethod === 'card' && (
                    <div className="mt-3 pt-3 border-t border-[#ECE7DD] space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-[#6C7B6D]">Enter Card Details</span>
                        <button
                          type="button"
                          onClick={handleFillTestCard}
                          className="text-[10px] text-[#2E4D34] underline font-semibold"
                        >
                          Auto-fill Demo Card
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="Card Number"
                          className="px-3 py-2 text-xs rounded-xl bg-white border border-[#D5C9B3]"
                        />
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="Cardholder Name"
                          className="px-3 py-2 text-xs rounded-xl bg-white border border-[#D5C9B3]"
                        />
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM / YY"
                          className="px-3 py-2 text-xs rounded-xl bg-white border border-[#D5C9B3]"
                        />
                        <input
                          type="password"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="CVV"
                          className="px-3 py-2 text-xs rounded-xl bg-white border border-[#D5C9B3]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Net Banking */}
                <div className={`p-4 rounded-2xl border-2 transition-all ${
                  paymentMethod === 'netbanking' ? 'border-[#2E4D34] bg-[#FAF7F2]' : 'border-[#ECE7DD]'
                }`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'netbanking'}
                      onChange={() => setPaymentMethod('netbanking')}
                      className="accent-[#2E4D34]"
                    />
                    <Building className="w-4 h-4 text-[#2E4D34]" />
                    <span className="text-xs font-bold text-[#223B28]">Net Banking (All Indian Banks)</span>
                  </label>
                </div>

                {/* Cash on Delivery */}
                <div className={`p-4 rounded-2xl border-2 transition-all ${
                  paymentMethod === 'cod' ? 'border-[#2E4D34] bg-[#FAF7F2]' : 'border-[#ECE7DD]'
                }`}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="accent-[#2E4D34]"
                      />
                      <Banknote className="w-4 h-4 text-[#2E4D34]" />
                      <div>
                        <span className="text-xs font-bold text-[#223B28]">Cash on Delivery (COD)</span>
                        <span className="text-[11px] text-[#6C7B6D] block">Pay cash or UPI at your doorstep</span>
                      </div>
                    </div>
                  </label>
                </div>

              </div>
            </div>

          </div>

          {/* ==================================================== */}
          {/* RIGHT COLUMN: Order Summary & Placement              */}
          {/* ==================================================== */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#ECE7DD] shadow-sm space-y-5 lg:sticky lg:top-28">
              
              <h3 className="font-serif text-xl font-bold text-[#223B28] pb-3 border-b border-[#ECE7DD]">
                Order Summary ({cart.length} Items)
              </h3>

              {/* Items List Preview */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 py-1">
                    <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] p-1 flex-shrink-0 border border-[#ECE7DD]">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-[#223B28] truncate">{item.product.name}</h4>
                      <p className="text-[10px] text-[#6C7B6D]">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-xs font-bold text-[#223B28]">
                      {formatRupees(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon Code Section */}
              <div className="pt-3 border-t border-[#ECE7DD] space-y-2">
                {appliedCoupon && appliedCoupon.valid ? (
                  <div className="p-3 bg-[#EAF1EA] rounded-xl border border-[#C4D3C2] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="w-4 h-4 text-[#2E4D34] shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-[#223B28] bg-white px-2 py-0.5 rounded border border-[#C4D3C2]">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-[11px] font-semibold text-[#2E4D34]">
                            {appliedCoupon.discountType === 'FIXED' ? `Flat ${formatRupees(discountAmount)} OFF` : `${appliedCoupon.discountValue || 10}% OFF`}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#506052] truncate mt-0.5">{appliedCoupon.message}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="px-2.5 py-1 text-xs font-semibold text-[#DC2626] hover:bg-white rounded-lg transition-colors flex items-center gap-1 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.toUpperCase());
                      if (couponError) setCouponError(null);
                    }}
                    placeholder="Enter Coupon (e.g. POD, CHILLY10)"
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3] focus:outline-none focus:border-[#2E4D34] font-mono uppercase"
                  />
                  <button
                    type="button"
                    disabled={isValidatingCoupon || !promoCode.trim()}
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 bg-[#2E4D34] hover:bg-[#233B27] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    {isValidatingCoupon ? 'Validating...' : appliedCoupon ? 'Switch' : 'Apply'}
                  </button>
                </div>

                {couponError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#DC2626] font-medium pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{couponError}</span>
                  </div>
                )}
              </div>

              {/* Price Calculation Breakdown */}
              <div className="space-y-2 pt-3 border-t border-[#ECE7DD] text-xs text-[#506052]">
                <div className="flex justify-between">
                  <span>Cart Subtotal</span>
                  <span className="font-semibold text-[#223B28]">{formatRupees(cartTotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#D82C20] font-medium">
                    <span>Coupon Discount {appliedCoupon ? `(${appliedCoupon.code})` : ''}</span>
                    <span>- {formatRupees(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span>{deliveryCharge === 0 ? <strong className="text-[#2E4D34]">FREE</strong> : formatRupees(deliveryCharge)}</span>
                </div>

                <div className="flex justify-between pt-3 border-t border-[#ECE7DD] items-baseline text-sm sm:text-base font-bold text-[#223B28]">
                  <span>Total Payable</span>
                  <span className="font-serif text-xl sm:text-2xl text-[#2E4D34]">
                    {formatRupees(finalPayable)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="checkout-place-order"
                disabled={isSubmitting || maintenanceMode}
                className="w-full py-3.5 bg-[#2E4D34] hover:bg-[#233B27] disabled:opacity-75 text-white text-xs sm:text-sm font-bold rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {maintenanceMode
                    ? 'Ordering paused for maintenance'
                    : isSubmitting
                    ? 'Placing Order...'
                    : !user?.isLoggedIn
                    ? 'Sign in to place order'
                    : `Confirm & Pay ${formatRupees(finalPayable)}`}
                </span>
              </button>



            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

export default CheckoutPage;
