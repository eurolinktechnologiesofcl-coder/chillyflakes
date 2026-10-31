import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Power,
  AlertTriangle,
  X,
  Package,
  Trash2,
} from 'lucide-react';
import { useAdminCategories } from '../hooks/useAdminCategories';
import { PageHeader } from '../../../components/vendor/PageHeader';
import { ConfirmDialog } from '../../../components/vendor/ConfirmDialog';
import { useToast } from '../../../components/vendor/Toast';
import {
  isValidCategoryString,
  findSimilarCategories,
} from '../../products/utils/categoryMatching';
import type { AdminCategory } from '../../../types/categoryAttributes';

export const AdminCategoriesPage: React.FC = () => {
  const toast = useToast();
  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
    createCategoryMutation,
    updateCategoryMutation,
    addSubcategoryMutation,
    deleteCategoryMutation,
  } = useAdminCategories();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatSubcategories, setNewCatSubcategories] = useState('');
  const [addCatError, setAddCatError] = useState<string | null>(null);

  const [renameTarget, setRenameTarget] = useState<AdminCategory | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const [addSubTarget, setAddSubTarget] = useState<AdminCategory | null>(null);
  const [subNameValue, setSubNameValue] = useState('');
  const [subNameError, setSubNameError] = useState<string | null>(null);

  const [toggleStatusTarget, setToggleStatusTarget] = useState<AdminCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);

  // Auto-generate slug when name changes in Add Modal
  const handleNameChange = (val: string) => {
    setNewCatName(val);
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setNewCatSlug(generated);
    if (addCatError) setAddCatError(null);
  };

  // Duplicate suggestions
  const similarCategories = useMemo(() => {
    if (!newCatName || newCatName.trim().length < 2) return [];
    return findSimilarCategories(newCatName, categories);
  }, [newCatName, categories]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.subcategories?.some((s) => s.toLowerCase().includes(q))
    );
  }, [categories, searchTerm]);

  // Handle Add Category Submit
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newCatName.trim();
    if (!trimmedName || !isValidCategoryString(trimmedName)) {
      setAddCatError('Name must be 3–50 characters (letters, numbers, spaces, & and - only).');
      return;
    }
    const slug = (newCatSlug.trim() || trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')).toLowerCase();

    // Check exact duplicate slug or name
    if (categories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase() || c.slug === slug)) {
      setAddCatError(`A category named "${trimmedName}" or with slug "${slug}" already exists.`);
      return;
    }

    const subList = newCatSubcategories
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      await createCategoryMutation.mutateAsync({
        name: trimmedName,
        slug,
        description: newCatDesc.trim() || undefined,
        subcategories: subList,
      });
      toast.success(`Category "${trimmedName}" created successfully.`);
      setIsAddModalOpen(false);
      setNewCatName('');
      setNewCatSlug('');
      setNewCatDesc('');
      setNewCatSubcategories('');
      setAddCatError(null);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setAddCatError(errObj?.response?.data?.message || 'Failed to create category.');
    }
  };

  // Handle Rename Category Submit
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed || !isValidCategoryString(trimmed)) {
      setRenameError('Name must be 3–50 characters (letters, numbers, spaces, & and - only).');
      return;
    }

    try {
      await updateCategoryMutation.mutateAsync({
        id: renameTarget.id,
        payload: { name: trimmed },
      });
      toast.success(`Category renamed to "${trimmed}".`);
      setRenameTarget(null);
      setRenameValue('');
      setRenameError(null);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setRenameError(errObj?.response?.data?.message || 'Failed to rename category.');
    }
  };

  // Handle Add Subcategory Submit
  const handleAddSubcategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSubTarget) return;
    const trimmed = subNameValue.trim();
    if (!trimmed || !isValidCategoryString(trimmed)) {
      setSubNameError('Subcategory must be 3–50 characters (letters, numbers, spaces, & and - only).');
      return;
    }

    if (addSubTarget.subcategories?.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSubNameError(`Subcategory "${trimmed}" already exists in this category.`);
      return;
    }

    try {
      await addSubcategoryMutation.mutateAsync({
        id: addSubTarget.id,
        name: trimmed,
      });
      toast.success(`Added subcategory "${trimmed}" to ${addSubTarget.name}.`);
      setAddSubTarget(null);
      setSubNameValue('');
      setSubNameError(null);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      setSubNameError(errObj?.response?.data?.message || 'Failed to add subcategory.');
    }
  };

  // Handle Toggle Active/Inactive
  const handleToggleStatus = async () => {
    if (!toggleStatusTarget) return;
    const newStatus = !toggleStatusTarget.is_active;

    try {
      await updateCategoryMutation.mutateAsync({
        id: toggleStatusTarget.id,
        payload: { is_active: newStatus },
      });
      toast.info(
        `Category "${toggleStatusTarget.name}" is now ${newStatus ? 'active' : 'deactivated'}.`
      );
      setToggleStatusTarget(null);
    } catch {
      toast.error('Failed to update category status.');
    }
  };

  // Handle Delete Category
  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategoryMutation.mutateAsync(deleteTarget.id);
      toast.success(`Category "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete category.';
      toast.error(msg);
    }
  };


  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Top Header */}
      <PageHeader
        title="Marketplace Categories"
        description="Manage product categories, subcategories, and active catalog visibility for sellers and buyers."
        actions={
          <button
            type="button"
            onClick={() => {
              setIsAddModalOpen(true);
              setAddCatError(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2E4D34] hover:bg-[#233B28] text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9B90]" />
          <input
            type="text"
            placeholder="Search categories or subcategories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#EAE5DB] bg-white text-[#223B28] placeholder-[#8E9B90] focus:outline-none focus:border-[#2E4D34]"
          />
        </div>
        <div className="text-xs text-[#5F6D61] font-medium self-end sm:self-auto">
          Showing <strong>{filteredCategories.length}</strong> of {categories.length} categories
        </div>
      </div>

      {/* Table of Categories */}
      <div className="bg-white rounded-3xl border border-[#EAE5DB] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#5F6D61] space-y-2">
            <div className="w-6 h-6 border-2 border-[#2E4D34] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading categories...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-xs text-red-600 font-semibold">Failed to load categories.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3 py-1.5 text-xs bg-[#2E4D34] text-white rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Layers className="w-10 h-10 text-[#8E9B90] mx-auto opacity-50" />
            <p className="text-sm font-semibold text-[#223B28]">No categories match your search</p>
            <p className="text-xs text-[#5F6D61]">Try adjusting your search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#EAE5DB] text-[#5F6D61] font-semibold">
                  <th className="py-3.5 px-5">Category Name</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Subcategories</th>
                  <th className="py-3.5 px-4 text-center">Products</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5DB]">
                {filteredCategories.map((cat) => {
                  return (
                    <tr key={cat.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#EAF1EA] text-[#2E4D34] flex items-center justify-center flex-shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-[#223B28]">{cat.name}</p>
                            {cat.description && (
                              <p className="text-[11px] text-[#8E9B90] line-clamp-1 max-w-sm">
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono text-[11px] text-[#5F6D61]">
                        {cat.slug}
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {cat.subcategories && cat.subcategories.length > 0 ? (
                            cat.subcategories.map((sub, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAF7F2] border border-[#EAE5DB] text-[#5F6D61]"
                              >
                                {sub}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-[#B0B8B1] italic">None</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setAddSubTarget(cat);
                              setSubNameValue('');
                              setSubNameError(null);
                            }}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-[#2E4D34] bg-[#EAF1EA] hover:bg-[#2E4D34] hover:text-white transition-colors"
                            title="Add subcategory"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-xs text-[#223B28] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#EAE5DB]">
                          <Package className="w-3 h-3 text-[#8E9B90]" />
                          {cat.product_count ?? 0}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            cat.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {cat.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setRenameTarget(cat);
                              setRenameValue(cat.name);
                              setRenameError(null);
                            }}
                            className="p-1.5 rounded-lg text-[#5F6D61] hover:text-[#2E4D34] hover:bg-[#FAF7F2] transition-colors"
                            title="Rename Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setToggleStatusTarget(cat)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              cat.is_active
                                ? 'text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={cat.is_active ? 'Deactivate Category' : 'Activate Category'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(cat)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ======================================================== */}
      {/* ADD CATEGORY MODAL */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-[#EAE5DB] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAF1EA] text-[#2E4D34] flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#223B28]">Add New Category</h3>
                  <p className="text-[11px] text-[#5F6D61]">Create a new sellable marketplace department</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#8E9B90] hover:text-[#223B28] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addCatError && (
              <div className="p-3 rounded-xl bg-[#FFF0F0] border border-[#FED7D7] text-xs text-[#C53030] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{addCatError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#223B28] mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Traditional Pottery, Terracotta Crafts"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE5DB] bg-white text-xs text-[#223B28] focus:outline-none focus:border-[#2E4D34]"
                />
              </div>

              {/* Duplicate category hints */}
              {similarCategories.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Similar existing categories found:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-amber-800">
                    {similarCategories.map((m) => (
                      <li key={m.id}>
                        {m.name} {m.isExact && '(Exact match)'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#223B28] mb-1">
                  URL Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="e.g. traditional-pottery"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE5DB] bg-[#FAF7F2] font-mono text-xs text-[#223B28] focus:outline-none focus:border-[#2E4D34]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#223B28] mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Brief summary of artisan products in this department..."
                  className="w-full p-3 rounded-xl border border-[#EAE5DB] text-xs text-[#223B28] placeholder-[#8E9B90] focus:outline-none focus:border-[#2E4D34]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#223B28] mb-1">
                  Initial Subcategories (comma-separated, optional)
                </label>
                <input
                  type="text"
                  value={newCatSubcategories}
                  onChange={(e) => setNewCatSubcategories(e.target.value)}
                  placeholder="e.g. Clay Pots, Planters, Kitchen Utensils"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE5DB] bg-white text-xs text-[#223B28] focus:outline-none focus:border-[#2E4D34]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EAE5DB] text-xs font-semibold text-[#5F6D61] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#2E4D34] hover:bg-[#233B28] text-xs font-semibold text-white shadow-xs transition-colors"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RENAME CATEGORY MODAL */}
      {/* ======================================================== */}
      {renameTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-[#EAE5DB] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-[#223B28]">Rename Category</h3>
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="text-[#8E9B90] hover:text-[#223B28] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renameError && (
              <div className="p-3 rounded-xl bg-[#FFF0F0] border border-[#FED7D7] text-xs text-[#C53030]">
                {renameError}
              </div>
            )}

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#223B28] mb-1">
                  New Category Name
                </label>
                <input
                  type="text"
                  required
                  value={renameValue}
                  onChange={(e) => {
                    setRenameValue(e.target.value);
                    if (renameError) setRenameError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE5DB] bg-white text-xs text-[#223B28] focus:outline-none focus:border-[#2E4D34]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#EAE5DB] text-xs font-semibold text-[#5F6D61] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCategoryMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#2E4D34] hover:bg-[#233B28] text-xs font-semibold text-white shadow-xs"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD SUBCATEGORY MODAL */}
      {/* ======================================================== */}
      {addSubTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-[#EAE5DB] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-[#223B28]">Add Subcategory</h3>
                <p className="text-[11px] text-[#5F6D61]">Under {addSubTarget.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setAddSubTarget(null)}
                className="text-[#8E9B90] hover:text-[#223B28] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {subNameError && (
              <div className="p-3 rounded-xl bg-[#FFF0F0] border border-[#FED7D7] text-xs text-[#C53030]">
                {subNameError}
              </div>
            )}

            <form onSubmit={handleAddSubcategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#223B28] mb-1">
                  Subcategory Name
                </label>
                <input
                  type="text"
                  required
                  value={subNameValue}
                  onChange={(e) => {
                    setSubNameValue(e.target.value);
                    if (subNameError) setSubNameError(null);
                  }}
                  placeholder="e.g. Terracotta Vases"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE5DB] bg-white text-xs text-[#223B28] focus:outline-none focus:border-[#2E4D34]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAddSubTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#EAE5DB] text-xs font-semibold text-[#5F6D61] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubcategoryMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#2E4D34] hover:bg-[#233B28] text-xs font-semibold text-white shadow-xs"
                >
                  Add Subcategory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TOGGLE STATUS CONFIRM DIALOG */}
      {/* ======================================================== */}
      <ConfirmDialog
        isOpen={Boolean(toggleStatusTarget)}
        onClose={() => setToggleStatusTarget(null)}
        onConfirm={handleToggleStatus}
        title={toggleStatusTarget?.is_active ? 'Deactivate Category' : 'Activate Category'}
        message={
          toggleStatusTarget?.is_active
            ? `Deactivating "${toggleStatusTarget?.name}" will hide it from the seller category picker. Existing products in this category will remain active.`
            : `Activating "${toggleStatusTarget?.name}" will make it immediately selectable by sellers.`
        }
        confirmText={toggleStatusTarget?.is_active ? 'Deactivate' : 'Activate'}
        isDanger={Boolean(toggleStatusTarget?.is_active)}
        isLoading={updateCategoryMutation.isPending}
      />

      {/* ======================================================== */}
      {/* DELETE CATEGORY CONFIRM DIALOG */}
      {/* ======================================================== */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteCategory}
        title={`Delete Category "${deleteTarget?.name}"`}
        message={
          (deleteTarget?.product_count ?? 0) > 0
            ? `Warning: This category contains ${deleteTarget?.product_count} product(s). You must reassign or remove all products before deleting it.`
            : `Are you sure you want to permanently delete category "${deleteTarget?.name}"? This action cannot be undone.`
        }
        confirmText="Delete Category"
        isDanger={true}
        isLoading={deleteCategoryMutation.isPending}
      />
    </div>
  );
};

export default AdminCategoriesPage;
