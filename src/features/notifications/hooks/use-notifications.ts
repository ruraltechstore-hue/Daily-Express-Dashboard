import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchNotifications,
  sendNotification,
  markAsRead,
} from '@/features/notifications/api/notifications.api';

const NOTIFICATIONS_KEY = ['notifications'];

export function useNotifications(page: number, pageSize: number) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, { page, pageSize }],
    queryFn: () => fetchNotifications(page, pageSize),
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, body }: { title: string; body: string }) =>
      sendNotification(title, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      toast.success('Notification sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send notification');
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
