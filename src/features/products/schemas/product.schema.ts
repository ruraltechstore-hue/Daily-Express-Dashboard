import { z } from 'zod';

export const productImageSchema = z.object({
  id: z.string().optional(), // If exists, it's an existing image
  image_url: z.string().url(),
  alt_text: z.string().nullable().optional(),
  is_primary: z.boolean(),
});

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(150, 'Name too long'),
  category_id: z.string().min(1, 'Category is required'),
  description: z.string().max(1000, 'Description too long').nullable().optional(),
  price: z.number().min(0, 'Price must be positive'),
  unit_value: z.number().min(0.01, 'Unit value must be positive'),
  unit_type: z.string().min(1, 'Unit type is required'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  active: z.boolean(),
  images: z.array(productImageSchema),
  shelf_life: z.preprocess((val) => (val === '' || val === null || Number.isNaN(val) ? undefined : Number(val)), z.number().min(0).optional()),
  storage_instructions: z.string().nullable().optional(),
  nutritional_info: z.object({
    fat: z.preprocess((val) => (val === '' || val === null || Number.isNaN(val) ? undefined : Number(val)), z.number().min(0).optional()),
    protein: z.preprocess((val) => (val === '' || val === null || Number.isNaN(val) ? undefined : Number(val)), z.number().min(0).optional()),
    carbs: z.preprocess((val) => (val === '' || val === null || Number.isNaN(val) ? undefined : Number(val)), z.number().min(0).optional()),
    energy: z.preprocess((val) => (val === '' || val === null || Number.isNaN(val) ? undefined : Number(val)), z.number().min(0).optional()),
  }).optional().nullable(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductImageFormValue = z.infer<typeof productImageSchema>;
