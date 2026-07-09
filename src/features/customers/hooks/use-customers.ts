import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchCustomers,
  fetchCustomer,
  toggleCustomerStatus,
} from '@/features/customers/api/customers.api';

const CUSTOMERS_KEY = ['customers'];

export function useCustomers(page: number, pageSize: number, search: string) {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, { page, pageSize, search }],
    queryFn: () => fetchCustomers(page, pageSize, search),
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, id],
    queryFn: () => fetchCustomer(id!),
    enabled: !!id,
  });
}

export function useToggleCustomerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleCustomerStatus(id, isActive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      toast.success(`Customer ${data.is_active ? 'activated' : 'deactivated'}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update customer status');
    },
  });
}
