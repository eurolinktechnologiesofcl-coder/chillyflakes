import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  addAdminSubcategory,
} from '../../../api/adminCategories';
import type {
  AdminCategory,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../../../types/categoryAttributes';
import type { NormalizedApiError } from '../../../types/auth';

export function useAdminCategories() {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery<AdminCategory[], NormalizedApiError>({
    queryKey: ['admin', 'categories'],
    queryFn: getAdminCategories,
    staleTime: 30 * 1000,
  });

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    queryClient.invalidateQueries({ queryKey: ['vendor', 'categories'] });
  };

  const createCategoryMutation = useMutation<
    AdminCategory,
    NormalizedApiError,
    CreateCategoryPayload
  >({
    mutationFn: createAdminCategory,
    onSuccess: invalidateCategories,
  });

  const updateCategoryMutation = useMutation<
    AdminCategory,
    NormalizedApiError,
    { id: string; payload: UpdateCategoryPayload }
  >({
    mutationFn: ({ id, payload }) => updateAdminCategory(id, payload),
    onSuccess: invalidateCategories,
  });

  const addSubcategoryMutation = useMutation<
    AdminCategory,
    NormalizedApiError,
    { id: string; name: string }
  >({
    mutationFn: ({ id, name }) => addAdminSubcategory(id, name),
    onSuccess: invalidateCategories,
  });

  const deleteCategoryMutation = useMutation<
    { success: boolean; message: string },
    NormalizedApiError,
    string
  >({
    mutationFn: (id: string) => {
      // dynamic import or imported
      return import('../../../api/adminCategories').then((m) => m.deleteAdminCategory(id));
    },
    onSuccess: invalidateCategories,
  });

  return {
    ...categoriesQuery,
    createCategoryMutation,
    updateCategoryMutation,
    addSubcategoryMutation,
    deleteCategoryMutation,
  };
}
