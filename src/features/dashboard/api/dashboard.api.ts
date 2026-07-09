import { supabase } from '@/lib/supabase';
import type { DashboardStats, RevenueDataPoint, TopProduct } from '@/types/database';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  const yesterdayStart = startOfDay(subDays(today, 1)).toISOString();
  const yesterdayEnd = endOfDay(subDays(today, 1)).toISOString();

  const { data: todayOrders, error: todayError } = await supabase
    .from('orders')
    .select('total')
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd);

  if (todayError) throw todayError;

  const { data: yesterdayOrders, error: yesterdayError } = await supabase
    .from('orders')
    .select('total')
    .gte('created_at', yesterdayStart)
    .lte('created_at', yesterdayEnd);

  if (yesterdayError) throw yesterdayError;

  const { count: pendingOrders, error: pendingError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('order_status', 'pending');

  if (pendingError) throw pendingError;

  const { count: totalCustomers, error: customersError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer');

  if (customersError) throw customersError;

  const todayRevenue = todayOrders?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0;
  const yesterdayRevenue = yesterdayOrders?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0;
  const revenueChange = yesterdayRevenue > 0
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : 0;

  const todayCount = todayOrders?.length ?? 0;
  const yesterdayCount = yesterdayOrders?.length ?? 0;
  const ordersChange = yesterdayCount > 0
    ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
    : 0;

  return {
    todayRevenue,
    todayOrders: todayCount,
    pendingOrders: pendingOrders ?? 0,
    totalCustomers: totalCustomers ?? 0,
    revenueChange,
    ordersChange,
  };
}

export async function fetchRevenueChart(days: number = 7): Promise<RevenueDataPoint[]> {
  const since = subDays(new Date(), days).toISOString();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('total, created_at')
    .gte('created_at', since)
    .neq('order_status', 'cancelled')
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!orders) return [];

  // Group by date
  const grouped = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
    grouped.set(date, { revenue: 0, orders: 0 });
  }

  for (const order of orders) {
    const date = format(new Date(order.created_at), 'yyyy-MM-dd');
    const existing = grouped.get(date) ?? { revenue: 0, orders: 0 };
    existing.revenue += Number(order.total);
    existing.orders += 1;
    grouped.set(date, existing);
  }

  return Array.from(grouped.entries()).map(([date, data]) => ({
    date: format(new Date(date), 'dd MMM'),
    revenue: data.revenue,
    orders: data.orders,
  }));
}

export async function fetchTopProducts(limit: number = 5): Promise<TopProduct[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      product_id,
      product_name,
      product_unit,
      quantity,
      line_total
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;
  if (!data) return [];

  // Aggregate
  const map = new Map<string, TopProduct>();
  for (const item of data) {
    const existing = map.get(item.product_id) ?? {
      id: item.product_id,
      name: item.product_name,
      unit: item.product_unit,
      totalQuantity: 0,
      totalRevenue: 0,
    };
    existing.totalQuantity += item.quantity;
    existing.totalRevenue += Number(item.line_total);
    map.set(item.product_id, existing);
  }

  return Array.from(map.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

export async function fetchRecentOrders(limit: number = 5) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total,
      order_status,
      payment_method,
      created_at,
      customer:profiles!orders_customer_id_fkey(full_name, phone)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
