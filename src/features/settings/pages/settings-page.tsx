import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Save, Store, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader, LoadingSpinner } from '@/components/shared';
import { useSettings, useUpdateSettings } from '@/features/settings/hooks/use-settings';

interface SettingsFormValues {
  store_name: string;
  support_phone: string;
  support_email: string;
  delivery_charge: number;
  min_order_amount: number;
  free_delivery_above: number;
  accepting_orders: boolean;
}

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();

  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting, isDirty } } = useForm<SettingsFormValues>({
    defaultValues: {
      store_name: '',
      support_phone: '',
      support_email: '',
      delivery_charge: 0,
      min_order_amount: 0,
      free_delivery_above: 0,
      accepting_orders: true,
    }
  });

  const acceptingOrders = watch('accepting_orders');

  useEffect(() => {
    if (settings) {
      reset(settings as SettingsFormValues);
    }
  }, [settings, reset]);

  const onSubmit = (values: SettingsFormValues) => {
    updateMutation.mutate(values, {
      onSuccess: () => {
        reset(values); // Reset form state to clear isDirty flag
      }
    });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Settings" 
          description="Manage your business and app configuration" 
        />
        <Button 
          onClick={handleSubmit(onSubmit)} 
          disabled={!isDirty || isSubmitting || updateMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting || updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        
        {/* Business Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-text-muted" />
              Business Details
            </CardTitle>
            <CardDescription>Configure your general business information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-md">
              <Label htmlFor="store_name">Store Name</Label>
              <Input id="store_name" {...register('store_name')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="support_phone">Support Phone</Label>
                <Input id="support_phone" {...register('support_phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support_email">Support Email</Label>
                <Input id="support_email" type="email" {...register('support_email')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery & Ordering */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-text-muted" />
              Delivery & Ordering
            </CardTitle>
            <CardDescription>Configure delivery charges and order limits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-surface rounded-[12px] max-w-2xl">
              <div className="space-y-0.5">
                <Label className="text-base">Accepting New Orders</Label>
                <p className="text-sm text-text-muted">Turn off to temporarily stop customers from placing orders.</p>
              </div>
              <Switch 
                checked={acceptingOrders}
                onCheckedChange={(checked) => setValue('accepting_orders', checked, { shouldDirty: true })}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="delivery_charge">Base Delivery Charge (₹)</Label>
                <Input id="delivery_charge" type="number" min={0} {...register('delivery_charge', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_order_amount">Min Order Amount (₹)</Label>
                <Input id="min_order_amount" type="number" min={0} {...register('min_order_amount', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="free_delivery_above">Free Delivery Above (₹)</Label>
                <Input id="free_delivery_above" type="number" min={0} {...register('free_delivery_above', { valueAsNumber: true })} />
              </div>
            </div>
          </CardContent>
        </Card>
        
      </form>
    </motion.div>
  );
}
