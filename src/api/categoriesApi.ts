import { apiClient, type ApiResponse } from './client';
import type { Category } from '../types';
import { categories as localCategories } from '../data/categories';

/**
 * Categories API Service
 * Maps to backend endpoints:
 * - GET  /api/categories/
 * - GET  /api/categories/:id/
 */
export const categoriesApi = {
  /**
   * Fetch all product and service categories from the backend.
   */
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return apiClient.get<Category[]>('categories/', localCategories);
  },

  /**
   * Fetch single category detail.
   */
  async getCategoryById(id: string): Promise<ApiResponse<Category | null>> {
    const fallback = localCategories.find((c) => c.id === id) || null;
    return apiClient.get<Category | null>(`categories/${id}/`, fallback);
  },
};
