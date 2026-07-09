import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchOrders,
  fetchOrder,
  updateOrderStatus,
  getDeliveryBoys
} from '@/features/orders/api/orders.api';
import type { OrderStatus } from '@/types/database';

const ORDERS_KEY = ['orders'];
const DELIVERY_BOYS_KEY = ['delivery-boys', 'active'];

export function useOrders(page: number, pageSize: number, status?: OrderStatus) {
  return useQuery({
    queryKey: [...ORDERS_KEY, { page, pageSize, status }],
    queryFn: () => fetchOrders(page, pageSize, status),
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: [...ORDERS_KEY, id],
    queryFn: () => fetchOrder(id!),
    enabled: !!id,
  });
}

export function useActiveDeliveryBoys() {
  return useQuery({
    queryKey: DELIVERY_BOYS_KEY,
    queryFn: getDeliveryBoys,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, deliveryBoyId }: { id: string; status: OrderStatus; deliveryBoyId?: string }) =>
      updateOrderStatus(id, status, deliveryBoyId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY });
      toast.success(`Order marked as ${variables.status.replace(/_/g, ' ')}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update order status');
    },
  });
}
