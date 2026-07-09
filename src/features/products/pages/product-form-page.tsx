import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, Star, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, LoadingSpinner } from '@/components/shared';
import { useProduct, useCreateProduct, useUpdateProduct } from '@/features/products/hooks/use-products';
import { useCategories } from '@/features/categories/hooks/use-categories';
import { uploadProductImage } from '@/features/products/api/products.api';
import { productSchema, type ProductFormValues } from '@/features/products/schemas/product.schema';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/config/constants';
import { toast } from 'sonner';

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: product, isLoading: productLoading } = useProduct(id);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const [uploading, setUploading] = useState(false);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: '',
      category_id: '',
      description: '',
      price: 0,
      unit_value: 0,
      unit_type: 'L',
      stock: 0,
      active: true,
      images: [],
      shelf_life: undefined,
      storage_instructions: '',
      nutritional_info: {
        fat: undefined,
        protein: undefined,
        carbs: undefined,
        energy: undefined,
      },
    },
    values: product
      ? {
          name: product.name,
          category_id: product.category_id,
          description: product.description ?? '',
          price: product.price,
          unit_value: product.unit ? Number(product.unit.match(/^[\d.]+/)?.[0]) || 0 : 0,
          unit_type: product.unit ? product.unit.replace(/^[\d.]+\s*/, '') || 'L' : 'L',
          stock: product.stock,
          active: product.active,
          images: product.images?.map(img => ({
            id: img.id,
            image_url: img.image_url,
            alt_text: img.alt_text,
            is_primary: img.is_primary,
          })) ?? [],
          shelf_life: product.shelf_life ? Number(product.shelf_life.replace(/\D/g, '')) || undefined : undefined,
          storage_instructions: product.storage_instructions ?? '',
          nutritional_info: {
            fat: product.nutritional_info?.fat ? Number(product.nutritional_info.fat) : undefined,
            protein: product.nutritional_info?.protein ? Number(product.nutritional_info.protein) : undefined,
            carbs: product.nutritional_info?.carbs ? Number(product.nutritional_info.carbs) : undefined,
            energy: product.nutritional_info?.energy ? Number(product.nutritional_info.energy) : undefined,
          },
        }
      : undefined,
  });

  const { fields: imageFields, append, remove, update } = useFieldArray({
    control,
    name: 'images',
    // Keep `id` reserved for the database image UUID; RHF uses `_key` internally.
    keyName: '_key',
  });

  const activeValue = watch('active');
  const categoryIdValue = watch('category_id');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Check size limit
    const overSize = acceptedFiles.some(f => f.size > MAX_IMAGE_SIZE_BYTES);
    if (overSize) {
      toast.error('Some images are larger than 5MB');
      return;
    }

    try {
      setUploading(true);
      for (const file of acceptedFiles) {
        const url = await uploadProductImage(file);
        append({
          image_url: url,
          alt_text: file.name,
          is_primary: imageFields.length === 0, // First image is primary
        });
      }
      toast.success(`${acceptedFiles.length} images uploaded`);
    } catch {
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  }, [append, imageFields.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ACCEPTED_IMAGE_TYPES.map((t) => `.${t.split('/')[1]}`) },
    disabled: uploading,
  });

  const setPrimaryImage = (index: number) => {
    const images = watch('images');
    images.forEach((image, i) => {
      update(i, { ...image, is_primary: i === index });
    });
  };

  const removeImage = (index: number) => {
    const img = watch('images')[index];
    if (img?.id) {
      setDeletedImageIds((prev) => [...prev, img.id!]);
    }
    remove(index);
    // If we removed the primary, make the first one primary if exists
    if (img?.is_primary && imageFields.length > 1) {
      const nextIndex = index === 0 ? 1 : 0;
      const nextImage = watch('images')[nextIndex];
      if (nextImage) {
        update(nextIndex - (index === 0 ? 1 : 0), { ...nextImage, is_primary: true });
      }
    }
  };

  const onSubmit = async (values: ProductFormValues) => {
    const productData = {
      name: values.name,
      category_id: values.category_id,
      description: values.description || null,
      price: values.price,
      unit: `${values.unit_value} ${values.unit_type}`,
      stock: values.stock,
      active: values.active,
      shelf_life: values.shelf_life ? `${values.shelf_life} Days` : null,
      storage_instructions: values.storage_instructions || null,
      nutritional_info: values.nutritional_info || null,
    };

    if (isEdit && id) {
      // Split images into new (to insert) and existing (to update order/primary)
      const imagesToInsert = values.images
        .filter(img => !img.id)
        .map((img, i) => ({
          image_url: img.image_url,
          alt_text: img.alt_text || null,
          is_primary: img.is_primary,
          sort_order: i,
        }));

      const imageOrderUpdates = values.images
        .map((img, i) => ({ ...img, sort_order: i }))
        .filter(img => img.id)
        .map(img => ({
          id: img.id!,
          sort_order: img.sort_order,
          is_primary: img.is_primary,
        }));

      await updateMutation.mutateAsync({
        id,
        product: productData,
        imagesToInsert,
        imagesToDelete: deletedImageIds,
        imageOrderUpdates,
      });
    } else {
      const imagesToInsert = values.images.map((img, i) => ({
        image_url: img.image_url,
        alt_text: img.alt_text || null,
        is_primary: img.is_primary,
        sort_order: i,
        product_id: '', // Will be injected by the API layer
      }));

      await createMutation.mutateAsync({
        product: productData,
        images: imagesToInsert,
      });
    }
    navigate('/products');
  };

  if ((isEdit && productLoading) || categoriesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl"
    >
      <PageHeader
        title={isEdit ? 'Edit Product' : 'New Product'}
        description={isEdit ? `Editing "${product?.name}"` : 'Add a new product to your catalog'}
      />

      <form
        onSubmit={handleSubmit(onSubmit as any, () => {
          toast.error('Please fix the highlighted errors before saving.');
        })}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left Column - Main details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" placeholder="e.g. Farm Fresh Milk" {...register('name')} />
                {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed description of the product..."
                  className="min-h-[120px]"
                  {...register('description')}
                />
                {errors.description && <p className="text-xs text-error">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={categoryIdValue}
                    onValueChange={(val) => setValue('category_id', val)}
                  >
                    <SelectTrigger className={errors.category_id ? 'border-error' : ''}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category_id && <p className="text-xs text-error">{errors.category_id.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Unit / Size *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Value"
                      className="flex-1"
                      {...register('unit_value', { valueAsNumber: true })}
                    />
                    <Select
                      value={watch('unit_type')}
                      onValueChange={(val) => setValue('unit_type', val)}
                    >
                      <SelectTrigger className="w-24 shrink-0">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="pcs">pcs</SelectItem>
                        <SelectItem value="dozen">dozen</SelectItem>
                        <SelectItem value="pack">pack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {errors.unit_value && <p className="text-xs text-error">{errors.unit_value.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shelf_life">Shelf Life (Days)</Label>
                  <Input id="shelf_life" type="number" min={0} placeholder="e.g. 7" {...register('shelf_life')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storage_instructions">Storage Instructions</Label>
                  <Select
                    value={watch('storage_instructions') || ''}
                    onValueChange={(val) => setValue('storage_instructions', val)}
                  >
                    <SelectTrigger id="storage_instructions">
                      <SelectValue placeholder="Select storage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Keep Refrigerated">Keep Refrigerated</SelectItem>
                      <SelectItem value="Keep Frozen">Keep Frozen</SelectItem>
                      <SelectItem value="Room Temperature">Room Temperature</SelectItem>
                      <SelectItem value="Cool & Dry Place">Cool & Dry Place</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nutritional Facts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nutritional Info (per 100ml/g)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="energy">Energy (kcal)</Label>
                <Input id="energy" type="number" step="0.1" min={0} placeholder="e.g. 64" {...register('nutritional_info.energy')} />
                {errors.nutritional_info?.energy && <p className="text-xs text-error">{errors.nutritional_info.energy.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Protein (g)</Label>
                <Input id="protein" type="number" step="0.1" min={0} placeholder="e.g. 3.2" {...register('nutritional_info.protein')} />
                {errors.nutritional_info?.protein && <p className="text-xs text-error">{errors.nutritional_info.protein.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat">Fat (g)</Label>
                <Input id="fat" type="number" step="0.1" min={0} placeholder="e.g. 3.5" {...register('nutritional_info.fat')} />
                {errors.nutritional_info?.fat && <p className="text-xs text-error">{errors.nutritional_info.fat.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Carbohydrates (g)</Label>
                <Input id="carbs" type="number" step="0.1" min={0} placeholder="e.g. 4.7" {...register('nutritional_info.carbs')} />
                {errors.nutritional_info?.carbs && <p className="text-xs text-error">{errors.nutritional_info.carbs.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Image Gallery */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product Images</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center h-40 rounded-[16px] border-2 border-dashed transition-colors cursor-pointer mb-6 ${
                  isDragActive ? 'border-primary bg-surface' : 'border-border hover:border-text-muted'
                }`}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <div className="flex flex-col items-center text-text-muted">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <span className="text-sm">Uploading...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface mb-3">
                      <Upload className="h-5 w-5 text-text-muted" />
                    </div>
                    <p className="text-sm font-medium">Click or drag images to upload</p>
                    <p className="text-xs text-text-muted mt-1">PNG, JPG, WebP up to 5MB</p>
                  </>
                )}
              </div>

              {/* Gallery Grid */}
              {imageFields.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {imageFields.map((field, index) => (
                    <div
                      key={field._key}
                      className={`relative aspect-square rounded-[16px] overflow-hidden border-2 transition-colors group ${
                        field.is_primary ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={field.image_url}
                        alt="Product"
                        className="h-full w-full object-cover"
                      />
                      
                      {/* Overlay Actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="h-8 w-8 rounded-[8px] bg-white/20 hover:bg-error text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex justify-start">
                          {!field.is_primary && (
                            <button
                              type="button"
                              onClick={() => setPrimaryImage(index)}
                              className="text-xs font-medium px-2 py-1 rounded-[6px] bg-white text-text-primary hover:bg-surface-hover transition-colors shadow-sm"
                            >
                              Make Primary
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Primary Badge */}
                      {field.is_primary && (
                        <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                          <Star className="h-3 w-3 fill-current" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-surface/50 rounded-[16px]">
                  <ImageIcon className="h-8 w-8 text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">No images added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Pricing & Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input id="price" type="number" min={0} step="0.01" {...register('price', { valueAsNumber: true })} />
                {errors.price && <p className="text-xs text-error">{errors.price.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock Available *</Label>
                <Input id="stock" type="number" min={0} {...register('stock', { valueAsNumber: true })} />
                {errors.stock && <p className="text-xs text-error">{errors.stock.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visibility</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Status</Label>
                  <p className="text-xs text-text-muted">Show product in the app</p>
                </div>
                <Switch
                  checked={activeValue}
                  onCheckedChange={(checked) => setValue('active', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || uploading}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEdit ? 'Update Product' : 'Create Product'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => navigate('/products')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
