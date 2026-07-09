import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchCategories,
  fetchCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteCategories,
} from '@/features/categories/api/categories.api';
import type { CategoryInsert, CategoryUpdate } from '@/types/database';

const CATEGORIES_KEY = ['categories'];

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: fetchCategories,
  });
}

export function useCategory(id: string | undefined) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, id],
    queryFn: () => fetchCategory(id!),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CategoryInsert) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create category');
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryUpdate }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update category');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      toast.success('Category deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });
}

export function useDeleteCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => deleteCategories(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      toast.success(`${ids.length} categories deleted`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete categories');
    },
  });
}
