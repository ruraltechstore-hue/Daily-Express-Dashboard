import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export async function fetchDeliveryBoys(page = 1, pageSize = 10, search = '') {
  let query = supabase
    .from('profiles')
    .select(`
      id, full_name, phone, avatar_url, is_active, created_at,
      orders:orders!orders_delivery_boy_id_fkey(count)
    `, { count: 'exact' })
    .eq('role', 'delivery');

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order('full_name', { ascending: true })
    .range(from, to);

  if (error) throw error;
  return { data, count: count ?? 0 };
}

export async function fetchDeliveryBoy(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      orders:orders!orders_delivery_boy_id_fkey(
        id, order_number, total, order_status, created_at, payment_status,
        customer:profiles!orders_customer_id_fkey(full_name, phone)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  if (data.orders) {
    data.orders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return data as Profile & { orders: any[] };
}

export async function toggleDeliveryBoyStatus(id: string, isActive: boolean) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createDeliveryBoy(payload: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke('create-delivery-boy', {
    body: payload
  });
  
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
