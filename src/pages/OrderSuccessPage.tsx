import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Package, 
  Truck, 
  MapPin, 
  Printer
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatRupees } from '../utils/currency';

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { orders } = useStore();

  const order = orders.find((o) => o.id === orderId) || orders[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-10 sm:py-16 border-b border-[#ECE7DD]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Success Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#ECE7DD] shadow-sm text-center space-y-4">
          
          <div className="w-20 h-20 rounded-full bg-[#EAF1EA] text-[#2E4D34] flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#2E4D34] bg-[#FAF7F2] px-3 py-1 rounded-full border border-[#ECE7DD]">
              ORDER CONFIRMED & IN PRODUCTION
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#223B28] mt-3">
              Thank You For Your Order!
            </h1>
            <p className="text-xs sm:text-sm text-[#5E6D60] mt-1 max-w-md mx-auto">
              Your order has been placed with our verified artisans. We've sent an order confirmation to your registered contact.
            </p>
          </div>

          <div className="pt-2">
            <span className="inline-block bg-[#FAF7F2] px-4 py-2 rounded-xl border border-[#D5C9B3] text-xs font-mono font-bold text-[#223B28]">
              Order Reference: <strong className="text-[#2E4D34] font-bold">{order?.id || orderId}</strong>
            </span>
          </div>

        </div>

        {/* Order Tracking Timeline Stepper */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE7DD] shadow-xs mt-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DD]">
            <h2 className="font-serif text-lg font-bold text-[#223B28] flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#2E4D34]" />
              <span>Shipment Progress</span>
            </h2>
            <span className="text-xs text-[#2E4D34] font-semibold bg-[#EAF1EA] px-3 py-1 rounded-full">
              Estimated Delivery: {order?.estimatedDeliveryDate || 'In 3-4 business days'}
            </span>
          </div>

          {/* Stepper Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
            
            <div className="flex sm:flex-col items-center gap-3 text-left sm:text-center">
              <div className="w-9 h-9 rounded-full bg-[#2E4D34] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                ✓
              </div>
              <div>
                <span className="text-xs font-bold text-[#223B28] block">Order Placed</span>
                <span className="text-[10px] text-[#6C7B6D]">Payment Verified</span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center gap-3 text-left sm:text-center">
              <div className="w-9 h-9 rounded-full bg-[#2E4D34] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 ring-4 ring-[#EAF1EA]">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#223B28] block">Artisan Packing</span>
                <span className="text-[10px] text-[#2E4D34] font-semibold">In Progress</span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center gap-3 text-left sm:text-center opacity-50">
              <div className="w-9 h-9 rounded-full bg-[#ECE7DD] text-[#6C7B6D] flex items-center justify-center text-xs font-bold flex-shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#223B28] block">Dispatched</span>
                <span className="text-[10px] text-[#6C7B6D]">Courier Handover</span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center gap-3 text-left sm:text-center opacity-50">
              <div className="w-9 h-9 rounded-full bg-[#ECE7DD] text-[#6C7B6D] flex items-center justify-center text-xs font-bold flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#223B28] block">Delivered</span>
                <span className="text-[10px] text-[#6C7B6D]">Doorstep Delivery</span>
              </div>
            </div>

          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
          
          {/* Purchased Items */}
          <div className="md:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE7DD] shadow-xs space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#223B28] pb-3 border-b border-[#ECE7DD]">
              Ordered Items ({order?.items.length || 0})
            </h3>

            <div className="space-y-3 divide-y divide-[#F2ECE1]">
              {order?.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 pt-3 first:pt-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#FAF7F2] p-1 border border-[#ECE7DD] flex-shrink-0">
                    <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-[#223B28] truncate">{item.product.name}</h4>
                    <p className="text-[11px] text-[#6C7B6D]">{item.product.category} • Qty: {item.quantity}</p>
                    <span className="text-xs font-bold text-[#2E4D34] mt-0.5 block">
                      {formatRupees(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Print & Action Buttons */}
            <div className="pt-6 border-t border-[#ECE7DD] flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FAF7F2] hover:bg-[#EAF1EA] text-[#223B28] text-xs font-semibold rounded-xl border border-[#D5C9B3] transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Tax Invoice</span>
              </button>

              <div className="flex gap-2">
                <Link
                  to="/account/orders"
                  className="px-4 py-2 bg-white hover:bg-[#FAF7F2] text-[#2E4D34] text-xs font-semibold rounded-xl border border-[#2E4D34]"
                >
                  My Orders
                </Link>
                <Link
                  to="/shop"
                  className="px-5 py-2 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-xl shadow-xs"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>

          </div>

          {/* Delivery & Summary Column */}
          <div className="md:col-span-4 space-y-6">
            
            {/* Delivery Address Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#ECE7DD] shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6C7B6D]">
                <MapPin className="w-3.5 h-3.5 text-[#2E4D34]" />
                <span>Delivery Address</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#223B28]">{order?.shippingAddress.fullName}</p>
                <p className="text-xs text-[#506052] mt-1 leading-relaxed">
                  {order?.shippingAddress.street}, {order?.shippingAddress.city}, {order?.shippingAddress.state} — {order?.shippingAddress.postalCode}
                </p>
                <p className="text-[11px] text-[#6C7B6D] mt-2">
                  Phone: +91 {order?.shippingAddress.phone}
                </p>
              </div>
            </div>

            {/* Payment Summary Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#ECE7DD] shadow-xs space-y-3 text-xs">
              <h4 className="font-serif font-bold text-sm text-[#223B28]">
                Payment Breakdown
              </h4>
              <div className="space-y-1.5 text-[#506052] pt-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#223B28]">{formatRupees(order?.subtotal || 0)}</span>
                </div>
                {(order?.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-[#D82C20]">
                    <span>Coupon Savings</span>
                    <span>- {formatRupees(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Speed</span>
                  <span className="font-semibold">{order?.deliverySpeed === 'express' ? 'Express Air' : 'Standard Eco'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-semibold">{order?.deliveryCharge === 0 ? 'FREE' : formatRupees(order?.deliveryCharge || 0)}</span>
                </div>
                <div className="pt-2 border-t border-[#ECE7DD] flex justify-between font-bold text-sm text-[#223B28]">
                  <span>Total Paid</span>
                  <span className="text-[#2E4D34] font-serif text-lg">{formatRupees(order?.totalAmount || 0)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#ECE7DD] text-[11px] text-[#6C7B6D]">
                Payment Mode: <strong className="text-[#223B28] uppercase">{order?.paymentMethod}</strong>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default OrderSuccessPage;
