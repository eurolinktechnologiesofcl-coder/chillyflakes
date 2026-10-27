import { apiClient, type ApiResponse } from './client';
import type { Product } from '../types';
import { products as localProducts } from '../data/products';

export interface ProductFilterParams {
  category?: string;
  search?: string;
  condition?: string;
  isFeatured?: boolean;
  ordering?: 'price' | '-price' | 'rating' | '-rating' | 'popularity';
}

/**
 * Products API Service
 * Maps to backend endpoints:
 * - GET  /api/products/
 * - GET  /api/products/:id/
 * - GET  /api/products/featured/
 * - GET  /api/products/trending/
 */
export const productsApi = {
  /**
   * Fetch list of products with optional query parameter filters.
   */
  async getProducts(params?: ProductFilterParams): Promise<ApiResponse<Product[]>> {
    const query = new URLSearchParams();

    if (params?.category && params.category !== 'All') {
      query.set('category', params.category);
    }
    if (params?.search) {
      query.set('search', params.search);
    }
    if (params?.condition) {
      query.set('condition', params.condition);
    }
    if (params?.ordering) {
      query.set('ordering', params.ordering);
    }
    if (params?.isFeatured !== undefined) {
      query.set('is_featured', String(params.isFeatured));
    }

    const endpoint = `products/${query.toString() ? `?${query.toString()}` : ''}`;

    // Filter local fallback in case the backend is not yet running
    let fallback = [...localProducts];
    if (params?.category && params.category !== 'All') {
      fallback = fallback.filter((p) => p.category.toLowerCase() === params.category!.toLowerCase());
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      fallback = fallback.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q)
      );
    }
    if (params?.condition) {
      fallback = fallback.filter((p) => p.condition === params.condition);
    }

    return apiClient.get<Product[]>(endpoint, fallback);
  },

  /**
   * Fetch single product detail by ID or Slug from the backend.
   */
  async getProductById(id: string): Promise<ApiResponse<Product | null>> {
    const fallback = localProducts.find((p) => p.id === id) || null;
    return apiClient.get<Product | null>(`products/${id}/`, fallback);
  },

  /**
   * Fetch Featured Products row.
   */
  async getFeaturedProducts(): Promise<ApiResponse<Product[]>> {
    const fallback = localProducts.slice(0, 5);
    return apiClient.get<Product[]>('products/featured/', fallback);
  },

  /**
   * Fetch Trending Handcrafted Finds row.
   */
  async getTrendingProducts(): Promise<ApiResponse<Product[]>> {
    const fallback = localProducts.slice(5, 10);
    return apiClient.get<Product[]>('products/trending/', fallback);
  },

  /**
   * Search products by keyword.
   */
  async searchProducts(query: string): Promise<ApiResponse<Product[]>> {
    const q = query.toLowerCase().trim();
    const fallback = localProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.material.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
    return apiClient.get<Product[]>(`products/?search=${encodeURIComponent(query)}`, fallback);
  },
};
