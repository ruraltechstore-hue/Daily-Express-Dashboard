import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IndianRupee,
  ShoppingCart,
  Clock,
  Users,
  ArrowRight,
  Truck,
  Plus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard, StatusBadge } from '@/components/shared';
import { formatCurrency, formatRelativeDate, getOrderStatusColor } from '@/lib/utils';
import {
  fetchDashboardStats,
  fetchRevenueChart,
  fetchTopProducts,
  fetchRecentOrders,
} from '@/features/dashboard/api/dashboard.api';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export function DashboardPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
  });

  const { data: revenueData, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboard', 'revenue-chart'],
    queryFn: () => fetchRevenueChart(7),
  });

  const { data: topProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['dashboard', 'top-products'],
    queryFn: () => fetchTopProducts(5),
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['dashboard', 'recent-orders'],
    queryFn: () => fetchRecentOrders(5),
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-text-muted text-sm mt-1">Welcome back. Here&apos;s your business overview.</p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] rounded-[20px]" />
          ))
        ) : (
          <>
            <StatCard
              title="Today's Revenue"
              value={formatCurrency(stats?.todayRevenue ?? 0)}
              change={stats?.revenueChange}
              changeLabel="vs yesterday"
              icon={IndianRupee}
              iconColor="bg-secondary/30 text-primary"
            />
            <StatCard
              title="Today's Orders"
              value={stats?.todayOrders ?? 0}
              change={stats?.ordersChange}
              changeLabel="vs yesterday"
              icon={ShoppingCart}
              iconColor="bg-accent text-success"
            />
            <StatCard
              title="Pending Orders"
              value={stats?.pendingOrders ?? 0}
              icon={Clock}
              iconColor="bg-amber-50 text-warning"
            />
            <StatCard
              title="Total Customers"
              value={stats?.totalCustomers ?? 0}
              icon={Users}
              iconColor="bg-surface text-text-primary"
            />
          </>
        )}
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
            <span className="text-xs text-text-muted">Last 7 days</span>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-[280px] rounded-[16px]" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueData ?? []}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#111111" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#111111" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECECEC" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: '1px solid #ECECEC',
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: 13,
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#111111"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Orders</CardTitle>
            <span className="text-xs text-text-muted">Last 7 days</span>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-[280px] rounded-[16px]" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueData ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECECEC" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: '1px solid #ECECEC',
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="orders" fill="#F6E7A9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-[12px]" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders?.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="flex items-center justify-between p-3 rounded-[16px] hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-surface">
                        <ShoppingCart className="h-4 w-4 text-text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{order.order_number}</p>
                        <p className="text-xs text-text-muted">
                          {(order.customer as unknown as { full_name: string })?.full_name ?? 'Customer'} • {formatRelativeDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(Number(order.total))}</p>
                      <StatusBadge
                        status={order.order_status}
                        colorClass={getOrderStatusColor(order.order_status)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products + Quick Actions */}
        <div className="space-y-4">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-[8px]" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts?.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-text-muted w-5">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-text-muted">{product.unit}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(product.totalRevenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: 'Add Product', icon: Plus, href: '/products/new' },
                { label: 'View Orders', icon: ShoppingCart, href: '/orders' },
                { label: 'Manage Team', icon: Truck, href: '/delivery-boys' },
              ].map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="h-auto py-3 flex-col gap-1.5 text-xs"
                  onClick={() => navigate(action.href)}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
