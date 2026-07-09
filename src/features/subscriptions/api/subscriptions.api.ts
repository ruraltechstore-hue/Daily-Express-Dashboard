import { supabase } from '@/lib/supabase';
import type { Subscription, SubStatus } from '@/types/database';

export async function fetchSubscriptions(page = 1, pageSize = 10, status?: SubStatus) {
  let query = supabase
    .from('subscriptions')
    .select(`
      *,
      customer:profiles!subscriptions_customer_id_fkey(id, full_name, phone),
      plan:subscription_plans(name),
      items:subscription_items(product_id, quantity, product:products(name, unit))
    `, { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: data as Subscription[], count: count ?? 0 };
}

export async function updateSubscriptionStatus(id: string, status: SubStatus) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
