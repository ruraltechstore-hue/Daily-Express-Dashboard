import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchDeliveryBoys,
  fetchDeliveryBoy,
  toggleDeliveryBoyStatus,
  createDeliveryBoy,
} from '@/features/delivery-boys/api/delivery-boys.api';

const DELIVERY_BOYS_KEY = ['delivery-boys'];

export function useDeliveryBoys(page: number, pageSize: number, search: string) {
  return useQuery({
    queryKey: [...DELIVERY_BOYS_KEY, { page, pageSize, search }],
    queryFn: () => fetchDeliveryBoys(page, pageSize, search),
  });
}

export function useDeliveryBoy(id: string | undefined) {
  return useQuery({
    queryKey: [...DELIVERY_BOYS_KEY, id],
    queryFn: () => fetchDeliveryBoy(id!),
    enabled: !!id,
  });
}

export function useToggleDeliveryBoyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleDeliveryBoyStatus(id, isActive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: DELIVERY_BOYS_KEY });
      toast.success(`Delivery Boy ${data.is_active ? 'activated' : 'deactivated'}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update delivery boy status');
    },
  });
}

export function useCreateDeliveryBoy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, any>) => createDeliveryBoy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DELIVERY_BOYS_KEY });
      toast.success('Delivery Boy created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create delivery boy');
    },
  });
}
