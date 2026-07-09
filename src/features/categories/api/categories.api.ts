import { supabase } from '@/lib/supabase';
import type { Category, CategoryInsert, CategoryUpdate } from '@/types/database';
import { STORAGE_BUCKETS } from '@/config/constants';
import { generateStoragePath } from '@/lib/utils';
import imageCompression from 'browser-image-compression';
import { IMAGE_COMPRESSION_OPTIONS } from '@/config/constants';

// ─── Fetch ───────────────────────────────────────────────────────
export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*, products(count)')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as Category[];
}

export async function fetchCategory(id: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Category;
}

// ─── Create ──────────────────────────────────────────────────────
export async function createCategory(input: CategoryInsert) {
  const { data, error } = await supabase
    .from('categories')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

// ─── Update ──────────────────────────────────────────────────────
export async function updateCategory(id: string, input: CategoryUpdate) {
  const { data, error } = await supabase
    .from('categories')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

// ─── Delete ──────────────────────────────────────────────────────
export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Bulk Delete ─────────────────────────────────────────────────
export async function deleteCategories(ids: string[]) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

// ─── Image Upload ────────────────────────────────────────────────
export async function uploadCategoryImage(file: File): Promise<string> {
  const compressed = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS);
  const path = generateStoragePath(STORAGE_BUCKETS.CATEGORIES, file.name);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.CATEGORIES)
    .upload(path, compressed, {
      contentType: compressed.type,
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKETS.CATEGORIES)
    .getPublicUrl(path);

  return urlData.publicUrl;
}
