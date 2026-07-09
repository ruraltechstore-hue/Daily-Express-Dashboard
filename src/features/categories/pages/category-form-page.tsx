import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, LoadingSpinner } from '@/components/shared';
import { useCategory, useCreateCategory, useUpdateCategory } from '@/features/categories/hooks/use-categories';
import { uploadCategoryImage } from '@/features/categories/api/categories.api';
import { categorySchema, type CategoryFormValues } from '@/features/categories/schemas/category.schema';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/config/constants';
import { toast } from 'sonner';

export function CategoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: category, isLoading: categoryLoading } = useCategory(id);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      sort_order: 0,
      active: true,
    },
    values: category
      ? {
          name: category.name,
          description: category.description ?? '',
          image_url: category.image_url,
          sort_order: category.sort_order,
          active: category.active,
        }
      : undefined,
  });

  const activeValue = watch('active');
  const currentImageUrl = imageUrl ?? watch('image_url');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const url = await uploadCategoryImage(file);
      setImageUrl(url);
      setValue('image_url', url);
      toast.success('Image uploaded');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }, [setValue]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ACCEPTED_IMAGE_TYPES.map((t) => `.${t.split('/')[1]}`) },
    maxFiles: 1,
    disabled: uploading,
  });

  const onSubmit = async (values: CategoryFormValues) => {
    const data = {
      ...values,
      image_url: currentImageUrl ?? null,
      description: values.description || null,
    };

    if (isEdit && id) {
      await updateMutation.mutateAsync({ id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    navigate('/categories');
  };

  if (isEdit && categoryLoading) {
    return <LoadingSpinner />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl"
    >
      <PageHeader
        title={isEdit ? 'Edit Category' : 'New Category'}
        description={isEdit ? `Editing "${category?.name}"` : 'Create a new product category'}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input id="name" placeholder="e.g. Milk & Curd" {...register('name')} />
              {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the category..."
                {...register('description')}
              />
              {errors.description && <p className="text-xs text-error">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input id="sort_order" type="number" min={0} {...register('sort_order', { valueAsNumber: true })} />
                {errors.sort_order && <p className="text-xs text-error">{errors.sort_order.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-3 h-11">
                  <Switch
                    checked={activeValue}
                    onCheckedChange={(checked) => setValue('active', checked)}
                  />
                  <span className="text-sm">{activeValue ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Image</CardTitle>
          </CardHeader>
          <CardContent>
            {currentImageUrl ? (
              <div className="relative w-full h-48 rounded-[16px] overflow-hidden bg-surface">
                <img
                  src={currentImageUrl}
                  alt="Category"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl(null);
                    setValue('image_url', null);
                  }}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center h-48 rounded-[16px] border-2 border-dashed transition-colors cursor-pointer ${
                  isDragActive ? 'border-primary bg-surface' : 'border-border hover:border-text-muted'
                }`}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface mb-3">
                      {isDragActive ? (
                        <Upload className="h-5 w-5 text-primary" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-text-muted" />
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      {isDragActive ? 'Drop image here' : 'Click or drag to upload'}
                    </p>
                    <p className="text-xs text-text-muted mt-1">PNG, JPG, WebP up to 5MB</p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={isSubmitting || uploading}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              isEdit ? 'Update Category' : 'Create Category'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => navigate('/categories')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
