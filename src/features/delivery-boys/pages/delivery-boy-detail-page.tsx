import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone,
  ShoppingCart,
  ChevronLeft,
  Ban,
  CheckCircle,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  Receipt,
  Check,
  Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner, PageHeader } from '@/components/shared';
import { useDeliveryBoy, useToggleDeliveryBoyStatus } from '@/features/delivery-boys/hooks/use-delivery-boys';
import { formatCurrency, formatDate, getOrderStatusColor } from '@/lib/utils';
import {
  useDeliveryBoyFinancials,
  useDeliveryBoyWithdrawals,
} from '@/features/withdrawals/hooks/use-withdrawals';
import { ProcessWithdrawalDialog } from '@/features/withdrawals/components/process-withdrawal-dialog';
import type { DeliveryWithdrawalRequest } from '@/types/database';

export function DeliveryBoyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deliveryBoy, isLoading } = useDeliveryBoy(id);
  const { data: financials, isLoading: financialsLoading } = useDeliveryBoyFinancials(id);
  const { data: withdrawals, isLoading: withdrawalsLoading } = useDeliveryBoyWithdrawals(id);
  const toggleStatusMutation = useToggleDeliveryBoyStatus();

  const [selectedWithdrawal, setSelectedWithdrawal] = useState<DeliveryWithdrawalRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (isLoading || !deliveryBoy) {
    return <LoadingSpinner />;
  }

  const handleToggleStatus = () => {
    toggleStatusMutation.mutate({ id: deliveryBoy.id, isActive: !deliveryBoy.is_active });
  };

  const wallet = financials?.wallet;
  const payoutMethods = financials?.payoutMethods || [];
  const transactions = financials?.transactions || [];

  const balance = Number(wallet?.balance) || 0;
  const cashInHand = Number(wallet?.cash_in_hand) || 0;
  const totalEarned = Number(wallet?.total_earned) || 0;
  const totalWithdrawn = Number(wallet?.total_withdrawn) || 0;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(fieldName);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/delivery-boys')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="Delivery Partner Profile"
          description={`Registered ${formatDate(deliveryBoy.created_at)}`}
          action={{
            label: deliveryBoy.is_active ? 'Deactivate' : 'Activate',
            onClick: handleToggleStatus,
            icon: deliveryBoy.is_active ? Ban : CheckCircle,
          }}
        />
      </div>

      {/* Financial Health Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
              Withdrawable Balance
            </span>
            <div className="text-2xl font-bold text-text-primary mt-1">
              {formatCurrency(balance)}
            </div>
            <span className="text-[11px] text-text-muted mt-1 block">Ready for payout</span>
          </CardContent>
        </Card>

        <Card className={`border ${cashInHand > 500 ? 'border-rose-300 bg-rose-50/40' : cashInHand > 0 ? 'border-amber-300 bg-amber-50/40' : 'border-border'}`}>
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block flex items-center justify-between">
              Cash In Hand
              {cashInHand > 500 && <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
            </span>
            <div className={`text-2xl font-bold mt-1 ${cashInHand > 500 ? 'text-rose-700' : 'text-text-primary'}`}>
              {formatCurrency(cashInHand)}
            </div>
            <span className="text-[11px] text-text-muted mt-1 block">
              {cashInHand > 0 ? 'Floating COD cash held' : 'All remitted'}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
              Lifetime Earned
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {formatCurrency(totalEarned)}
            </div>
            <span className="text-[11px] text-text-muted mt-1 block">From delivery fees</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
              Total Disbursed
            </span>
            <div className="text-2xl font-bold text-text-primary mt-1">
              {formatCurrency(totalWithdrawn)}
            </div>
            <span className="text-[11px] text-text-muted mt-1 block">Settled payouts</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile & Payout Details */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-full bg-surface text-primary flex items-center justify-center text-2xl font-semibold mb-3 overflow-hidden shadow-sm">
                  {deliveryBoy.avatar_url ? (
                    <img src={deliveryBoy.avatar_url} alt={deliveryBoy.full_name} className="h-full w-full object-cover" />
                  ) : (
                    deliveryBoy.full_name?.charAt(0) || 'D'
                  )}
                </div>
                <CardTitle className="text-lg mb-1">{deliveryBoy.full_name}</CardTitle>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Phone className="h-3.5 w-3.5" />
                  {deliveryBoy.phone}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={deliveryBoy.is_active ? 'success' : 'destructive'}>
                    {deliveryBoy.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant={deliveryBoy.is_online ? 'default' : 'outline'}>
                    {deliveryBoy.is_online ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Linked Payout Accounts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Linked Payout Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              {payoutMethods.length === 0 ? (
                <p className="text-text-muted text-center py-2">No payout methods added yet.</p>
              ) : (
                payoutMethods.map((pm: any) => (
                  <div key={pm.id} className="p-3 rounded-xl border border-border bg-surface/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {pm.method_type}
                      </Badge>
                      {pm.is_primary && (
                        <span className="text-[10px] font-semibold text-primary">Primary</span>
                      )}
                    </div>
                    {pm.method_type === 'upi' ? (
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium">{pm.upi_id}</span>
                        <button
                          onClick={() => copyToClipboard(pm.upi_id, pm.id)}
                          className="text-text-muted hover:text-text-primary p-1"
                        >
                          {copiedId === pm.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-semibold text-text-primary">{pm.bank_name || 'Bank'}</p>
                        <p className="font-mono text-text-muted">A/C: {pm.account_number}</p>
                        <p className="font-mono text-text-muted">IFSC: {pm.ifsc_code}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs (Withdrawals, Ledger, Handled Orders) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="withdrawals" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="withdrawals" className="text-xs">
                <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                Withdrawals ({withdrawals?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="ledger" className="text-xs">
                <Receipt className="h-3.5 w-3.5 mr-1" />
                Transactions ({transactions?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="orders" className="text-xs">
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                Orders ({deliveryBoy.orders?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* Withdrawals Tab */}
            <TabsContent value="withdrawals" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Payout Requests History</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => navigate('/withdrawals')}
                    >
                      View All Payouts &rarr;
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {withdrawalsLoading ? (
                    <LoadingSpinner />
                  ) : !withdrawals?.length ? (
                    <div className="py-8 text-center text-text-muted text-xs">
                      No withdrawal requests placed yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-2.5 font-semibold text-text-muted">Request #</th>
                            <th className="pb-2.5 font-semibold text-text-muted">Amount</th>
                            <th className="pb-2.5 font-semibold text-text-muted">Method</th>
                            <th className="pb-2.5 font-semibold text-text-muted">Status</th>
                            <th className="pb-2.5 font-semibold text-text-muted">Date</th>
                            <th className="pb-2.5 text-right font-semibold text-text-muted"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {withdrawals.map((w: any) => (
                            <tr key={w.id} className="hover:bg-surface/50 transition-colors">
                              <td className="py-3 font-mono font-semibold">{w.request_number}</td>
                              <td className="py-3 font-bold text-text-primary">{formatCurrency(w.amount)}</td>
                              <td className="py-3 uppercase font-mono">{w.payout_method_type}</td>
                              <td className="py-3">
                                <Badge
                                  variant={
                                    w.status === 'completed'
                                      ? 'success'
                                      : w.status === 'rejected'
                                      ? 'destructive'
                                      : w.status === 'processing'
                                      ? 'default'
                                      : 'warning'
                                  }
                                  className="text-[10px]"
                                >
                                  {w.status.toUpperCase()}
                                </Badge>
                              </td>
                              <td className="py-3 text-text-muted whitespace-nowrap">{formatDate(w.created_at)}</td>
                              <td className="py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setSelectedWithdrawal({
                                      ...w,
                                      delivery_boy: deliveryBoy,
                                    });
                                    setDialogOpen(true);
                                  }}
                                >
                                  {w.status === 'pending' ? 'Process' : 'View'}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Ledger Tab */}
            <TabsContent value="ledger" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Wallet Activity Ledger</CardTitle>
                </CardHeader>
                <CardContent>
                  {financialsLoading ? (
                    <LoadingSpinner />
                  ) : !transactions?.length ? (
                    <div className="py-8 text-center text-text-muted text-xs">
                      No transaction history recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-2.5 font-semibold text-text-muted">Type</th>
                            <th className="pb-2.5 font-semibold text-text-muted">Description</th>
                            <th className="pb-2.5 font-semibold text-text-muted">Amount</th>
                            <th className="pb-2.5 font-semibold text-text-muted">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {transactions.map((tx: any) => {
                            const isCredit = tx.type === 'earning' || tx.type === 'refund';
                            return (
                              <tr key={tx.id} className="hover:bg-surface/50 transition-colors">
                                <td className="py-3 font-semibold uppercase text-[10px]">
                                  <Badge variant="outline">{tx.type.replace('_', ' ')}</Badge>
                                </td>
                                <td className="py-3 text-text-primary max-w-xs truncate">{tx.description}</td>
                                <td className={`py-3 font-bold ${isCredit ? 'text-emerald-600' : 'text-text-primary'}`}>
                                  {isCredit ? '+' : ''}{formatCurrency(tx.amount)}
                                </td>
                                <td className="py-3 text-text-muted whitespace-nowrap">{formatDate(tx.created_at)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Handled Orders Tab */}
            <TabsContent value="orders" className="mt-4">
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
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Withdrawal Process Dialog */}
      <ProcessWithdrawalDialog
        request={selectedWithdrawal}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </motion.div>
  );
}
