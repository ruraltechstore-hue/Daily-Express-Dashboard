import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchSubscriptions,
  updateSubscriptionStatus,
} from '@/features/subscriptions/api/subscriptions.api';
import type { SubStatus } from '@/types/database';

const SUBSCRIPTIONS_KEY = ['subscriptions'];

export function useSubscriptions(page: number, pageSize: number, status?: SubStatus) {
  return useQuery({
    queryKey: [...SUBSCRIPTIONS_KEY, { page, pageSize, status }],
    queryFn: () => fetchSubscriptions(page, pageSize, status),
  });
}

export function useUpdateSubscriptionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SubStatus }) =>
      updateSubscriptionStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
      toast.success(`Subscription marked as ${variables.status}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update subscription status');
    },
  });
}
