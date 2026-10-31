import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  Upload,
  Loader2,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Phone,
  Inbox,
  Store,
} from 'lucide-react';
import { axiosClient } from '../../../api/client';
import { useToast } from '../../../components/vendor/Toast';
import { PageHeader } from '../../../components/vendor/PageHeader';
import { ConfirmDialog } from '../../../components/vendor/ConfirmDialog';
import { formatRupees } from '../../../utils/currency';

interface BookingRecord {
  id: string;
  bookingRef: string;
  serviceId?: string;
  serviceTitle: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  is_vendor_service?: boolean;
  vendor_name?: string | null;
  service?: {
    id: string;
    title: string;
    image: string;
    pricePaise: number;
    vendorId?: string | null;
    vendor?: {
      id: string;
      storeName: string;
      legalName: string;
    } | null;
  };
}

interface ServiceItem {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  price_num?: number;
  price_display?: string;
  price_paise: number;
  duration_min: number;
  image: string;
  is_active: boolean;
  features: string[];
  vendor_id?: string | null;
  vendor_name?: string | null;
  is_vendor_created?: boolean;
  created_at: string;
  updated_at: string;
}

export const AdminServicesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Bookings Tab State
  const [activeTab, setActiveTab] = useState<'catalog' | 'bookings'>('catalog');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('all');
  const [bookingSearch, setBookingSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    slug: '',
    description: '',
    category: 'Wellness',
    price: 999,
    duration_min: 60,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80',
    is_active: true,
    featuresText: 'Certified Specialists\nOrganic Botanical Extracts\n100% Quality Assurance',
  });

  const DEFAULT_SERVICE_CATEGORIES = [
    { value: 'Wellness', label: 'Wellness & Spa' },
    { value: 'Home Care', label: 'Home Eco-Care' },
    { value: 'Crafts', label: 'Artisan Crafts' },
    { value: 'Education', label: 'Education & Tutoring' },
    { value: 'Personal Care', label: 'Personal Care' },
  ];

  const [serviceCategories, setServiceCategories] = useState<Array<{ value: string; label: string }>>(() => {
    try {
      const saved = localStorage.getItem('cf_service_categories');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SERVICE_CATEGORIES;
  });

  const [isAddingServiceCat, setIsAddingServiceCat] = useState(false);
  const [newServiceCatName, setNewServiceCatName] = useState('');

  const handleAddServiceCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newServiceCatName.trim();
    if (!trimmed) return;
    const exists = serviceCategories.some(
      (c) => c.value.toLowerCase() === trimmed.toLowerCase() || c.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setFormData((prev) => ({ ...prev, category: trimmed }));
      setIsAddingServiceCat(false);
      setNewServiceCatName('');
      return;
    }
    const updated = [...serviceCategories, { value: trimmed, label: trimmed }];
    setServiceCategories(updated);
    try {
      localStorage.setItem('cf_service_categories', JSON.stringify(updated));
    } catch {}
    setFormData((prev) => ({ ...prev, category: trimmed }));
    showToast(`Category "${trimmed}" added!`, 'success');
    setIsAddingServiceCat(false);
    setNewServiceCatName('');
  };

  // Fetch Services
  const { data, isLoading } = useQuery<{ results: ServiceItem[]; total: number }>({
    queryKey: ['admin-services', statusFilter, categoryFilter, searchTerm],
    queryFn: async () => {
      const res = await axiosClient.get('/api/v1/admin/services/', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          search: searchTerm.trim() || undefined,
        },
      });
      return res.data;
    },
  });

  const services = useMemo(() => data?.results || [], [data]);

  const categoriesList = useMemo(() => {
    const set = new Set<string>(['Wellness', 'Home Care', 'Crafts', 'Education', 'Care']);
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [services]);

  // Fetch Bookings
  const { data: bookingsData, isLoading: isLoadingBookings } = useQuery<{
    results: BookingRecord[];
    total: number;
    tab_counts: { all: number; pending: number; confirmed: number; completed: number; cancelled: number };
  }>({
    queryKey: ['admin-service-bookings', bookingStatusFilter, bookingSearch],
    queryFn: async () => {
      const res = await axiosClient.get('/api/v1/admin/services/bookings/', {
        params: {
          status: bookingStatusFilter !== 'all' ? bookingStatusFilter : undefined,
          search: bookingSearch.trim() || undefined,
        },
      });
      return res.data;
    },
    refetchInterval: 10000,
  });

  const bookings = bookingsData?.results || [];
  const bookingCounts = bookingsData?.tab_counts || { all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'; notes?: string }) => {
      return axiosClient.patch(`/api/v1/admin/services/bookings/${id}/status/`, { status, notes });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-service-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-bookings'] });
      showToast(`Appointment marked as ${variables.status.toLowerCase()}!`, 'success');
      window.dispatchEvent(new CustomEvent('cf_buyer_bookings_updated'));
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to update booking status.', 'error');
    },
  });

  const handleOpenCreate = () => {
    setEditingService(null);
    setFormData({
      title: '',
      subtitle: '',
      slug: '',
      description: '',
      category: 'Wellness',
      price: 999,
      duration_min: 60,
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80',
      is_active: true,
      featuresText: 'Certified Specialists\nOrganic Botanical Extracts\n100% Quality Assurance',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: ServiceItem) => {
    setEditingService(s);
    const parsedPrice = typeof s.price === 'number' && !isNaN(s.price)
      ? s.price
      : (s.price_num || Number(String(s.price).replace(/[^\d.]/g, '')) || 499);
    setFormData({
      title: s.title,
      subtitle: s.subtitle || '',
      slug: s.slug,
      description: s.description,
      category: s.category || 'Wellness',
      price: parsedPrice,
      duration_min: s.duration_min || 60,
      image: s.image,
      is_active: s.is_active,
      featuresText: (s.features || []).join('\n'),
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await axiosClient.post('/api/v1/upload/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormData((prev) => ({ ...prev, image: res.data.url }));
      showToast('Service image uploaded successfully!', 'success');
    } catch {
      showToast('Failed to upload image. Please try again.', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Mutation: Save Service (Create or Update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const features = formData.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const numericPrice = Number(formData.price) || 0;
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || undefined,
        slug: formData.slug.trim() || undefined,
        description: formData.description.trim(),
        category: formData.category,
        price: numericPrice,
        price_paise: Math.round(numericPrice * 100),
        duration_min: Number(formData.duration_min) || 60,
        duration: `${Number(formData.duration_min) || 60} mins`,
        image: formData.image.trim(),
        is_active: formData.is_active,
        features,
      };

      if (editingService) {
        return axiosClient.patch(`/api/v1/admin/services/${editingService.id}/`, payload);
      } else {
        return axiosClient.post('/api/v1/admin/services/', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      window.dispatchEvent(new CustomEvent('cf_services_updated'));
      setIsModalOpen(false);
      showToast(editingService ? 'Service updated successfully!' : 'Service created successfully!', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Error saving service.', 'error');
    },
  });

  // Mutation: Toggle Active Status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      return axiosClient.patch(`/api/v1/admin/services/${id}/`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      window.dispatchEvent(new CustomEvent('cf_services_updated'));
      showToast('Service status updated.', 'success');
    },
  });

  // Mutation: Delete Service
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return axiosClient.delete(`/api/v1/admin/services/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      window.dispatchEvent(new CustomEvent('cf_services_updated'));
      setDeleteTarget(null);
      showToast('Service deleted successfully.', 'info');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Error deleting service.', 'error');
    },
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Services Management"
        description="Dedicated catalog for professional artisan, wellness, therapy, and cleaning services. Completely separated from physical product categories."
        actions={
          activeTab === 'catalog' ? (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Service</span>
            </button>
          ) : undefined
        }
      />

      {/* View Switcher: Catalog vs Client Bookings */}
      <div className="flex items-center gap-3 border-b border-[#EAE5DB] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-[#2E4D34] text-white shadow-xs'
              : 'bg-white text-[#5F6D61] border border-[#EAE5DB] hover:text-[#223B28] hover:border-[#2E4D34]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Services Catalog</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            activeTab === 'catalog' ? 'bg-white/20' : 'bg-[#EAE5DB]'
          }`}>
            {services.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'bookings'
              ? 'bg-[#2E4D34] text-white shadow-xs'
              : 'bg-white text-[#5F6D61] border border-[#EAE5DB] hover:text-[#223B28] hover:border-[#2E4D34]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Client Bookings & Appointments</span>
          {bookingCounts.pending > 0 ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#9E2A2B] text-white font-bold animate-pulse">
              {bookingCounts.pending} new
            </span>
          ) : (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === 'bookings' ? 'bg-white/20' : 'bg-[#EAE5DB]'
            }`}>
              {bookingCounts.all}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'catalog' && (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8E9B90] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search services by title, category..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#EAE5DB] bg-[#FAF7F2]/60 text-xs sm:text-sm text-[#223B28] placeholder-[#8E9B90] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] focus:bg-white transition-all"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAE5DB] bg-white text-xs sm:text-sm text-[#223B28] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EAE5DB] bg-white text-xs sm:text-sm text-[#223B28] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Services List / Table */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-[#5F6D61] text-xs">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2E4D34]" />
            Loading services catalog...
          </div>
        ) : services.length === 0 ? (
          <div className="py-16 text-center text-[#5F6D61] space-y-2">
            <Sparkles className="w-8 h-8 text-[#8E9B90] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#223B28]">No services found</p>
            <p className="text-xs text-[#8E9B90]">
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Click "Add New Service" to create your first service.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#FAF7F2] text-[#5F6D61] font-semibold uppercase tracking-wider text-[11px] border-b border-[#EAE5DB]">
                <tr>
                  <th className="px-5 py-3.5">Service</th>
                  <th className="px-4 py-3.5">Provider</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Duration</th>
                  <th className="px-4 py-3.5">Pricing</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5DB]">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={s.image}
                          alt={s.title}
                          className="w-12 h-12 rounded-xl object-cover bg-gray-100 border border-[#EAE5DB] shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <div>
                          <p className="font-semibold text-[#223B28]">{s.title}</p>
                          <p className="text-[11px] text-[#8E9B90] line-clamp-1">{s.description}</p>
                          <p className="text-[10px] font-mono text-[#5F6D61] mt-0.5">/{s.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[#5F6D61] whitespace-nowrap">
                      {s.vendor_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#2E4D34] border border-emerald-200">
                          <Store className="w-3.5 h-3.5 text-[#2E4D34]" />
                          <span>{s.vendor_name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                          Platform Direct
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[#5F6D61]">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF1EA] text-[#2E4D34]">
                        {s.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#5F6D61] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#8E9B90]" />
                        <span>{s.duration_min} mins</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-bold text-[#223B28] whitespace-nowrap">
                      {formatRupees(
                        typeof s.price === 'number' && !isNaN(s.price)
                          ? s.price
                          : (s.price_num || Number(String(s.price).replace(/[^\d.]/g, '')) || 0)
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate({ id: s.id, is_active: !s.is_active })}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                          s.is_active
                            ? 'bg-[#EAF1EA] text-[#2E4D34] hover:bg-[#d8e6d8]'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{s.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 hover:bg-[#EAE5DB] text-[#2E4D34] rounded-lg transition-colors cursor-pointer"
                          title="Edit Service"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete Service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )}

  {/* ========================================================
      CLIENT BOOKINGS & APPOINTMENTS TAB
      ======================================================== */}
  {activeTab === 'bookings' && (
    <div className="space-y-4">
      {/* Status Pills & Search */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
            {[
              { key: 'all', label: 'All Requests', count: bookingCounts.all },
              { key: 'PENDING', label: 'Pending Confirmation', count: bookingCounts.pending },
              { key: 'CONFIRMED', label: 'Confirmed', count: bookingCounts.confirmed },
              { key: 'COMPLETED', label: 'Completed', count: bookingCounts.completed },
              { key: 'CANCELLED', label: 'Cancelled', count: bookingCounts.cancelled },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setBookingStatusFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  bookingStatusFilter === tab.key
                    ? 'bg-[#2E4D34] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#5F6D61] border border-[#EAE5DB] hover:text-[#223B28]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  bookingStatusFilter === tab.key ? 'bg-white/20' : 'bg-[#EAE5DB]'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#8E9B90] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
              placeholder="Search by client, ref, service..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#EAE5DB] bg-[#FAF7F2]/60 text-xs text-[#223B28] placeholder-[#8E9B90] focus:outline-none focus:ring-2 focus:ring-[#2E4D34] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Bookings List Table */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] shadow-xs overflow-hidden">
        {isLoadingBookings ? (
          <div className="p-12 text-center text-[#8E9B90] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#2E4D34]" />
            <span>Loading appointments...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-[#8E9B90] space-y-2">
            <Inbox className="w-8 h-8 mx-auto text-[#8E9B90]/60" />
            <p className="font-semibold text-sm text-[#223B28]">No service bookings found</p>
            <p className="text-xs">When customers book services online, their appointment requests will appear here in real time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#EAE5DB] bg-[#FAF7F2]/80 text-[#5F6D61] text-[11px] uppercase tracking-wider font-semibold">
                  <th className="px-5 py-3.5">Booking Ref</th>
                  <th className="px-4 py-3.5">Client Details</th>
                  <th className="px-4 py-3.5">Requested Service</th>
                  <th className="px-4 py-3.5">Appointment Slot</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5DB]">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-xs text-[#223B28] block">
                        #{b.bookingRef}
                      </span>
                      <span className="text-[10px] text-[#8E9B90]">
                        {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#223B28] flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#2E4D34]" />
                        <span>{b.customerName}</span>
                      </div>
                      <div className="text-[11px] text-[#5F6D61] flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-[#8E9B90]" />
                        <a href={`mailto:${b.customerEmail}`} className="hover:underline">{b.customerEmail}</a>
                      </div>
                      {b.customerPhone && (
                        <div className="text-[11px] text-[#5F6D61] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#8E9B90]" />
                          <span>{b.customerPhone}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-semibold text-[#223B28] block">{b.serviceTitle}</span>
                      {b.is_vendor_service ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E4D34] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">
                          <Store className="w-3 h-3" />
                          <span>{b.vendor_name || 'Vendor Service'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] text-gray-500 mt-0.5">Platform Direct</span>
                      )}
                      {b.notes && (
                        <span className="text-[10px] text-[#7E8F80] italic block mt-0.5 max-w-xs truncate">
                          "{b.notes}"
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-[#223B28] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#2E4D34]" />
                        <span>{b.preferredDate}</span>
                      </div>
                      <div className="text-[11px] text-[#5F6D61] flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-[#8E9B90]" />
                        <span>{b.preferredTime}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        b.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : b.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-[#2E4D34]'
                          : b.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {b.status === 'PENDING' && <Clock className="w-3 h-3 text-amber-600" />}
                        {b.status === 'CONFIRMED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {b.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                        {b.status === 'CANCELLED' && <XCircle className="w-3 h-3 text-red-600" />}
                        <span>{b.status}</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {b.is_vendor_service ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-[#2E4D34] text-xs font-semibold border border-emerald-200"
                          title="Managed directly by vendor"
                        >
                          <Store className="w-3.5 h-3.5 text-[#2E4D34]" />
                          <span>Vendor Managed</span>
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          {b.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => updateBookingStatusMutation.mutate({ id: b.id, status: 'CONFIRMED' })}
                              className="px-2.5 py-1 rounded-lg bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                              Confirm
                            </button>
                          )}

                          {b.status === 'CONFIRMED' && (
                            <button
                              type="button"
                              onClick={() => updateBookingStatusMutation.mutate({ id: b.id, status: 'COMPLETED' })}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                              Complete
                            </button>
                          )}

                          {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && (
                            <button
                              type="button"
                              onClick={() => updateBookingStatusMutation.mutate({ id: b.id, status: 'CANCELLED' })}
                              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DB]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#2E4D34]" />
                <h3 className="font-serif font-bold text-lg text-[#223B28]">
                  {editingService ? 'Edit Service' : 'Create New Service'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[#8E9B90] hover:text-[#223B28] rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="space-y-4 text-xs sm:text-sm"
            >
              <div>
                <label className="block font-semibold text-[#223B28] mb-1">Service Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setFormData({
                      ...formData,
                      title,
                      slug: editingService ? formData.slug : slug,
                    });
                  }}
                  placeholder="e.g. Therapeutic Herbal Scalp Massage"
                  className="w-full px-3.5 py-2 border border-[#EAE5DB] rounded-xl focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#223B28] mb-1">Subtitle / Short Tagline</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Relax & Rejuvenate"
                  className="w-full px-3.5 py-2 border border-[#EAE5DB] rounded-xl focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-[#223B28]">Category *</label>
                    <button
                      type="button"
                      onClick={() => setIsAddingServiceCat((v) => !v)}
                      className="text-xs font-semibold text-[#2E4D34] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {isAddingServiceCat ? 'Cancel' : '+ New Category'}
                    </button>
                  </div>

                  {isAddingServiceCat && (
                    <div className="flex items-center gap-1.5 mb-2 p-1.5 bg-[#FAF7F2] border border-[#EAE5DB] rounded-lg animate-fadeIn">
                      <input
                        type="text"
                        autoFocus
                        value={newServiceCatName}
                        onChange={(e) => setNewServiceCatName(e.target.value)}
                        placeholder="e.g. Ayurvedic Care"
                        className="flex-1 px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#2E4D34] focus:outline-none bg-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddServiceCategory(e);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddServiceCategory}
                        disabled={!newServiceCatName.trim()}
                        className="px-2.5 py-1 bg-[#2E4D34] text-white text-xs font-semibold rounded hover:bg-[#233B28] disabled:opacity-50 whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 border border-[#EAE5DB] rounded-xl focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                  >
                    {serviceCategories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#223B28] mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="herbal-scalp-massage"
                    className="w-full px-3.5 py-2 border border-[#EAE5DB] rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#223B28] mb-1">Base Price (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-[#EAE5DB] rounded-xl focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#223B28] mb-1">Duration (minutes) *</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={formData.duration_min}
                    onChange={(e) => setFormData({ ...formData, duration_min: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-[#EAE5DB] rounded-xl focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#223B28] mb-1">Service Image URL *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://... or /uploads/..."
                    className="flex-1 px-3.5 py-2 border border-[#EAE5DB] rounded-xl text-xs focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EAF1EA] hover:bg-[#d8e6d8] text-[#2E4D34] rounded-xl text-xs font-semibold cursor-pointer transition-colors shrink-0">
                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#223B28] mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the service experience, techniques, organic ingredients, and benefits..."
                  className="w-full px-3.5 py-2 border border-[#EAE5DB] rounded-xl focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#223B28] mb-1">
                  Features / Highlights (one per line)
                </label>
                <textarea
                  rows={3}
                  value={formData.featuresText}
                  onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                  placeholder="Experienced Certified Therapist&#10;Cold-Pressed Herbal Oils&#10;In-Home or Studio Option"
                  className="w-full px-3.5 py-2 border border-[#EAE5DB] rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#2E4D34] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="service-is-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-[#EAE5DB] text-[#2E4D34] focus:ring-[#2E4D34] h-4 w-4"
                />
                <label htmlFor="service-is-active" className="text-xs font-semibold text-[#223B28] cursor-pointer">
                  Service is Active and visible on the customer storefront
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE5DB]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#EAE5DB] text-[#5F6D61] rounded-xl hover:bg-[#FAF7F2] font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 bg-[#2E4D34] hover:bg-[#233B27] disabled:bg-[#8F9E8F] text-white rounded-xl font-semibold transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingService ? 'Update Service' : 'Save Service'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Service"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This will permanently remove the service from the database and storefront.`}
          confirmText="Delete Service"
          isDanger={true}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default AdminServicesPage;
