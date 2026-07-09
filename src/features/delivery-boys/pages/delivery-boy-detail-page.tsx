import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone,
  ShoppingCart,
  ChevronLeft,
  Ban,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner, PageHeader } from '@/components/shared';
import { useDeliveryBoy, useToggleDeliveryBoyStatus } from '@/features/delivery-boys/hooks/use-delivery-boys';
import { formatCurrency, formatDate, getOrderStatusColor } from '@/lib/utils';

export function DeliveryBoyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deliveryBoy, isLoading } = useDeliveryBoy(id);
  const toggleStatusMutation = useToggleDeliveryBoyStatus();

  if (isLoading || !deliveryBoy) {
    return <LoadingSpinner />;
  }

  const handleToggleStatus = () => {
    toggleStatusMutation.mutate({ id: deliveryBoy.id, isActive: !deliveryBoy.is_active });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/delivery-boys')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title="Delivery Boy Profile"
          description={`Joined ${formatDate(deliveryBoy.created_at)}`}
          action={{
            label: deliveryBoy.is_active ? 'Deactivate' : 'Activate',
            onClick: handleToggleStatus,
            icon: deliveryBoy.is_active ? Ban : CheckCircle
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-surface text-primary flex items-center justify-center text-3xl font-semibold mb-4 overflow-hidden shadow-sm">
                  {deliveryBoy.avatar_url ? (
                    <img src={deliveryBoy.avatar_url} alt={deliveryBoy.full_name} className="h-full w-full object-cover" />
                  ) : (
                    deliveryBoy.full_name?.charAt(0) || 'D'
                  )}
                </div>
                <CardTitle className="text-xl mb-1">{deliveryBoy.full_name}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Phone className="h-4 w-4" />
                  {deliveryBoy.phone}
                </div>
                <Badge variant={deliveryBoy.is_active ? 'success' : 'destructive'} className="mt-4">
                  {deliveryBoy.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Right Column - Handled Orders */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-text-muted" />
                Handled Orders ({deliveryBoy.orders?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deliveryBoy.orders?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 font-medium text-text-muted">Order #</th>
                        <th className="pb-3 font-medium text-text-muted">Customer</th>
                        <th className="pb-3 font-medium text-text-muted">Total</th>
                        <th className="pb-3 font-medium text-text-muted">Status</th>
                        <th className="pb-3 font-medium text-text-muted"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {deliveryBoy.orders.slice(0, 10).map((order) => (
                        <tr key={order.id} className="hover:bg-surface/50 transition-colors">
                          <td className="py-3 font-medium">{order.order_number}</td>
                          <td className="py-3 text-text-muted">
                            <p>{order.customer?.full_name}</p>
                            <p className="text-xs">{order.customer?.phone}</p>
                          </td>
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
                  {deliveryBoy.orders.length > 10 && (
                    <Button variant="outline" className="w-full mt-4" onClick={() => navigate(`/orders?delivery_boy=${deliveryBoy.id}`)}>
                      View All Orders
                    </Button>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center bg-surface/50 rounded-[12px]">
                  <p className="text-sm text-text-muted">No orders handled yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </motion.div>
  );
}
