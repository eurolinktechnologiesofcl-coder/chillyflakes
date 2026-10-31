import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  MapPin,
  Phone,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '../../../components/vendor/PageHeader';
import { StatCard } from '../../../components/vendor/StatCard';
import { StatusBadge } from '../../../components/vendor/StatusBadge';
import { Pagination } from '../../../components/vendor/Pagination';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { ErrorState } from '../../../components/vendor/ErrorState';
import { useToast } from '../../../components/vendor/Toast';
import { Button } from '../../../components/ui/Button';
import { formatINR } from '../../../utils/currency';
import { getVendorOrders, updateVendorOrderStatus } from '../../../api/vendorPortalApi';
import type { VendorOrder } from '../../../types/vendorPortal';

export const VendorOrdersPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Selected order for view/status update modal
  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('IN_TRANSIT');
  const [courierPartner, setCourierPartner] = useState('Delhivery');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['vendor-orders', statusFilter, search, page],
    queryFn: () => getVendorOrders({
      status: statusFilter,
      search: search || undefined,
      page,
      page_size: pageSize,
    }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { orderId: string; status: string; tracking_number?: string; courier_partner?: string; reason?: string }) =>
      updateVendorOrderStatus(payload.orderId, {
        status: payload.status,
        tracking_number: payload.tracking_number,
        courier_partner: payload.courier_partner,
        reason: payload.reason,
      }),
    onSuccess: (res) => {
      toast.showToast(res.message || 'Order status updated successfully.', 'success');
      setIsUpdateModalOpen(false);
      setSelectedOrder(null);
      void queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['vendor-earnings'] });
    },
    onError: (err: any) => {
      toast.showToast(err?.message || 'Failed to update order status.', 'error');
    },
  });

  const orders = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const pendingCount = orders.filter((o) => o.status === 'pending_dispatch').length;
  const inTransitCount = orders.filter((o) => o.status === 'in_transit').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  const handleOpenUpdateModal = (order: VendorOrder) => {
    setSelectedOrder(order);
    if (order.status === 'pending_dispatch') {
      setNewStatus('IN_TRANSIT');
    } else if (order.status === 'in_transit') {
      setNewStatus('DELIVERED');
    } else {
      setNewStatus('CANCELLED');
    }
    setCourierPartner(order.courier_partner || 'Delhivery');
    setTrackingNumber(order.tracking_number || '');
    setCancelReason('');
    setIsUpdateModalOpen(true);
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    updateMutation.mutate({
      orderId: selectedOrder.id,
      status: newStatus,
      tracking_number: newStatus === 'IN_TRANSIT' ? trackingNumber : undefined,
      courier_partner: newStatus === 'IN_TRANSIT' ? courierPartner : undefined,
      reason: newStatus === 'CANCELLED' ? cancelReason : undefined,
    });
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Customer Orders"
        description="Manage and fulfill customer orders containing items from your artisan store."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value={totalCount}
          icon={<ShoppingBag className="w-5 h-5 text-[#2E4D34]" />}
        />
        <StatCard
          label="Awaiting Dispatch"
          value={pendingCount}
          icon={<Clock className="w-5 h-5 text-[#B87A00]" />}
          className={pendingCount > 0 ? 'border-amber-400 bg-amber-50/20' : ''}
        />
        <StatCard
          label="In Transit"
          value={inTransitCount}
          icon={<Truck className="w-5 h-5 text-[#1D63B8]" />}
        />
        <StatCard
          label="Delivered"
          value={deliveredCount}
          icon={<CheckCircle className="w-5 h-5 text-[#2E4D34]" />}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {[
            { label: 'All Orders', value: 'all' },
            { label: 'Pending Dispatch', value: 'pending_dispatch' },
            { label: 'In Transit', value: 'in_transit' },
            { label: 'Delivered', value: 'delivered' },
            { label: 'Cancelled', value: 'cancelled' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-[#2E4D34] text-white shadow-xs'
                  : 'bg-[#FAF7F2] text-[#4F5E51] hover:bg-[#EAE5DB]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-[#8E9B90] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search order # or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
          />
        </div>
      </div>

      {/* Orders List / Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#2E4D34] mb-3" />
          <p className="text-xs font-medium text-[#637365]">Loading your orders...</p>
        </div>
      ) : isError ? (
        <ErrorState message="Failed to load orders. Please try again." onRetry={refetch} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={
            statusFilter !== 'all' || search
              ? 'No customer orders match your current filters.'
              : 'You have not received any orders yet. Once buyers order your products, they will appear here.'
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-xs hover:border-[#2E4D34]/40 transition-all space-y-4"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FAF7F2] pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[#2E4D34] bg-[#EAF1EA] px-2.5 py-1 rounded-md">
                    #{order.order_number}
                  </span>
                  <span className="text-xs text-[#8E9B90]">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={
                      order.status === 'delivered'
                        ? 'delivered'
                        : order.status === 'in_transit'
                        ? 'shipped'
                        : order.status === 'cancelled'
                        ? 'cancelled'
                        : 'pending'
                    }
                    label={order.status.replace('_', ' ')}
                  />
                  <span className="text-xs px-2 py-0.5 rounded bg-[#FAF7F2] text-[#637365] uppercase font-semibold">
                    {order.payment_method} • {order.payment_status}
                  </span>
                </div>
              </div>

              {/* Order Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Items in this order */}
                <div className="lg:col-span-2 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#8E9B90]">
                    Your Items ({order.items.length})
                  </span>
                  <div className="space-y-2">
                    {order.items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center gap-3 p-2 rounded-xl bg-[#FAF7F2]/80 border border-[#F0EBE1]"
                      >
                        <img
                          src={it.image || '/botanical-care-banner.jpg'}
                          alt={it.title}
                          className="w-12 h-12 rounded-lg object-cover bg-white"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#223B28] truncate">{it.title}</p>
                          <p className="text-[11px] text-[#637365]">
                            Qty: <strong className="text-[#223B28]">{it.quantity}</strong> × {formatINR(it.unit_price)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-[#2E4D34]">
                            {formatINR(it.total_price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Delivery & Actions */}
                <div className="flex flex-col justify-between p-3 rounded-xl bg-[#FAF7F2]/50 border border-[#F0EBE1] space-y-3">
                  <div className="space-y-1.5 text-xs text-[#4F5E51]">
                    <span className="font-semibold text-xs uppercase tracking-wider text-[#8E9B90] block mb-1">
                      Delivery Details
                    </span>
                    <p className="font-medium text-[#223B28] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#2E4D34]" />
                      {order.shipping_address?.name || order.customer_name}
                    </p>
                    <p className="text-[11px] text-[#637365] pl-5">
                      {[
                        order.shipping_address?.street,
                        order.shipping_address?.city,
                        order.shipping_address?.state,
                        order.shipping_address?.pincode,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Address on file'}
                    </p>
                    {order.customer_phone && (
                      <p className="text-[11px] text-[#637365] pl-5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#8E9B90]" />
                        {order.customer_phone}
                      </p>
                    )}
                    {order.tracking_number && (
                      <div className="mt-2 pt-2 border-t border-[#EAE5DB] text-[11px] text-[#2E4D34]">
                        <strong>Tracking:</strong> {order.courier_partner} ({order.tracking_number})
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#EAE5DB] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase text-[#8E9B90] block">Your Subtotal</span>
                      <span className="font-serif text-base font-bold text-[#223B28]">
                        {formatINR(order.total_amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenUpdateModal(order)}
                        >
                          {order.status === 'pending_dispatch' ? 'Dispatch Order' : 'Mark Delivered'}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {/* Status Update / Dispatch Modal */}
      {isUpdateModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#D1DDD0] shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#223B28]">
                  Fulfill Order #{selectedOrder.order_number}
                </h3>
                <p className="text-xs text-[#637365]">Update fulfillment & courier tracking</p>
              </div>
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="p-1 rounded-lg text-[#8E9B90] hover:text-[#223B28] hover:bg-[#FAF7F2]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#4F5E51] block mb-1">
                  Target Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                >
                  {selectedOrder.status === 'pending_dispatch' && (
                    <option value="IN_TRANSIT">In Transit (Dispatched)</option>
                  )}
                  {selectedOrder.status === 'in_transit' && (
                    <option value="DELIVERED">Delivered</option>
                  )}
                  <option value="CANCELLED">Cancel Order</option>
                </select>
              </div>

              {newStatus === 'IN_TRANSIT' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-[#4F5E51] block mb-1">
                      Courier Partner
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Delhivery, Bluedart, India Post"
                      value={courierPartner}
                      onChange={(e) => setCourierPartner(e.target.value)}
                      required
                      className="w-full text-xs p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#4F5E51] block mb-1">
                      Tracking Number / AWB
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DEL123456789"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      required
                      className="w-full text-xs p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                    />
                  </div>
                </>
              )}

              {newStatus === 'CANCELLED' && (
                <div>
                  <label className="text-xs font-semibold text-[#4F5E51] block mb-1">
                    Cancellation Reason
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide reason for order cancellation..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#FAF7F2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUpdateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Updating...' : 'Save & Notify Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorOrdersPage;
