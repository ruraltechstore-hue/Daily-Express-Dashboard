import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/types/database';

export async function fetchOrders(
  page = 1,
  pageSize = 10,
  status?: OrderStatus
) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      customer:profiles!orders_customer_id_fkey(id, full_name, phone),
      delivery_boy:profiles!orders_delivery_boy_id_fkey(id, full_name, phone),
      order_address:order_addresses(*)
    `, { count: 'exact' });

  if (status) {
    query = query.eq('order_status', status);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: data as Order[], count: count ?? 0 };
}

export async function fetchOrder(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:profiles!orders_customer_id_fkey(id, full_name, phone, avatar_url),
      delivery_boy:profiles!orders_delivery_boy_id_fkey(id, full_name, phone),
      order_address:order_addresses(*),
      order_items(*),
      status_history:order_status_history(*, changed_by_profile:profiles!order_status_history_changed_by_fkey(full_name))
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  
  if (data.status_history) {
    data.status_history.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  
  return data as Order;
}

export async function updateOrderStatus(id: string, status: OrderStatus, deliveryBoyId?: string) {
  if (deliveryBoyId) {
    const { error: assignError } = await supabase
      .from('orders')
      .update({ delivery_boy_id: deliveryBoyId })
      .eq('id', id);

    if (assignError) throw assignError;
  }

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ order_status: status })
    .eq('id', id)
    .select()
    .single();

  if (updateError) throw updateError;
  return updated as Order;
}

export async function getDeliveryBoys() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'delivery')
    .eq('is_active', true)
    .order('full_name');

  if (error) throw error;
  return data;
}
