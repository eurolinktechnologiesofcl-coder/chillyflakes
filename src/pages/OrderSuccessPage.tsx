import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Package, 
  Truck, 
  MapPin, 
  Printer,
  XCircle
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatRupees } from '../utils/currency';
import { axiosClient } from '../api/client';

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { orders } = useStore();

  const localOrder = orders.find((o) => o.id === orderId || `CF-${o.id}` === orderId) || orders[0];
  const [liveOrder, setLiveOrder] = useState<any>(null);

  useEffect(() => {
    if (!orderId) return;

    let isMounted = true;
    const fetchLiveStatus = async () => {
      try {
        const res = await axiosClient.get(`/api/v1/orders/${encodeURIComponent(orderId)}/`);
        if (res.data && isMounted) {
          setLiveOrder(res.data);
        }
      } catch {
        // Fall back to local store order if network is unavailable
      }
    };

    fetchLiveStatus();

    const handleUpdate = () => {
      fetchLiveStatus();
    };

    // Auto-poll every 2.5s while on this page to ensure real-time progression
    const pollTimer = setInterval(() => {
      fetchLiveStatus();
    }, 2500);

    window.addEventListener('cf_buyer_orders_updated', handleUpdate);
    window.addEventListener('cf_order_status_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      window.removeEventListener('cf_buyer_orders_updated', handleUpdate);
      window.removeEventListener('cf_order_status_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [orderId]);

  // Merge live server status with local order properties
  const order = {
    ...localOrder,
    ...(liveOrder ? {
      id: liveOrder.orderNumber || liveOrder.id || localOrder?.id || orderId,
      status: liveOrder.orderStatus
        ? liveOrder.orderStatus.toLowerCase() === 'delivered'
          ? 'Delivered'
          : liveOrder.orderStatus.toLowerCase() === 'in_transit'
          ? 'Shipped'
          : liveOrder.orderStatus.toLowerCase() === 'cancelled'
          ? 'Cancelled'
          : 'Processing'
        : localOrder?.status || 'Placed',
      courierPartner: liveOrder.courierPartner || localOrder?.courierPartner,
      trackingNumber: liveOrder.trackingNumber || localOrder?.trackingNumber,
      totalAmount: liveOrder.totalAmount ?? localOrder?.totalAmount,
      items: (liveOrder.items && liveOrder.items.length > 0)
        ? liveOrder.items.map((it: any) => ({
            product: {
              id: it.productId,
              name: it.title,
              image: it.image,
              price: it.unitPrice,
              category: 'Handcrafted',
            },
            quantity: it.quantity,
          }))
        : localOrder?.items || [],
      shippingAddress: liveOrder.shippingAddress || localOrder?.shippingAddress,
    } : {
      status: localOrder?.status || 'Placed',
      courierPartner: localOrder?.courierPartner,
      trackingNumber: localOrder?.trackingNumber,
    }),
  };

  const statusStr = (order?.status || 'Placed').toLowerCase();
  const isCancelled = statusStr === 'cancelled';
  const isDelivered = statusStr === 'delivered';
  const isShipped = statusStr === 'shipped' || statusStr === 'in_transit';
  const isProcessing = statusStr === 'processing' || statusStr === 'placed';

  // Determine current active step (1 to 4)
  let currentStep = 2; // Default packing
  if (isDelivered) currentStep = 4;
  else if (isShipped) currentStep = 3;
  else if (isProcessing) currentStep = 2;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-10 sm:py-16 border-b border-[#ECE7DD]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Success Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#ECE7DD] shadow-sm text-center space-y-4">
          
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xs ${
            isCancelled ? 'bg-[#FAF0ED] text-[#D82C20]' : isDelivered ? 'bg-[#EAF1EA] text-[#2E4D34]' : 'bg-[#EAF1EA] text-[#2E4D34]'
          }`}>
            {isCancelled ? (
              <XCircle className="w-12 h-12 stroke-[2.5]" />
            ) : isDelivered ? (
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            ) : (
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            )}
          </div>

          <div>
            <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
              isCancelled 
                ? 'bg-[#FAF0ED] text-[#D82C20] border-[#F5C2B8]' 
                : isDelivered 
                ? 'bg-[#EAF1EA] text-[#2E4D34] border-[#CDE0CC]'
                : isShipped
                ? 'bg-[#FFF8E6] text-[#B7791F] border-[#F2DCA5]'
                : 'bg-[#FAF7F2] text-[#2E4D34] border-[#ECE7DD]'
            }`}>
              {isCancelled ? 'ORDER CANCELLED' : isDelivered ? 'DELIVERED & COMPLETED' : isShipped ? 'DISPATCHED & IN TRANSIT' : 'ORDER CONFIRMED & IN PRODUCTION'}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#223B28] mt-3">
              {isCancelled ? 'Order Cancellation Confirmed' : isDelivered ? 'Consignment Delivered!' : 'Thank You For Your Order!'}
            </h1>
            <p className="text-xs sm:text-sm text-[#5E6D60] mt-1 max-w-md mx-auto">
              {isCancelled 
                ? 'Your order cancellation has been processed. Stock has been restored and payment status updated.'
                : isDelivered
                ? 'Your handcrafted items have arrived safely. Thank you for supporting authentic Indian artisans!'
                : "Your order has been placed with our verified artisans. We've sent an order confirmation to your registered contact."}
            </p>
          </div>

          <div className="pt-2">
            <span className="inline-block bg-[#FAF7F2] px-4 py-2 rounded-xl border border-[#D5C9B3] text-xs font-mono font-bold text-[#223B28]">
              Order Reference: <strong className="text-[#2E4D34] font-bold">{order?.id || orderId}</strong>
            </span>
          </div>

        </div>

        {/* Order Tracking Timeline Stepper */}
        {!isCancelled ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE7DD] shadow-xs mt-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DD]">
              <h2 className="font-serif text-lg font-bold text-[#223B28] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#2E4D34]" />
                <span>Live Shipment Progress</span>
              </h2>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                isDelivered ? 'bg-[#EAF1EA] text-[#2E4D34]' : 'bg-[#FAF7F2] text-[#2E4D34] border border-[#ECE7DD]'
              }`}>
                {isDelivered ? 'Delivered' : `Estimated Delivery: ${order?.estimatedDeliveryDate || 'In 3-4 business days'}`}
              </span>
            </div>

            {/* Stepper Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              
              {/* Step 1: Placed */}
              <div className="flex sm:flex-col items-center gap-3 text-left sm:text-center">
                <div className="w-9 h-9 rounded-full bg-[#2E4D34] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  ✓
                </div>
                <div>
                  <span className="text-xs font-bold text-[#223B28] block">Order Placed</span>
                  <span className="text-[10px] text-[#6C7B6D]">Payment Verified</span>
                </div>
              </div>

              {/* Step 2: Artisan Packing */}
              <div className="flex sm:flex-col items-center gap-3 text-left sm:text-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  currentStep > 2 
                    ? 'bg-[#2E4D34] text-white' 
                    : currentStep === 2 
                    ? 'bg-[#2E4D34] text-white ring-4 ring-[#EAF1EA]' 
                    : 'bg-[#ECE7DD] text-[#6C7B6D]'
                }`}>
                  {currentStep > 2 ? '✓' : <Package className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-[#223B28] block">Artisan Packing</span>
                  <span className={`text-[10px] ${currentStep === 2 ? 'text-[#2E4D34] font-semibold' : 'text-[#6C7B6D]'}`}>
                    {currentStep > 2 ? 'Ready for Handover' : currentStep === 2 ? 'In Progress' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Step 3: Dispatched & In Transit */}
              <div className={`flex sm:flex-col items-center gap-3 text-left sm:text-center ${currentStep < 3 ? 'opacity-50' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  currentStep > 3 
                    ? 'bg-[#2E4D34] text-white' 
                    : currentStep === 3 
                    ? 'bg-[#2E4D34] text-white ring-4 ring-[#EAF1EA]' 
                    : 'bg-[#ECE7DD] text-[#6C7B6D]'
                }`}>
                  {currentStep > 3 ? '✓' : <Truck className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-[#223B28] block">Dispatched</span>
                  <span className={`text-[10px] ${currentStep === 3 ? 'text-[#2E4D34] font-semibold' : 'text-[#6C7B6D]'}`}>
                    {currentStep > 3 ? 'In Transit / Passed' : currentStep === 3 ? 'Courier Consignment Handed' : 'Courier Handover'}
                  </span>
                </div>
              </div>

              {/* Step 4: Delivered */}
              <div className={`flex sm:flex-col items-center gap-3 text-left sm:text-center ${currentStep < 4 ? 'opacity-50' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  currentStep === 4 ? 'bg-[#2E4D34] text-white ring-4 ring-[#EAF1EA]' : 'bg-[#ECE7DD] text-[#6C7B6D]'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#223B28] block">Delivered</span>
                  <span className={`text-[10px] ${currentStep === 4 ? 'text-[#2E4D34] font-semibold' : 'text-[#6C7B6D]'}`}>
                    {currentStep === 4 ? 'Delivered to Doorstep' : 'Doorstep Delivery'}
                  </span>
                </div>
              </div>

            </div>

            {/* Courier Tracking Details Banner */}
            {(order?.courierPartner || order?.trackingNumber) && (
              <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#ECE7DD] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs mt-3">
                <div className="flex items-center gap-2 text-[#223B28]">
                  <Truck className="w-4 h-4 text-[#2E4D34]" />
                  <span>Courier Partner: <strong>{order.courierPartner || 'Assigned Logistics'}</strong></span>
                </div>
                {order.trackingNumber && (
                  <div className="font-mono bg-white px-3 py-1 rounded-lg border border-[#D5C9B3] text-[#2E4D34]">
                    AWB / Tracking: <strong>{order.trackingNumber}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#FAF0ED] rounded-3xl p-6 border border-[#F5C2B8] mt-6 flex items-center gap-4 text-xs">
            <XCircle className="w-6 h-6 text-[#D82C20] flex-shrink-0" />
            <div>
              <p className="font-bold text-[#9C2016]">This order was cancelled.</p>
              <p className="text-[#9C2016]/80 mt-0.5">Inventory has been automatically restocked to artisans. Any charged amount will be credited back via original payment channel.</p>
            </div>
          </div>
        )}

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
          
          {/* Purchased Items */}
          <div className="md:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE7DD] shadow-xs space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#223B28] pb-3 border-b border-[#ECE7DD]">
              Ordered Items ({order?.items?.length || 0})
            </h3>

            <div className="space-y-3 divide-y divide-[#F2ECE1]">
              {order?.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 pt-3 first:pt-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#FAF7F2] p-1 border border-[#ECE7DD] flex-shrink-0">
                    <img src={item.product?.image || item.image} alt={item.product?.name || item.name} className="w-full h-full object-cover rounded-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-[#223B28] truncate">{item.product?.name || item.name}</h4>
                    <p className="text-[11px] text-[#6C7B6D]">{item.product?.category || 'Handcrafted'} • Qty: {item.quantity}</p>
                    <span className="text-xs font-bold text-[#2E4D34] mt-0.5 block">
                      {formatRupees((item.product?.price || item.price || 0) * item.quantity)}
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
                <p className="text-xs font-bold text-[#223B28]">{order?.shippingAddress?.fullName || 'Customer'}</p>
                <p className="text-xs text-[#506052] mt-1 leading-relaxed">
                  {order?.shippingAddress?.street}, {order?.shippingAddress?.city}, {order?.shippingAddress?.state} — {order?.shippingAddress?.postalCode}
                </p>
                <p className="text-[11px] text-[#6C7B6D] mt-2">
                  Phone: +91 {order?.shippingAddress?.phone}
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
