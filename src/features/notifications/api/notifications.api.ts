import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types/database';

export async function fetchNotifications(page = 1, pageSize = 20) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: data as Notification[], count: count ?? 0 };
}

export async function sendNotification(title: string, body: string) {
  // Normally we would invoke a Supabase Edge Function to send push notifications via FCM.
  // For the dashboard, we just insert a system log / notification record.
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      title,
      body,
      type: 'new_order', // using a default type for manual blasts
      user_id: (await supabase.auth.getUser()).data.user?.id, // sending as admin to self for now, or would be broadcast
      is_read: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markAsRead(id: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
