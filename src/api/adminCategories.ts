import { axiosClient } from './client';
import type {
  AdminCategory,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../types/categoryAttributes';

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const response = await axiosClient.get<AdminCategory[]>('/api/v1/admin/categories/');
  return response.data;
}

export async function createAdminCategory(
  payload: CreateCategoryPayload
): Promise<AdminCategory> {
  const response = await axiosClient.post<AdminCategory>(
    '/api/v1/admin/categories/',
    payload
  );
  return response.data;
}

export async function updateAdminCategory(
  id: string,
  payload: UpdateCategoryPayload
): Promise<AdminCategory> {
  const response = await axiosClient.patch<AdminCategory>(
    `/api/v1/admin/categories/${id}/`,
    payload
  );
  return response.data;
}

export async function addAdminSubcategory(
  id: string,
  name: string
): Promise<AdminCategory> {
  const response = await axiosClient.post<AdminCategory>(
    `/api/v1/admin/categories/${id}/subcategories/`,
    { name }
  );
  return response.data;
}

export async function deleteAdminCategory(id: string): Promise<{ success: boolean; message: string }> {
  const response = await axiosClient.delete<{ success: boolean; message: string }>(
    `/api/v1/admin/categories/${id}/`
  );
  return response.data;
}

