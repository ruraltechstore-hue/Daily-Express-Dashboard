import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  MapPin,
  Truck,
  CreditCard,
  User,
  Phone,
  CheckCircle2,
  Clock,
  Printer,
  ChevronLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner, PageHeader } from '@/components/shared';
import { useOrder, useUpdateOrderStatus, useActiveDeliveryBoys } from '@/features/orders/hooks/use-orders';
import { formatCurrency, formatDate, getOrderStatusColor } from '@/lib/utils';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from '@/config/constants';
import type { OrderStatus } from '@/types/database';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(id);
  const { data: deliveryBoys } = useActiveDeliveryBoys();
  const updateMutation = useUpdateOrderStatus();

  if (isLoading || !order) {
    return <LoadingSpinner />;
  }

  const handleStatusChange = (newStatus: OrderStatus) => {
    updateMutation.mutate({ id: order.id, status: newStatus });
  };

  const handleAssignDeliveryBoy = (deliveryBoyId: string) => {
    // Also mark as accepted/packed if still pending
    const newStatus = order.order_status === 'pending' ? 'accepted' : order.order_status;
    updateMutation.mutate({ id: order.id, status: newStatus, deliveryBoyId });
  };

  const isPaid = order.payment_status === 'success';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title={`Order ${order.order_number}`}
          description={formatDate(order.created_at)}
          action={{
            label: 'Print Invoice',
            onClick: () => window.print(),
            icon: Printer
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Order Status</span>
                <Badge variant="outline" className={getOrderStatusColor(order.order_status)}>
                  {ORDER_STATUS_LABELS[order.order_status]}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative flex justify-between">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-surface -z-10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${(ORDER_STATUS_FLOW.indexOf(order.order_status as any) / (ORDER_STATUS_FLOW.length - 1)) * 100}%` }}
                  />
                </div>
                {ORDER_STATUS_FLOW.map((status, index) => {
                  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.order_status as any);
                  const isCompleted = currentIndex >= index || order.order_status === 'delivered';
                  const isCurrent = order.order_status === status;
                  
                  return (
                    <div key={status} className="flex flex-col items-center gap-2 bg-white px-2">
                      <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isCompleted ? 'border-primary bg-primary text-white' : 'border-border bg-white text-text-muted'
                      } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      </div>
                      <span className={`text-xs font-medium ${isCompleted ? 'text-text-primary' : 'text-text-muted'}`}>
                        {ORDER_STATUS_LABELS[status]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Status Action */}
              <div className="mt-8 flex items-center justify-between pt-6 border-t border-border">
                <p className="text-sm text-text-muted">Update order status manually if needed.</p>
                <Select value={order.order_status} onValueChange={(v) => handleStatusChange(v as OrderStatus)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORDER_STATUS_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-text-muted" />
                Items ({order.order_items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-6">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-text-muted">{formatCurrency(item.unit_price)} × {item.quantity} {item.product_unit}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.line_total)}</p>
                  </div>
                ))}
              </div>
              <div className="bg-surface/30 p-6 space-y-3 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Subtotal</span>
                  <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Delivery Charge</span>
                  <span className="font-medium">{formatCurrency(order.delivery_charge)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Meta Details */}
        <div className="space-y-6">
          
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-text-muted" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-surface flex items-center justify-center font-semibold text-primary">
                  {order.customer?.full_name?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="font-medium">{order.customer?.full_name}</p>
                  <p className="text-sm text-text-muted flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {order.customer?.phone}
                  </p>
                </div>
              </div>
              
              {order.order_address && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium flex items-center gap-1 mb-2">
                    <MapPin className="h-3 w-3 text-text-muted" />
                    Delivery Address
                  </p>
                  <div className="text-sm text-text-muted space-y-1">
                    <p className="text-text-primary">{order.order_address.full_name}</p>
                    <p>{order.order_address.line1}</p>
                    {order.order_address.line2 && <p>{order.order_address.line2}</p>}
                    <p>{order.order_address.city}, {order.order_address.state} - {order.order_address.pincode}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-text-muted" />
                Payment Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-muted">Method</span>
                <span className="text-sm font-medium capitalize">{order.payment_method.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-muted">Status</span>
                <Badge variant={isPaid ? 'success' : 'outline'}>
                  {order.payment_status.toUpperCase()}
                </Badge>
              </div>
              {!isPaid && order.payment_method === 'cod' && order.order_status === 'delivered' && (
                <Button 
                  className="w-full mt-2" 
                  variant="outline"
                  onClick={() => {/* Mark paid RPC */}}
                >
                  Mark as Paid
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Delivery Boy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-text-muted" />
                Delivery Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.delivery_boy ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-secondary text-primary flex items-center justify-center font-semibold text-xs">
                      {order.delivery_boy.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{order.delivery_boy.full_name}</p>
                      <p className="text-xs text-text-muted">{order.delivery_boy.phone}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleAssignDeliveryBoy('')}>
                    Reassign
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-text-muted">No delivery boy assigned yet.</p>
                  <Select onValueChange={handleAssignDeliveryBoy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign Delivery Boy" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryBoys?.map((boy) => (
                        <SelectItem key={boy.id} value={boy.id}>
                          {boy.full_name} ({boy.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
          
        </div>
      </div>
    </motion.div>
  );
}
