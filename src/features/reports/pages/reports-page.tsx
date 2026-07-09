import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Download, Calendar as CalendarIcon, TrendingUp, ShoppingBag, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner, PageHeader } from '@/components/shared';
import { useReportsData } from '@/features/reports/hooks/use-reports';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ReportsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  
  // Calculate date range based on selection
  const to = new Date();
  const from = new Date();
  if (timeRange === '7d') from.setDate(from.getDate() - 7);
  else if (timeRange === '30d') from.setDate(from.getDate() - 30);
  else if (timeRange === '90d') from.setDate(from.getDate() - 90);
  else if (timeRange === '365d') from.setDate(from.getDate() - 365);

  const { data, isLoading } = useReportsData({ from, to });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const handleExport = () => {
    // Simple CSV export logic for demonstration
    if (!data) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Revenue,Orders\n"
      + data.dailyData.map(e => `${e.date},${e.revenue},${e.orders}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Reports & Analytics" 
          description="Track your business performance and sales trends" 
        />
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] bg-white">
              <CalendarIcon className="h-4 w-4 mr-2 text-text-muted" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="365d">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(data?.summary.totalRevenue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Total Orders</p>
                <p className="text-2xl font-bold">{data?.summary.totalOrders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Average Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency(data?.summary.averageOrderValue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.dailyData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => formatDate(val)}
                    style={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickFormatter={(val) => `₹${val}`}
                    style={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                    labelFormatter={(label) => formatDate(label as string)}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.dailyData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => formatDate(val)}
                    style={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    style={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(value: any) => [value, 'Orders']}
                    labelFormatter={(label) => formatDate(label as string)}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: 'var(--color-surface)' }}
                  />
                  <Bar dataKey="orders" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Performing Products</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.topProducts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-text-muted">Product Name</th>
                    <th className="pb-3 font-medium text-text-muted text-right">Units Sold</th>
                    <th className="pb-3 font-medium text-text-muted text-right">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.topProducts.map((product) => (
                    <tr key={product.name} className="hover:bg-surface/50 transition-colors">
                      <td className="py-4 font-medium">{product.name}</td>
                      <td className="py-4 text-right">{product.quantity}</td>
                      <td className="py-4 text-right font-medium text-primary">{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center text-text-muted">
              No sales data for the selected period.
            </div>
          )}
        </CardContent>
      </Card>

    </motion.div>
  );
}
