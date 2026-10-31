import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  Plus,
  Copy,
  Trash2,
  Loader2,
} from 'lucide-react';
import { axiosClient } from '../../../api/client';
import { useToast } from '../../../components/vendor/Toast';

interface CouponItem {
  id: string;
  code: string;
  description: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  usage_limit?: number;
  usage_count: number;
  per_user_limit: number;
  is_active: boolean;
  starts_at?: string;
  expires_at?: string;
  created_at: string;
}

export const AdminCouponsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discount_value: 10,
    min_order_amount: 499,
    max_discount_amount: 250,
    usage_limit: 1000,
    per_user_limit: 1,
    is_active: true,
  });

  const { data: coupons = [], isLoading } = useQuery<CouponItem[]>({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const res = await axiosClient.get('/api/v1/admin/coupons/');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return axiosClient.post('/api/v1/admin/coupons/', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setIsModalOpen(false);
      showToast('Coupon created successfully!', 'success');
      setFormData({
        code: '',
        description: '',
        discount_type: 'PERCENTAGE',
        discount_value: 10,
        min_order_amount: 499,
        max_discount_amount: 250,
        usage_limit: 1000,
        per_user_limit: 1,
        is_active: true,
      });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Error creating coupon.', 'error');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      return axiosClient.patch(`/api/v1/admin/coupons/${id}/`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      showToast('Coupon status updated.', 'info');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return axiosClient.delete(`/api/v1/admin/coupons/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      showToast('Coupon deleted.', 'info');
    },
  });

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`Copied "${code}" to clipboard!`, 'success');
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-[#1A4D2E]" />
            Promotions & Coupons
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage promotional discount codes verified at checkout.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1A4D2E] text-white rounded-lg text-sm font-semibold hover:bg-[#143d24] transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </button>
      </div>

      {/* Coupons Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#1A4D2E]" />
          <p className="mt-2 text-sm">Loading active promotions...</p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-gray-500">
          <Tag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-800">No active coupons configured</p>
          <p className="text-sm text-gray-400 mt-1">Create your first marketplace promo code above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coupons.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-xl border p-5 transition-all shadow-sm ${
                c.is_active ? 'border-gray-200 hover:border-gray-300' : 'border-gray-200 opacity-60 bg-gray-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold text-[#1A4D2E] px-2.5 py-1 bg-[#1A4D2E]/10 rounded-md tracking-wider border border-[#1A4D2E]/20">
                    {c.code}
                  </span>
                  <button
                    onClick={() => handleCopy(c.code)}
                    title="Copy code"
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={c.is_active}
                      onChange={(e) => toggleMutation.mutate({ id: c.id, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1A4D2E]"></div>
                  </label>
                  <button
                    onClick={() => {
                      if (confirm(`Delete coupon "${c.code}"?`)) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-3 line-clamp-2">{c.description || 'General promotional discount.'}</p>

              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block">Discount</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Min. Order</span>
                  <span className="font-semibold text-gray-700">₹{c.min_order_amount}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Usage Count</span>
                  <span className="font-semibold text-gray-700">
                    {c.usage_count} {c.usage_limit ? `/ ${c.usage_limit}` : 'used'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Per User Limit</span>
                  <span className="font-semibold text-gray-700">{c.per_user_limit} time(s)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Create New Coupon</h2>
            <p className="text-xs text-gray-500 mt-1">This code can be applied by shoppers at checkout.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="mt-5 space-y-4 text-sm"
            >
              <div>
                <label className="block font-medium text-gray-700 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10% off on all organic artisan products"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat Fixed (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Min. Order (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Max Discount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.max_discount_amount}
                    onChange={(e) => setFormData({ ...formData, max_discount_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-[#1A4D2E] text-white rounded-lg hover:bg-[#143d24] transition-colors font-semibold text-sm inline-flex items-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
