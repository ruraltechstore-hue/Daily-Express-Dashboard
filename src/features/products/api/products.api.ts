import { supabase } from '@/lib/supabase';
import type { Product, ProductInsert, ProductUpdate, ProductImageInsert } from '@/types/database';
import { STORAGE_BUCKETS } from '@/config/constants';
import { generateStoragePath } from '@/lib/utils';
import imageCompression from 'browser-image-compression';
import { IMAGE_COMPRESSION_OPTIONS } from '@/config/constants';

// ─── Fetch ───────────────────────────────────────────────────────
export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name),
      images:product_images(*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Product[];
}

export async function fetchProduct(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name),
      images:product_images(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  
  if (data.images) {
    data.images.sort((a: any, b: any) => a.sort_order - b.sort_order);
  }
  
  return data as Product;
}

// ─── Create ──────────────────────────────────────────────────────
export async function createProduct(input: ProductInsert, images: ProductImageInsert[]) {
  // 1. Insert product
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert(input)
    .select()
    .single();

  if (productError) throw productError;

  // 2. Insert images if any
  if (images.length > 0) {
    const imagesToInsert = images.map((img) => ({
      ...img,
      product_id: product.id,
    }));

    const { error: imagesError } = await supabase
      .from('product_images')
      .insert(imagesToInsert);

    if (imagesError) throw imagesError;
  }

  return product as Product;
}

// ─── Update ──────────────────────────────────────────────────────
export async function updateProduct(id: string, input: ProductUpdate, imagesToInsert: Omit<ProductImageInsert, 'product_id'>[], imagesToDelete: string[], imageOrderUpdates: { id: string; sort_order: number; is_primary: boolean }[]) {
  // 1. Update product basic details
  const { data: product, error: productError } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (productError) throw productError;

  // 2. Delete removed images
  if (imagesToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('product_images')
      .delete()
      .in('id', imagesToDelete);

    if (deleteError) throw deleteError;
  }

  // 3. Clear existing primaries before assigning a new one
  const assigningNewPrimary =
    imagesToInsert.some((img) => img.is_primary) ||
    imageOrderUpdates.some((img) => img.is_primary);

  if (assigningNewPrimary) {
    const { error: clearPrimaryError } = await supabase
      .from('product_images')
      .update({ is_primary: false })
      .eq('product_id', id);

    if (clearPrimaryError) throw clearPrimaryError;
  }

  // 4. Update existing image order / primary flags
  if (imageOrderUpdates.length > 0) {
    for (const update of imageOrderUpdates) {
      const { error: updateImageError } = await supabase
        .from('product_images')
        .update({ sort_order: update.sort_order, is_primary: update.is_primary })
        .eq('id', update.id);

      if (updateImageError) throw updateImageError;
    }
  }

  // 5. Insert newly uploaded images
  if (imagesToInsert.length > 0) {
    const newImages = imagesToInsert.map((img) => ({
      ...img,
      product_id: id,
    }));

    const { error: insertError } = await supabase
      .from('product_images')
      .insert(newImages);

    if (insertError) throw insertError;
  }

  return product as Product;
}

// ─── Delete ──────────────────────────────────────────────────────
export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteProducts(ids: string[]) {
  const { error } = await supabase
    .from('products')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

// ─── Image Upload ────────────────────────────────────────────────
export async function uploadProductImage(file: File): Promise<string> {
  const compressed = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS);
  const path = generateStoragePath(STORAGE_BUCKETS.PRODUCTS, file.name);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.PRODUCTS)
    .upload(path, compressed, {
      contentType: compressed.type,
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKETS.PRODUCTS)
    .getPublicUrl(path);

  return urlData.publicUrl;
}
