import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').nullable().optional(),
  image_url: z.string().url('Invalid image URL').nullable().optional(),
  sort_order: z.number().int().min(0, 'Sort order must be positive'),
  active: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
