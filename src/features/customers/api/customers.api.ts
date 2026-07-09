import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export async function fetchCustomers(page = 1, pageSize = 10, search = '') {
  let query = supabase
    .from('profiles')
    .select(`
      id, full_name, phone, avatar_url, is_active, created_at, active_order_count,
      addresses:addresses(count),
      orders:orders!orders_customer_id_fkey(count)
    `, { count: 'exact' })
    .eq('role', 'customer');

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data, count: count ?? 0 };
}

export async function fetchCustomer(id: string) {
  const { data: customer, error } = await supabase
    .from('profiles')
    .select(`
      *,
      addresses(*),
      orders:orders!orders_customer_id_fkey(
        id, order_number, total, order_status, created_at, payment_status
      ),
      subscriptions(
        id, status, frequency, next_order_date,
        plan:subscription_plans(name)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  
  // Sort orders descending
  if (customer.orders) {
    customer.orders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return customer as Profile & { 
    addresses: any[]; 
    orders: any[]; 
    subscriptions: any[]; 
  };
}

export async function toggleCustomerStatus(id: string, isActive: boolean) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
