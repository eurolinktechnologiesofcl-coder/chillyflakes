import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Upload,
} from 'lucide-react';
import { uploadProductImage } from '../../../api/vendorProducts';
import { PageHeader } from '../../../components/vendor/PageHeader';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { ErrorState } from '../../../components/vendor/ErrorState';
import { useToast } from '../../../components/vendor/Toast';
import { Button } from '../../../components/ui/Button';
import { formatINR } from '../../../utils/currency';
import {
  getVendorServices,
  createVendorService,
  updateVendorService,
  deleteVendorService,
  getVendorServiceBookings,
  updateVendorBookingStatus,
} from '../../../api/vendorPortalApi';
import type { VendorService } from '../../../types/vendorPortal';

export const VendorServicesPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'services' | 'bookings'>('services');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<VendorService | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('Crafts');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [price, setPrice] = useState('1499');
  const [durationMin, setDurationMin] = useState('90');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState('Artisan guided session,All materials included,Take-home craft');
  const [image, setImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const res = await uploadProductImage(file);
      setImage(res.url);
      toast.showToast('Workshop banner image uploaded successfully!', 'success');
    } catch (err: any) {
      toast.showToast(err?.response?.data?.message || err?.message || 'Failed to upload image.', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const {
    data: servicesData,
    isLoading: isServicesLoading,
    isError: isServicesError,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ['vendor-services'],
    queryFn: getVendorServices,
  });

  const {
    data: bookingsData,
    isLoading: isBookingsLoading,
  } = useQuery({
    queryKey: ['vendor-service-bookings'],
    queryFn: getVendorServiceBookings,
    enabled: activeTab === 'bookings',
  });

  const services = servicesData?.results || [];
  const bookings = bookingsData?.results || [];

  const serviceMutation = useMutation({
    mutationFn: (payload: any) =>
      editingService
        ? updateVendorService(editingService.id, payload)
        : createVendorService(payload),
    onSuccess: () => {
      toast.showToast(editingService ? 'Service updated successfully!' : 'Service created successfully!', 'success');
      setIsServiceModalOpen(false);
      setEditingService(null);
      void queryClient.invalidateQueries({ queryKey: ['vendor-services'] });
    },
    onError: (err: any) => {
      toast.showToast(err?.message || 'Failed to save service.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVendorService(id),
    onSuccess: () => {
      toast.showToast('Service deleted successfully.', 'success');
      void queryClient.invalidateQueries({ queryKey: ['vendor-services'] });
    },
    onError: (err: any) => {
      toast.showToast(err?.message || 'Failed to delete service.', 'error');
    },
  });

  const bookingStatusMutation = useMutation({
    mutationFn: (params: { id: string; status: string }) =>
      updateVendorBookingStatus(params.id, params.status),
    onSuccess: (res) => {
      toast.showToast(`Booking marked as ${res.status}.`, 'success');
      void queryClient.invalidateQueries({ queryKey: ['vendor-service-bookings'] });
    },
    onError: (err: any) => {
      toast.showToast(err?.message || 'Failed to update booking status.', 'error');
    },
  });

  const handleOpenCreate = () => {
    setEditingService(null);
    setTitle('');
    setSubtitle('');
    setCategory('Crafts');
    setIsCustomCategory(false);
    setCustomCategoryName('');
    setPrice('1499');
    setDurationMin('90');
    setDescription('');
    setFeatures('Artisan guided session,All materials included,Take-home craft');
    setImage('/botanical-care-banner.jpg');
    setIsServiceModalOpen(true);
  };

  const handleOpenEdit = (s: VendorService) => {
    setEditingService(s);
    setTitle(s.title);
    setSubtitle(s.subtitle || '');
    const standardCategories = ['Crafts', 'Wellness', 'Culinary', 'Art'];
    if (s.category && !standardCategories.includes(s.category)) {
      setIsCustomCategory(true);
      setCustomCategoryName(s.category);
      setCategory('__CUSTOM__');
    } else {
      setIsCustomCategory(false);
      setCustomCategoryName('');
      setCategory(s.category || 'Crafts');
    }
    setPrice(String(s.price));
    setDurationMin(String(s.duration_min || 60));
    setDescription(s.description);
    setFeatures((s.features || []).join(','));
    setImage(s.image || '');
    setIsServiceModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustomCategory && customCategoryName.trim()
      ? customCategoryName.trim()
      : category === '__CUSTOM__'
      ? (customCategoryName.trim() || 'Custom Workshop')
      : category;

    const featList = features.split(',').map((f) => f.trim()).filter(Boolean);
    serviceMutation.mutate({
      title,
      subtitle,
      category: finalCategory,
      price: Number(price),
      duration_min: Number(durationMin),
      duration: `${durationMin} mins`,
      description,
      features: featList,
      image: image || '/botanical-care-banner.jpg',
    });
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Services & Workshops"
          description="Host artisan craft sessions, farm masterclasses, and hands-on workshops."
        />

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Service / Workshop
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#EAE5DB] flex items-center gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'services'
              ? 'border-[#2E4D34] text-[#2E4D34]'
              : 'border-transparent text-[#8E9B90] hover:text-[#223B28]'
          }`}
        >
          My Services ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'bookings'
              ? 'border-[#2E4D34] text-[#2E4D34]'
              : 'border-transparent text-[#8E9B90] hover:text-[#223B28]'
          }`}
        >
          Customer Bookings ({bookings.length})
        </button>
      </div>

      {/* Services Grid */}
      {activeTab === 'services' && (
        <>
          {isServicesLoading ? (
            <div className="bg-white rounded-2xl border border-[#EAE5DB] p-12 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#2E4D34] mb-3" />
              <p className="text-xs font-medium text-[#637365]">Loading your workshops & services...</p>
            </div>
          ) : isServicesError ? (
            <ErrorState message="Failed to load services." onRetry={refetchServices} />
          ) : services.length === 0 ? (
            <EmptyState
              title="No services offered yet"
              description="Offer hands-on artisan workshops, spice blending masterclasses, or consultations."
              action={{
                label: 'Create Workshop',
                onClick: handleOpenCreate,
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-3xl border border-[#EAE5DB] overflow-hidden shadow-xs hover:border-[#2E4D34]/50 transition-all flex flex-col justify-between"
                >
                  <div className="relative aspect-video w-full bg-[#FAF7F2]">
                    <img
                      src={s.image || '/botanical-care-banner.jpg'}
                      alt={s.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-white/90 text-[#2E4D34] backdrop-blur-xs">
                      {s.category || 'Workshop'}
                    </span>
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 text-[#637365] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#2E4D34]" />
                      {s.duration || `${s.duration_min} min`}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="font-serif text-base font-bold text-[#223B28] line-clamp-1">
                        {s.title}
                      </h4>
                      {s.subtitle && (
                        <p className="text-xs text-[#8E9B90] line-clamp-1">{s.subtitle}</p>
                      )}
                      <p className="text-xs text-[#637365] line-clamp-2 mt-2 leading-relaxed">
                        {s.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#FAF7F2] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#8E9B90] uppercase block">Per Person</span>
                        <span className="font-serif text-base font-bold text-[#2E4D34]">
                          {formatINR(s.price)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-2 rounded-xl text-[#637365] hover:text-[#2E4D34] hover:bg-[#FAF7F2] transition-colors"
                          title="Edit Service"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete service "${s.title}"?`)) {
                              deleteMutation.mutate(s.id);
                            }
                          }}
                          className="p-2 rounded-xl text-[#8E9B90] hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bookings Table */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-[#223B28]">
              Workshop Registrations
            </h3>
            <span className="text-xs text-[#8E9B90]">
              Attendees enrolled for your artisan experiences
            </span>
          </div>

          {isBookingsLoading ? (
            <div className="p-8 text-center text-xs text-[#8E9B90]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2E4D34]" />
              Loading bookings...
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState
              title="No workshop bookings yet"
              description="When customers reserve seats for your artisan sessions, they will be listed here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#FAF7F2] text-[#8E9B90] uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Booking Ref</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Preferred Date</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="py-3 px-3 font-mono font-bold text-[#2E4D34]">
                        {b.booking_ref}
                      </td>
                      <td className="py-3 px-3 font-medium text-[#223B28]">{b.service_title}</td>
                      <td className="py-3 px-3 text-[#637365]">
                        <p className="font-medium text-[#223B28]">{b.customer_name}</p>
                        <p className="text-[10px]">{b.customer_email}</p>
                      </td>
                      <td className="py-3 px-3 text-[#223B28]">{b.preferred_date}</td>
                      <td className="py-3 px-3 text-[#637365]">{b.preferred_time}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            b.status === 'confirmed'
                              ? 'bg-[#EAF1EA] text-[#2E4D34]'
                              : b.status === 'completed'
                              ? 'bg-blue-50 text-blue-800'
                              : b.status === 'cancelled'
                              ? 'bg-red-50 text-red-800'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        {b.status !== 'confirmed' && b.status !== 'completed' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => bookingStatusMutation.mutate({ id: b.id, status: 'CONFIRMED' })}
                          >
                            Confirm
                          </Button>
                        )}
                        {b.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => bookingStatusMutation.mutate({ id: b.id, status: 'COMPLETED' })}
                          >
                            Complete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-[#D1DDD0] shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-lg font-bold text-[#223B28]">
              {editingService ? 'Edit Artisan Workshop' : 'Create New Workshop / Service'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#4F5E51] block mb-1">Service Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traditional Terracotta Pottery Workshop"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#4F5E51] block mb-1">Subtitle / Highlights</label>
                <input
                  type="text"
                  placeholder="e.g. Master wheel-throwing techniques from master artisans"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                />
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-[#4F5E51] block">Category *</label>
                      {!isCustomCategory && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomCategory(true);
                            setCategory('__CUSTOM__');
                          }}
                          className="text-[10px] font-semibold text-[#2E4D34] hover:underline cursor-pointer"
                        >
                          + Add New
                        </button>
                      )}
                    </div>
                    <select
                      value={isCustomCategory ? '__CUSTOM__' : category}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomCategory(true);
                          setCategory('__CUSTOM__');
                        } else {
                          setIsCustomCategory(false);
                          setCategory(e.target.value);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                    >
                      <option value="Crafts">Crafts & Pottery</option>
                      <option value="Wellness">Herbal & Wellness</option>
                      <option value="Culinary">Culinary & Spices</option>
                      <option value="Art">Textile & Handloom</option>
                      <option value="__CUSTOM__">+ Add New Category...</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-[#4F5E51] block mb-1">Price per person (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                    />
                  </div>
                </div>

                {isCustomCategory && (
                  <div className="p-3 bg-[#EAF1EA]/40 rounded-xl border border-[#D1DDD0] space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-[#2E4D34] text-[11px] block">
                        Enter New Category Name *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(false);
                          setCategory('Crafts');
                        }}
                        className="text-[10px] text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="text"
                      required={isCustomCategory}
                      placeholder="e.g. Woodcarving, Natural Dyeing, Bonsai..."
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="w-full p-2 rounded-lg border border-[#D1DDD0] bg-white text-[#223B28] text-xs focus:ring-1 focus:ring-[#2E4D34]"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#4F5E51] block mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={15}
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#4F5E51] block mb-1">Banner Image</label>
                  <label className="flex items-center justify-center gap-1.5 w-full p-2.5 rounded-xl border border-dashed border-[#2E4D34] bg-[#FAF7F2] text-[#2E4D34] font-semibold hover:bg-emerald-50 cursor-pointer transition-colors">
                    {isUploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingImage}
                      onChange={handleImageFileChange}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#4F5E51] block mb-1">Image URL / Preview</label>
                <div className="flex items-center gap-3">
                  {image && (
                    <img
                      src={image}
                      alt="Banner Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-[#D1DDD0] bg-gray-50 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/botanical-care-banner.jpg';
                      }}
                    />
                  )}
                  <input
                    type="text"
                    placeholder="/botanical-care-banner.jpg or https://..."
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#4F5E51] block mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the session itinerary, materials provided, and location..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#4F5E51] block mb-1">Features (comma separated)</label>
                <input
                  type="text"
                  placeholder="All clay included, Glazing tutorial, Certificate"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#FAF7F2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsServiceModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={serviceMutation.isPending}
                >
                  {serviceMutation.isPending ? 'Saving...' : 'Save Workshop'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorServicesPage;
