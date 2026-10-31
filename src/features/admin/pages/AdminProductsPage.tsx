import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Archive,
  ArchiveRestore,
  Upload,
  Edit2,
  Boxes,
  Loader2,
  Star,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';
import { axiosClient } from '../../../api/client';
import { useToast } from '../../../components/vendor/Toast';

interface ProductItem {
  id: string;
  title: string;
  sku: string;
  main_image_url: string;
  images?: string[];
  category: { id: string; name: string; slug: string };
  price_paise: number;
  mrp_paise: number;
  total_stock: number;
  status: string;
  description_i18n?: { en: string };
  variants?: Array<{ sku: string; color_name: string; size?: string; stock: number; price_paise: number }>;
}

export const AdminProductsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    sku: '',
    price: 499,
    mrp: 699,
    stock: 25,
    main_image_url: '',
    images: [] as string[],
    description: '',
  });
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Quick category creation state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const handleCreateCategoryInline = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setIsSavingCategory(true);
    try {
      const res = await axiosClient.post('/api/v1/admin/categories/', {
        name: trimmed,
        slug: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-categories-simple'] });
      setFormData((prev) => ({ ...prev, category_id: res.data.id }));
      showToast(`Category "${trimmed}" created and selected!`, 'success');
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to create category', 'warning');
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Fetch categories
  const { data: categories = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['admin-categories-simple'],
    queryFn: async () => {
      const res = await axiosClient.get('/api/v1/admin/categories/');
      return res.data;
    },
  });

  // Fetch products
  const { data, isLoading } = useQuery<{ results: ProductItem[]; total: number }>({
    queryKey: ['admin-products', statusFilter, categoryFilter, search],
    queryFn: async () => {
      const res = await axiosClient.get('/api/v1/admin/products/', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
          search: search || undefined,
        },
      });
      return res.data;
    },
  });

  const products = useMemo(() => data?.results || [], [data]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    const defaultImg = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80';
    setFormData({
      title: '',
      category_id: categories[0]?.id || '',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      price: 499,
      mrp: 699,
      stock: 25,
      main_image_url: defaultImg,
      images: [defaultImg],
      description: 'Handcrafted artisan product.',
    });
    setNewImageUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p);
    const existingList = Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : (p.main_image_url ? [p.main_image_url] : []);
    const mainImg = p.main_image_url || existingList[0] || '';
    const mergedList = existingList.includes(mainImg) ? existingList : [mainImg, ...existingList];
    setFormData({
      title: p.title,
      category_id: p.category.id,
      sku: p.sku,
      price: Math.round(p.price_paise / 100),
      mrp: Math.round(p.mrp_paise / 100),
      stock: p.total_stock,
      main_image_url: mainImg,
      images: mergedList,
      description: p.description_i18n?.en || '',
    });
    setNewImageUrl('');
    setIsModalOpen(true);
  };

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
          showToast(`File "${file.name}" has invalid type. Use JPG, PNG or WEBP.`, 'warning');
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          showToast(`File "${file.name}" exceeds 5MB size limit.`, 'warning');
          continue;
        }

        const form = new FormData();
        form.append('file', file);
        const res = await axiosClient.post('/api/v1/upload/', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.url) {
          uploadedUrls.push(res.data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setFormData((prev) => {
          const nextImages = [...prev.images, ...uploadedUrls];
          const primary = prev.main_image_url || nextImages[0] || '';
          return {
            ...prev,
            images: nextImages,
            main_image_url: primary,
          };
        });
        showToast(`Uploaded ${uploadedUrls.length} image(s) successfully!`, 'success');
      }
    } catch {
      showToast('Failed to upload image(s). Please try again.', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    setFormData((prev) => {
      const nextImages = prev.images.includes(url) ? prev.images : [...prev.images, url];
      return {
        ...prev,
        images: nextImages,
        main_image_url: prev.main_image_url || url,
      };
    });
    setNewImageUrl('');
    showToast('Image URL added to gallery.', 'info');
  };

  const handleSetPrimary = (imgUrl: string) => {
    setFormData((prev) => ({
      ...prev,
      main_image_url: imgUrl,
    }));
    showToast('Primary image updated.', 'success');
  };

  const handleDeleteImage = (index: number) => {
    setFormData((prev) => {
      const toRemove = prev.images[index];
      const remaining = prev.images.filter((_, i) => i !== index);
      let newPrimary = prev.main_image_url;
      if (toRemove === prev.main_image_url) {
        newPrimary = remaining[0] || '';
      }
      return {
        ...prev,
        images: remaining,
        main_image_url: newPrimary,
      };
    });
    showToast('Image removed from gallery.', 'info');
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    setFormData((prev) => {
      const newImages = [...prev.images];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newImages.length) return prev;
      const temp = newImages[index];
      newImages[index] = newImages[targetIndex];
      newImages[targetIndex] = temp;
      return {
        ...prev,
        images: newImages,
      };
    });
  };

  // Mutation: Save Product
  const saveMutation = useMutation({
    mutationFn: async () => {
      const primary = formData.main_image_url || formData.images[0] || '';
      const allImages = Array.from(new Set([primary, ...formData.images].filter(Boolean)));
      const payload = {
        title: formData.title,
        category_id: formData.category_id,
        sku: formData.sku,
        price_paise: Math.round(formData.price * 100),
        mrp_paise: Math.round(formData.mrp * 100),
        stock: Number(formData.stock),
        main_image_url: primary,
        images: allImages,
        description: formData.description,
      };

      if (editingProduct) {
        return axiosClient.patch(`/api/v1/admin/products/${editingProduct.id}/`, payload);
      } else {
        return axiosClient.post('/api/v1/admin/products/', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      window.dispatchEvent(new CustomEvent('cf_catalog_updated'));
      setIsModalOpen(false);
      showToast(editingProduct ? 'Product updated successfully!' : 'Product created successfully!', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Error saving product.', 'error');
    },
  });

  // Mutation: Archive Product
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return axiosClient.delete(`/api/v1/admin/products/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      window.dispatchEvent(new CustomEvent('cf_catalog_updated'));
      showToast('Product archived.', 'info');
    },
  });

  // Mutation: Unarchive Product
  const unarchiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return axiosClient.post(`/api/v1/admin/products/${id}/unarchive/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      window.dispatchEvent(new CustomEvent('cf_catalog_updated'));
      showToast('Product unarchived and restored to active catalog!', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || 'Failed to unarchive product.', 'error');
    },
  });

  // Mutation: Delete Product Permanently
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return axiosClient.delete(`/api/v1/admin/products/${id}/permanent/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      window.dispatchEvent(new CustomEvent('cf_catalog_updated'));
      showToast('Product permanently deleted from database.', 'success');
    },
    onError: (err: any) => {
      showToast(err?.message || err?.response?.data?.message || 'Failed to delete product.', 'error');
    },
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-[#1A4D2E]" />
            Catalog Products
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage live marketplace inventory, variants, prices, and stock levels.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1A4D2E] text-white rounded-lg text-sm font-semibold hover:bg-[#143d24] transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by product title or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved / Live</option>
            <option value="pending_approval">Pending Review</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#1A4D2E]" />
            <p className="mt-2 text-sm">Loading live catalog products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Boxes className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-gray-700">No products found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or add a new product.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => {
                  const price = Math.round(p.price_paise / 100);
                  const mrp = Math.round(p.mrp_paise / 100);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.main_image_url}
                            alt={p.title}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-gray-100 flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">{p.title}</p>
                            <p className="text-xs text-gray-400">{p.variants?.length ? `${p.variants.length} variant(s)` : 'Single'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-600">{p.sku}</td>
                      <td className="py-3 px-4 text-gray-700">{p.category.name}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        ₹{price}
                        {mrp > price && <span className="ml-1 text-xs text-gray-400 line-through">₹{mrp}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            p.total_stock > 10
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.total_stock > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.total_stock} in stock
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            p.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'pending_approval'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                          {p.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {p.status === 'archived' ? (
                            <button
                              onClick={() => {
                                if (confirm(`Unarchive "${p.title}" and restore to active catalog?`)) {
                                  unarchiveMutation.mutate(p.id);
                                }
                              }}
                              title="Unarchive & Restore to Catalog"
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (confirm(`Archive "${p.title}"?`)) {
                                  archiveMutation.mutate(p.id);
                                }
                              }}
                              title="Archive Product"
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to permanently delete "${p.title}"? This cannot be undone.`)) {
                                deleteMutation.mutate(p.id);
                              }
                            }}
                            title="Delete Product Permanently"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 my-8">
            <h2 className="text-xl font-bold text-gray-900">
              {editingProduct ? 'Edit Catalog Product' : 'Add New Marketplace Product'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">Changes are live in the database and storefront immediately.</p>

            {editingProduct && editingProduct.status === 'archived' && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>This product is currently <strong>Archived</strong> and hidden from shoppers.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    unarchiveMutation.mutate(editingProduct.id);
                    setIsModalOpen(false);
                  }}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-2xs transition-colors"
                >
                  Unarchive & Restore
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="mt-5 space-y-4 text-sm"
            >
              <div>
                <label className="block font-medium text-gray-700 mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-medium text-gray-700">Category</label>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory((v) => !v)}
                      className="text-xs font-semibold text-[#1A4D2E] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {isAddingCategory ? 'Cancel' : '+ New Category'}
                    </button>
                  </div>

                  {isAddingCategory && (
                    <div className="flex items-center gap-1.5 mb-2 p-1.5 bg-[#FAF7F2] border border-[#EAE5DB] rounded-lg animate-fadeIn">
                      <input
                        type="text"
                        autoFocus
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g. Organic Teas"
                        className="flex-1 px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#1A4D2E] focus:outline-none bg-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleCreateCategoryInline(e);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategoryInline}
                        disabled={isSavingCategory || !newCategoryName.trim()}
                        className="px-2.5 py-1 bg-[#1A4D2E] text-white text-xs font-semibold rounded hover:bg-[#143d24] disabled:opacity-50 whitespace-nowrap"
                      >
                        {isSavingCategory ? 'Saving...' : 'Add'}
                      </button>
                    </div>
                  )}

                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none"
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">MRP Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Total Stock</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none"
                  />
                </div>
              </div>

              {/* Product Images & Gallery Section */}
              <div className="space-y-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block font-semibold text-gray-800 text-xs">
                      Product Images Gallery ({formData.images.length})
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Upload multiple images, set the primary image, reorder, or delete individual photos.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A4D2E] hover:bg-[#143d24] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0 shadow-xs">
                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Upload Images</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={handleMultipleImagesUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Add Image by URL */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Or paste image URL (https://... or /uploads/...)"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Add URL
                  </button>
                </div>

                {/* Gallery Grid */}
                {formData.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                    {formData.images.map((img, idx) => {
                      const isPrimary = formData.main_image_url === img;
                      return (
                        <div
                          key={`${img}-${idx}`}
                          className={`relative group bg-white rounded-lg border-2 p-1.5 flex flex-col justify-between transition-all overflow-hidden ${
                            isPrimary
                              ? 'border-[#1A4D2E] ring-2 ring-[#1A4D2E]/20 shadow-xs'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div className="aspect-square w-full rounded overflow-hidden bg-gray-100 flex items-center justify-center relative">
                            <img
                              src={img}
                              alt={`Product image ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                            {isPrimary && (
                              <span className="absolute top-1.5 left-1.5 bg-[#1A4D2E] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5 pointer-events-none z-10">
                                <Star className="w-2.5 h-2.5 fill-current" /> PRIMARY
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(idx)}
                              title="Delete Image"
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded bg-white/95 hover:bg-rose-600 text-rose-600 hover:text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer z-10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Control Buttons */}
                          <div className="flex items-center justify-between gap-1 mt-1.5 pt-1 border-t border-gray-100 min-w-0">
                            {!isPrimary ? (
                              <button
                                type="button"
                                onClick={() => handleSetPrimary(img)}
                                title="Set as Primary"
                                className="text-[10px] font-semibold text-[#1A4D2E] hover:underline flex items-center gap-0.5 truncate cursor-pointer shrink"
                              >
                                <Star className="w-3 h-3 shrink-0" />
                                <span className="truncate">Set Primary</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold text-[#1A4D2E] flex items-center gap-0.5 shrink-0">
                                <Star className="w-3 h-3 fill-current text-[#1A4D2E]" />
                                <span>Featured</span>
                              </span>
                            )}

                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveImage(idx, 'left')}
                                title="Move Left"
                                className="p-1 hover:bg-gray-100 disabled:opacity-25 rounded text-gray-600 cursor-pointer transition-colors"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === formData.images.length - 1}
                                onClick={() => handleMoveImage(idx, 'right')}
                                title="Move Right"
                                className="p-1 hover:bg-gray-100 disabled:opacity-25 rounded text-gray-600 cursor-pointer transition-colors"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-white rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                    No product images added yet. Click &quot;Upload Images&quot; or paste a link.
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A4D2E] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Permanently delete "${editingProduct.title}"? This action cannot be undone.`)) {
                        deleteMutation.mutate(editingProduct.id);
                        setIsModalOpen(false);
                      }
                    }}
                    className="px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Product
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="px-5 py-2 bg-[#1A4D2E] text-white rounded-lg hover:bg-[#143d24] transition-colors font-semibold text-sm inline-flex items-center gap-2"
                  >
                    {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
