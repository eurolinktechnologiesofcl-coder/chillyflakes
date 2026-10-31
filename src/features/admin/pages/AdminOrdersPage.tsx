import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Download,
  Truck,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  Eye,
  Leaf,
  CreditCard,
  User,
  MapPin,
  X,
  AlertTriangle,
  Store,
} from 'lucide-react';
import { syncAdminStatusToBuyerOrder } from '../../../utils/platformSync';
import { useAdminOrders } from '../hooks/useAdminOrders';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../../../components/vendor/Toast';
import { Pagination } from '../../../components/vendor/Pagination';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { Skeleton } from '../../../components/vendor/Skeleton';
import { formatRupees } from '../../../utils/currency';
import type { AdminOrder, AdminOrderStatus } from '../../../types/admin';

export const AdminOrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { canEdit, canDecide } = usePermission();

  const tab = (searchParams.get('tab') || 'all') as
    | 'all'
    | 'pending_dispatch'
    | 'in_transit'
    | 'delivered'
    | 'return_requested'
    | 'cancelled';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 15;

  const { data, isLoading, isError, refetch, isFetching, updateStatus, isUpdatingStatus, resolveReturn, isResolvingReturn } =
    useAdminOrders({
      tab,
      search: search || undefined,
      page,
      page_size: pageSize,
    });

  // Selected Order for Details Drawer
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  // Fulfillment form state in Drawer
  const [editStatus, setEditStatus] = useState<AdminOrderStatus>('pending_dispatch');
  const [editCourier, setEditCourier] = useState('');
  const [editTracking, setEditTracking] = useState('');

  // Return resolution state
  const [returnNotes, setReturnNotes] = useState('');

  const handleOpenDrawer = (order: AdminOrder) => {
    setSelectedOrder(order);
    setEditStatus(order.order_status);
    setEditCourier(order.courier_partner || '');
    setEditTracking(order.tracking_number || '');
    setReturnNotes(order.return_notes || '');
  };

  const handleUpdateFulfillment = async () => {
    if (!selectedOrder) return;
    try {
      const updated = await updateStatus({
        id: selectedOrder.id,
        payload: {
          order_status: editStatus,
          courier_partner: editCourier.trim() || undefined,
          tracking_number: editTracking.trim() || undefined,
        },
      });
      setSelectedOrder(updated);

      // Sync status and AWB tracking to buyer profile in real-time
      syncAdminStatusToBuyerOrder(
        selectedOrder.id,
        editStatus,
        editCourier.trim() || undefined,
        editTracking.trim() || undefined
      );
      if (selectedOrder.order_number) {
        syncAdminStatusToBuyerOrder(
          selectedOrder.order_number,
          editStatus,
          editCourier.trim() || undefined,
          editTracking.trim() || undefined
        );
      }

      toast.showToast('Order fulfillment details updated successfully.', 'success');
    } catch {
      toast.showToast('Failed to update order fulfillment.', 'error');
    }
  };

  const handleMarkAsDelivered = async () => {
    if (!selectedOrder) return;
    try {
      const updated = await updateStatus({
        id: selectedOrder.id,
        payload: {
          order_status: 'delivered',
          courier_partner: selectedOrder.courier_partner,
          tracking_number: selectedOrder.tracking_number,
        },
      });
      setSelectedOrder(updated);
      setEditStatus('delivered');

      syncAdminStatusToBuyerOrder(selectedOrder.id, 'delivered');
      if (selectedOrder.order_number) {
        syncAdminStatusToBuyerOrder(selectedOrder.order_number, 'delivered');
      }

      toast.showToast(`Order #${selectedOrder.order_number || selectedOrder.id} marked as Delivered & Received!`, 'success');
    } catch {
      toast.showToast('Failed to mark order as delivered.', 'error');
    }
  };

  const handleResolveReturn = async (action: 'approve_refund' | 'reject_return') => {
    if (!selectedOrder) return;
    try {
      const updated = await resolveReturn({
        id: selectedOrder.id,
        payload: {
          action,
          reason: returnNotes.trim() || undefined,
        },
      });
      setSelectedOrder(updated);
      toast.showToast(
        action === 'approve_refund'
          ? `Refund of ${formatRupees(updated.total_amount)} approved for customer.`
          : 'Return request rejected.',
        'success'
      );
    } catch {
      toast.showToast('Failed to resolve return request.', 'error');
    }
  };

  const handleTabChange = (newTab: string) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', newTab);
      p.set('page', '1');
      return p;
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (val) {
        p.set('search', val);
      } else {
        p.delete('search');
      }
      p.set('page', '1');
      return p;
    });
  };

  const handleExportCsv = () => {
    if (!data?.results?.length) {
      toast.showToast('No orders to export.', 'warning');
      return;
    }
    const headers = ['Order Number', 'Date', 'Customer', 'Email', 'Total (INR)', 'Payment Status', 'Order Status', 'Eco Delivery'];
    const rows = data.results.map((o) => [
      o.order_number,
      new Date(o.created_at).toLocaleDateString(),
      `"${o.customer_name}"`,
      o.customer_email,
      o.total_amount,
      o.payment_status,
      o.order_status,
      o.is_eco_delivery ? 'Yes' : 'No',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.showToast('Orders exported to CSV.', 'success');
  };

  const counts = data?.tab_counts || {
    all: 0,
    pending_dispatch: 0,
    in_transit: 0,
    delivered: 0,
    return_requested: 0,
    cancelled: 0,
  };

  const getStatusBadge = (status: AdminOrderStatus) => {
    switch (status) {
      case 'pending_dispatch':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending Dispatch
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            <Truck className="w-3 h-3" />
            In Transit
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Delivered
          </span>
        );
      case 'return_requested':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 animate-pulse">
            <RotateCcw className="w-3 h-3" />
            Return Requested
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <RotateCcw className="w-3 h-3" />
            Refunded
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#EAE5DB] pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2E4D34] bg-[#EAF1EA] px-2.5 py-1 rounded-md">
            Operations & Logistics
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#223B28] mt-2">
            Platform Orders & Returns
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6D61] mt-1">
            Monitor orders across all artisan vendors, inspect consignment tracking, and manage customer return claims.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#D1DDD0] bg-white text-xs font-semibold text-[#223B28] hover:bg-[#FAF7F2] transition-colors disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#D1DDD0] bg-white text-xs font-semibold text-[#223B28] hover:bg-[#FAF7F2] transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#2E4D34]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#EAE5DB] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#8E9B90] font-medium">
            <span>All Orders</span>
            <ShoppingBag className="w-4 h-4 text-[#2E4D34]" />
          </div>
          <p className="text-2xl font-serif font-bold text-[#223B28] mt-2">{counts.all}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#EAE5DB] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
            <span>Pending Dispatch</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-amber-900 mt-2">{counts.pending_dispatch}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#EAE5DB] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-sky-700 font-medium">
            <span>In Transit</span>
            <Truck className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-sky-900 mt-2">{counts.in_transit}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#EAE5DB] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-emerald-900 mt-2">{counts.delivered}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#EAE5DB] shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
            <span>Return Claims</span>
            <RotateCcw className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-rose-900 mt-2">{counts.return_requested}</p>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#F0EDE6] pb-3">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'All Orders', count: counts.all },
              { id: 'pending_dispatch', label: 'Pending Dispatch', count: counts.pending_dispatch },
              { id: 'in_transit', label: 'In Transit', count: counts.in_transit },
              { id: 'delivered', label: 'Delivered', count: counts.delivered },
              { id: 'return_requested', label: 'Return Claims', count: counts.return_requested, highlight: true },
              { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                  tab === t.id
                    ? 'bg-[#2E4D34] text-white shadow-xs'
                    : 'text-[#5F6D61] hover:bg-[#FAF7F2]'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    tab === t.id
                      ? 'bg-white/20 text-white'
                      : t.highlight && t.count > 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-[#F0EDE6] text-[#71717A]'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9B90]" />
            <input
              type="text"
              placeholder="Search by order #, customer, seller..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] placeholder-[#8E9B90] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
            />
          </div>
        </div>

        {/* Table / List */}
        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : isError || !data ? (
          <div className="py-8 text-center text-xs text-rose-600">Failed to load marketplace orders.</div>
        ) : data.results.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-8 h-8 text-[#8E9B90]" />}
            title="No orders found"
            description="There are currently no customer orders matching the specified filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#223B28]">
              <thead>
                <tr className="border-b border-[#F0EDE6] text-[11px] font-bold text-[#8E9B90] uppercase tracking-wider bg-[#FAF7F2]">
                  <th className="py-3 px-3">Order Details</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Artisan Merchant</th>
                  <th className="py-3 px-3">Amount & Payment</th>
                  <th className="py-3 px-3">Delivery</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE6]">
                {data.results.map((order) => (
                  <tr key={order.id} className="hover:bg-[#FDFCF9] transition-colors group">
                    <td className="py-3 px-3 font-medium">
                      <div className="font-mono font-bold text-[#223B28] group-hover:text-[#2E4D34]">
                        {order.order_number}
                      </div>
                      <div className="text-[11px] text-[#8E9B90] mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-[#5F6D61] mt-0.5">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#223B28]">{order.customer_name}</div>
                      <div className="text-[11px] text-[#8E9B90]">{order.customer_email}</div>
                      <div className="text-[10px] text-[#8E9B90]">{order.shipping_address.city}, {order.shipping_address.state}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-medium text-[#223B28]">{order.items[0]?.seller_name}</div>
                      <span className="text-[10px] text-[#8E9B90] uppercase tracking-wider">
                        {order.items[0]?.seller_id === 'chillyflakes_direct' ? 'Platform-owned' : 'Vendor'}
                        {new Set(order.items.map((i) => i.seller_id)).size > 1 ? ' +more' : ''}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-serif font-bold text-sm text-[#223B28]">
                        {formatRupees(order.total_amount)}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="uppercase text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700">
                          {order.payment_method}
                        </span>
                        <span
                          className={`text-[10px] font-medium ${
                            order.payment_status === 'paid'
                              ? 'text-emerald-700'
                              : order.payment_status === 'refunded'
                              ? 'text-purple-700'
                              : 'text-amber-700'
                          }`}
                        >
                          • {order.payment_status}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        {order.is_eco_delivery ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Leaf className="w-2.5 h-2.5 text-emerald-600" />
                            Eco Packaging
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#8E9B90]">Standard Delivery</span>
                        )}
                        {order.tracking_number && (
                          <span className="font-mono text-[10px] text-[#5F6D61] bg-[#F5F2EB] px-1.5 py-0.5 rounded">
                            {order.courier_partner}: {order.tracking_number}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">{getStatusBadge(order.order_status)}</td>

                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDrawer(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D1DDD0] bg-white text-xs font-semibold text-[#223B28] hover:bg-[#2E4D34] hover:text-white hover:border-[#2E4D34] transition-all shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.count > pageSize && (
          <div className="pt-4 border-t border-[#F0EDE6]">
            <Pagination
              currentPage={page}
              totalItems={data.count}
              pageSize={pageSize}
              onPageChange={(p) => {
                setSearchParams((prev) => {
                  const params = new URLSearchParams(prev);
                  params.set('page', String(p));
                  return params;
                });
              }}
            />
          </div>
        )}
      </div>

      {/* Order Details & Logistics Modal / Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EAE5DB] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-[#F0EDE6] p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF1EA] border border-[#D1DDD0] flex items-center justify-center text-[#2E4D34]">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold font-mono text-[#223B28]">
                      {selectedOrder.order_number}
                    </h2>
                    {getStatusBadge(selectedOrder.order_status)}
                  </div>
                  <p className="text-xs text-[#8E9B90] mt-0.5">
                    Placed on {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full hover:bg-[#F5F2EB] flex items-center justify-center text-[#8E9B90] hover:text-[#223B28] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Return Claim Alert if applicable */}
              {selectedOrder.order_status === 'return_requested' && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-900">Return & Refund Claim Initiated by Customer</h4>
                      <p className="text-xs text-rose-800 mt-1 italic leading-relaxed">
                        "{selectedOrder.return_reason || 'Buyer requested return without comment.'}"
                      </p>
                    </div>
                  </div>

                  {canDecide('refunds') && (
                    <div className="pt-2 border-t border-rose-200/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="Resolution notes (e.g. Defect verified, full refund credited)..."
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-rose-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleResolveReturn('approve_refund')}
                        disabled={isResolvingReturn}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 transition-colors disabled:opacity-50 shrink-0"
                      >
                        Approve Refund
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveReturn('reject_return')}
                        disabled={isResolvingReturn}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-300 bg-white text-rose-800 text-xs font-semibold hover:bg-rose-100 transition-colors disabled:opacity-50 shrink-0"
                      >
                        Decline Return
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#8E9B90] uppercase tracking-wider">
                  Order Line Items
                </h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl border border-[#F0EDE6] bg-[#FDFCF9]"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-12 h-12 rounded-xl object-cover border border-[#EAE5DB]"
                        />
                        <div>
                          <p className="text-xs font-semibold text-[#223B28]">{item.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {item.seller_name && item.seller_name !== 'ChillyFlakes Direct' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF1EA] text-[#243F29] border border-[#CDE0CC]">
                                <Store className="w-3 h-3" />
                                <span>Artisan Vendor: {item.seller_name}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAF7F2] text-[#6C7B6D] border border-[#ECE7DD]">
                                <span>ChillyFlakes Direct (In-House)</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#8E9B90] mt-0.5">Qty: {item.quantity} × {formatRupees(item.unit_price)}</p>
                        </div>
                      </div>
                      <div className="text-xs font-bold font-serif text-[#223B28]">
                        {formatRupees(item.total_price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer & Shipping Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-[#F0EDE6] bg-[#FAF7F2] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#223B28]">
                    <User className="w-3.5 h-3.5 text-[#2E4D34]" />
                    <span>Customer Information</span>
                  </div>
                  <div className="text-xs space-y-0.5 text-[#5F6D61]">
                    <p className="font-semibold text-[#223B28]">{selectedOrder.customer_name}</p>
                    <p>{selectedOrder.customer_email}</p>
                    <p>{selectedOrder.customer_phone}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-[#F0EDE6] bg-[#FAF7F2] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#223B28]">
                      <MapPin className="w-3.5 h-3.5 text-[#2E4D34]" />
                      <span>Delivery Address</span>
                    </div>
                    {selectedOrder.is_eco_delivery && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                        <Leaf className="w-2.5 h-2.5" /> Eco Packaging
                      </span>
                    )}
                  </div>
                  <div className="text-xs space-y-0.5 text-[#5F6D61]">
                    <p>{selectedOrder.shipping_address.street}</p>
                    <p>
                      {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} -{' '}
                      {selectedOrder.shipping_address.pincode}
                    </p>
                    <p>{selectedOrder.shipping_address.country}</p>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="p-4 rounded-2xl border border-[#F0EDE6] bg-white space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#223B28] border-b border-[#F0EDE6] pb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-[#2E4D34]" />
                    <span>Payment Breakdown</span>
                  </div>
                  <span className="uppercase text-[10px] font-mono bg-[#EAF1EA] text-[#2E4D34] px-2 py-0.5 rounded">
                    {selectedOrder.payment_method} • {selectedOrder.payment_status}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-[#5F6D61]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatRupees(selectedOrder.total_amount - selectedOrder.tax_amount - selectedOrder.shipping_fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Fee:</span>
                    <span className="font-mono">{selectedOrder.shipping_fee === 0 ? 'FREE' : formatRupees(selectedOrder.shipping_fee)}</span>
                  </div>
                  {selectedOrder.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>GST (Goods & Services Tax):</span>
                      <span className="font-mono">{formatRupees(selectedOrder.tax_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[#223B28] pt-2 border-t border-[#F0EDE6] text-sm font-serif">
                    <span>Grand Total:</span>
                    <span className="text-[#2E4D34]">{formatRupees(selectedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Logistics & Fulfillment Controls */}
              {canEdit('orders') && (
                <div className="p-4 rounded-2xl border border-[#D1DDD0] bg-[#FAF7F2] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#223B28]">
                      <Truck className="w-4 h-4 text-[#2E4D34]" />
                      <span>Manage Dispatch & Courier Consignment</span>
                    </div>
                    {selectedOrder.order_status === 'in_transit' && (
                      <button
                        type="button"
                        onClick={handleMarkAsDelivered}
                        disabled={isUpdatingStatus}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2E4D34] hover:bg-[#233B28] text-white text-[11px] font-semibold rounded-lg shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Received (Delivered)</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#5F6D61] uppercase tracking-wider mb-1">
                        Order Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as AdminOrderStatus)}
                        className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                      >
                        <option value="pending_dispatch">Pending Dispatch</option>
                        <option value="in_transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#5F6D61] uppercase tracking-wider mb-1">
                        Courier Partner
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Delhivery, BlueDart, DTDC"
                        value={editCourier}
                        onChange={(e) => setEditCourier(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#5F6D61] uppercase tracking-wider mb-1">
                        Tracking / AWB #
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. DL99281726IN"
                        value={editTracking}
                        onChange={(e) => setEditTracking(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white text-[#223B28] focus:outline-none focus:ring-1 focus:ring-[#2E4D34]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleUpdateFulfillment}
                    disabled={isUpdatingStatus}
                    className="w-full py-2.5 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {isUpdatingStatus ? 'Saving Logistics...' : 'Save Fulfillment & Tracking Updates'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
