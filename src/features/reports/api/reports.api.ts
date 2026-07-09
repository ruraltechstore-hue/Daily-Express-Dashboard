import { supabase } from '@/lib/supabase';

// For simplicity, we aggregate data on the client side from recent orders.
// In a large production app, this should be done via SQL RPCs or materialized views.
export async function fetchReportsData(dateRange: { from: Date; to: Date }) {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total, created_at, order_items(product_name, quantity, line_total)')
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())
    .neq('order_status', 'cancelled');

  if (error) throw error;

  // Process data for charts
  
  // 1. Daily Revenue & Orders
  const dailyDataMap = new Map<string, { date: string; revenue: number; orders: number }>();
  
  // 2. Top Products
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  for (const order of orders) {
    const dateStr = new Date(order.created_at).toISOString().split('T')[0];
    
    // Daily aggregations
    if (!dailyDataMap.has(dateStr)) {
      dailyDataMap.set(dateStr, { date: dateStr, revenue: 0, orders: 0 });
    }
    const dayStat = dailyDataMap.get(dateStr)!;
    dayStat.revenue += order.total;
    dayStat.orders += 1;

    // Product aggregations
    for (const item of order.order_items) {
      if (!productMap.has(item.product_name)) {
        productMap.set(item.product_name, { name: item.product_name, quantity: 0, revenue: 0 });
      }
      const pStat = productMap.get(item.product_name)!;
      pStat.quantity += item.quantity;
      pStat.revenue += item.line_total;
    }
  }

  // Sort daily data chronologically
  const dailyData = Array.from(dailyDataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  
  // Sort top products by revenue
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;

  return {
    dailyData,
    topProducts,
    summary: {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    }
  };
}
