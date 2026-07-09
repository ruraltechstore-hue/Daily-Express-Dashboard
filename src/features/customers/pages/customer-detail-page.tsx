import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone,
  MapPin,
  ShoppingCart,
  CalendarClock,
  Clock,
  ChevronLeft,
  Ban,
  CheckCircle,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner, PageHeader } from '@/components/shared';
import { useCustomer, useToggleCustomerStatus } from '@/features/customers/hooks/use-customers';
import { formatCurrency, formatDate, getOrderStatusColor } from '@/lib/utils';
import { SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_FREQUENCY_LABELS } from '@/config/constants';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id);
  const toggleStatusMutation = useToggleCustomerStatus();

  if (isLoading || !customer) {
    return <LoadingSpinner />;
  }

  const handleToggleStatus = () => {
    toggleStatusMutation.mutate({ id: customer.id, isActive: !customer.is_active });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-6xl">
      <div className="flex w-full items-center gap-4">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/customers')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <PageHeader 
            title="Customer Profile"
            description={`Joined ${formatDate(customer.created_at)}`}
            action={{
              label: customer.is_active ? 'Ban Customer' : 'Activate Customer',
              onClick: handleToggleStatus,
              icon: customer.is_active ? Ban : CheckCircle
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-surface text-primary flex items-center justify-center text-3xl font-semibold mb-4 overflow-hidden shadow-sm">
                  {customer.avatar_url ? (
                    <img src={customer.avatar_url} alt={customer.full_name} className="h-full w-full object-cover" />
                  ) : (
                    customer.full_name?.charAt(0) || 'C'
                  )}
                </div>
                <CardTitle className="text-xl mb-1">{customer.full_name}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Phone className="h-4 w-4" />
                  {customer.phone}
                </div>
                <Badge variant={customer.is_active ? 'success' : 'destructive'} className="mt-4">
                  {customer.is_active ? 'Active' : 'Banned'}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-text-muted" />
                Addresses ({customer.addresses?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.addresses?.length ? (
                customer.addresses.map((addr) => (
                  <div key={addr.id} className="p-4 rounded-[12px] bg-surface relative">
                    {addr.is_default && (
                      <Badge className="absolute top-2 right-2 bg-primary/10 text-primary hover:bg-primary/20 border-none">
                        Default
                      </Badge>
                    )}
                    <p className="font-medium text-sm mb-1">{addr.label || 'Home'}</p>
                    <p className="text-xs text-text-muted">{addr.line1}</p>
                    {addr.line2 && <p className="text-xs text-text-muted">{addr.line2}</p>}
                    <p className="text-xs text-text-muted">{addr.city}, {addr.state} - {addr.pincode}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">No addresses saved.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Orders & Subscriptions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Subscriptions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-text-muted" />
                Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.subscriptions?.length ? (
                <div className="space-y-3">
                  {customer.subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-4 rounded-[12px] border border-border">
                      <div>
                        <p className="font-medium text-sm">{sub.plan?.name || 'Custom Plan'}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                          <Clock className="h-3 w-3" />
                          <span>{SUBSCRIPTION_FREQUENCY_LABELS[sub.frequency]}</span>
                          <span>•</span>
                          <span>Next: {formatDate(sub.next_order_date)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={
                          sub.status === 'active' ? 'border-success text-success bg-success/10' :
                          sub.status === 'paused' ? 'border-warning text-warning bg-warning/10' :
                          'border-error text-error bg-error/10'
                        }>
                          {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/subscriptions`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center bg-surface/50 rounded-[12px]">
                  <p className="text-sm text-text-muted">No active subscriptions.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-text-muted" />
                Order History ({customer.orders?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.orders?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 font-medium text-text-muted">Order #</th>
                        <th className="pb-3 font-medium text-text-muted">Date</th>
                        <th className="pb-3 font-medium text-text-muted">Total</th>
                        <th className="pb-3 font-medium text-text-muted">Status</th>
                        <th className="pb-3 font-medium text-text-muted"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {customer.orders.slice(0, 10).map((order) => (
                        <tr key={order.id} className="hover:bg-surface/50 transition-colors">
                          <td className="py-3 font-medium">{order.order_number}</td>
                          <td className="py-3 text-text-muted">{formatDate(order.created_at)}</td>
                          <td className="py-3">{formatCurrency(order.total)}</td>
                          <td className="py-3">
                            <Badge variant="outline" className={getOrderStatusColor(order.order_status)}>
                              {order.order_status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${order.id}`)}>
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {customer.orders.length > 10 && (
                    <Button variant="outline" className="w-full mt-4" onClick={() => navigate(`/orders?customer=${customer.id}`)}>
                      View All Orders
                    </Button>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center bg-surface/50 rounded-[12px]">
                  <p className="text-sm text-text-muted">No orders found.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </motion.div>
  );
}
