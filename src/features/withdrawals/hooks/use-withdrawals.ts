import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { playNotificationChime } from '@/lib/chime';
import {
  fetchWithdrawalRequests,
  fetchWithdrawalStats,
  processWithdrawalRequest,
  fetchDeliveryBoyFinancialOverview,
  fetchDeliveryBoyWithdrawalHistory,
  type WithdrawalFilters,
} from '@/features/withdrawals/api/withdrawals.api';

export const WITHDRAWALS_KEY = ['withdrawals'];
export const WITHDRAWAL_STATS_KEY = ['withdrawals-stats'];

export function useWithdrawalRequests(filters: WithdrawalFilters = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Realtime Postgres Change subscription
    const channel = supabase
      .channel('delivery_withdrawal_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_withdrawal_requests',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            playNotificationChime();
            const newRec = payload.new as { request_number?: string; amount?: number };
            toast.info('New Withdrawal Request Received', {
              description: `${newRec.request_number || 'A new request'} for ₹${newRec.amount || 0} is awaiting review.`,
              duration: 5000,
            });
          }
          queryClient.invalidateQueries({ queryKey: WITHDRAWALS_KEY });
          queryClient.invalidateQueries({ queryKey: WITHDRAWAL_STATS_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: [...WITHDRAWALS_KEY, filters],
    queryFn: () => fetchWithdrawalRequests(filters),
  });
}

export function useWithdrawalStats() {
  return useQuery({
    queryKey: WITHDRAWAL_STATS_KEY,
    queryFn: fetchWithdrawalStats,
    refetchInterval: 30000, // Refresh every 30s as safety
  });
}

export function usePendingWithdrawalsCount() {
  const { data } = useWithdrawalStats();
  return data?.pendingCount ?? 0;
}

export function useProcessWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: processWithdrawalRequest,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: WITHDRAWALS_KEY });
      queryClient.invalidateQueries({ queryKey: WITHDRAWAL_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: ['delivery-boys'] });

      if (variables.action === 'complete') {
        toast.success(`Withdrawal marked as completed!`, {
          description: `Disbursal recorded with reference ${variables.reference || 'IMPS/UPI'}. Partner notified.`,
        });
      } else if (variables.action === 'reject') {
        toast.warning(`Withdrawal rejected`, {
          description: `Funds refunded back to partner wallet. Partner notified with reason.`,
        });
      } else if (variables.action === 'processing') {
        toast.info(`Withdrawal marked as processing`, {
          description: `Status updated to processing while transfer is clearing.`,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to process withdrawal', {
        description: error.message || 'Please check your connection and admin permissions.',
      });
    },
  });
}

export function useDeliveryBoyFinancials(deliveryBoyId?: string) {
  return useQuery({
    queryKey: ['delivery-boy-financials', deliveryBoyId],
    queryFn: () => fetchDeliveryBoyFinancialOverview(deliveryBoyId!),
    enabled: !!deliveryBoyId,
  });
}

export function useDeliveryBoyWithdrawals(deliveryBoyId?: string) {
  return useQuery({
    queryKey: ['delivery-boy-withdrawals', deliveryBoyId],
    queryFn: () => fetchDeliveryBoyWithdrawalHistory(deliveryBoyId!),
    enabled: !!deliveryBoyId,
  });
}
