import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared';
import { useCreateDeliveryBoy } from '@/features/delivery-boys/hooks/use-delivery-boys';

const deliveryBoySchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().regex(/^[0-9+\-\s]{7,20}$/, 'Invalid phone number'),
});

type DeliveryBoyFormValues = z.infer<typeof deliveryBoySchema>;

export function DeliveryBoyFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreateDeliveryBoy();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeliveryBoyFormValues>({
    resolver: zodResolver(deliveryBoySchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      phone: '',
    },
  });

  const onSubmit = async (values: DeliveryBoyFormValues) => {
    await createMutation.mutateAsync(values);
    navigate('/delivery-boys');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/delivery-boys')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title="Add Delivery Boy"
          description="Create a new account for a delivery boy."
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" placeholder="e.g. Rahul Kumar" {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-error">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" placeholder="e.g. +91 9876543210" {...register('phone')} />
              {errors.phone && <p className="text-xs text-error">{errors.phone.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" type="email" placeholder="rahul@delivery.com" {...register('email')} />
              {errors.email && <p className="text-xs text-error">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password *</Label>
              <Input id="password" type="password" placeholder="At least 6 characters" {...register('password')} />
              {errors.password && <p className="text-xs text-error">{errors.password.message}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => navigate('/delivery-boys')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="lg" className="flex-1" disabled={isSubmitting || createMutation.isPending}>
            {isSubmitting || createMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Create Account</>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
