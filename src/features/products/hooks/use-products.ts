import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchProducts,
  fetchProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProducts,
} from '@/features/products/api/products.api';
import type { ProductInsert, ProductUpdate, ProductImageInsert } from '@/types/database';

const PRODUCTS_KEY = ['products'];

export function useProducts() {
  return useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: fetchProducts,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, id],
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ product, images }: { product: ProductInsert; images: ProductImageInsert[] }) => 
      createProduct(product, images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      toast.success('Product created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      product, 
      imagesToInsert, 
      imagesToDelete, 
      imageOrderUpdates 
    }: { 
      id: string; 
      product: ProductUpdate; 
      imagesToInsert: Omit<ProductImageInsert, 'product_id'>[];
      imagesToDelete: string[];
      imageOrderUpdates: { id: string; sort_order: number; is_primary: boolean }[];
    }) => updateProduct(id, product, imagesToInsert, imagesToDelete, imageOrderUpdates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      toast.success('Product updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update product');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      toast.success('Product deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });
}

export function useDeleteProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => deleteProducts(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      toast.success(`${ids.length} products deleted`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete products');
    },
  });
}
