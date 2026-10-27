import { useState } from 'react';
import {
  Copy,
  Check,
  QrCode,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DeliveryWithdrawalRequest } from '@/types/database';
import { useProcessWithdrawal } from '@/features/withdrawals/hooks/use-withdrawals';

interface ProcessWithdrawalDialogProps {
  request: DeliveryWithdrawalRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProcessWithdrawalDialog({
  request,
  open,
  onOpenChange,
}: ProcessWithdrawalDialogProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reference, setReference] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const processMutation = useProcessWithdrawal();

  if (!request) return null;

  const isPending = request.status === 'pending';
  const isProcessing = request.status === 'processing';
  const canAct = isPending || isProcessing;

  const wallet = Array.isArray(request.delivery_boy?.delivery_wallets)
    ? request.delivery_boy?.delivery_wallets[0]
    : request.delivery_boy?.delivery_wallets;

  const cashInHand = Number(wallet?.cash_in_hand) || 0;
  const balance = Number(wallet?.balance) || 0;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleGenerateImpsRef = () => {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const random = Math.floor(1000 + Math.random() * 9000);
    setReference(`IMPS-${timestamp}-${random}`);
  };

  const handleComplete = () => {
    processMutation.mutate(
      {
        requestId: request.id,
        action: 'complete',
        reference: reference.trim() || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setRejectMode(false);
          setReference('');
        },
      }
    );
  };

  const handleProcessing = () => {
    processMutation.mutate(
      {
        requestId: request.id,
        action: 'processing',
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please specify a rejection reason.');
      return;
    }
    processMutation.mutate(
      {
        requestId: request.id,
        action: 'reject',
        notes: rejectionReason.trim(),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setRejectMode(false);
          setRejectionReason('');
        },
      }
    );
  };

  const upiId = request.payout_details?.upi_id || '';
  const upiPayUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(request.delivery_boy?.full_name || 'Rider')}&am=${request.amount}&cu=INR&tn=${encodeURIComponent(`Payout ${request.request_number}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiPayUrl)}`;

  const quickRejectionReasons = [
    'Invalid UPI ID',
    'Bank details mismatch',
    'Deposit cash in hand first',
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) {
          setRejectMode(false);
          setShowQr(false);
        }
      }}
    >
      <DialogContent className="max-w-md p-6 rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-mono font-medium">{request.request_number}</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span
                className={`h-2 w-2 rounded-full ${
                  request.status === 'completed'
                    ? 'bg-emerald-500'
                    : request.status === 'rejected'
                    ? 'bg-rose-500'
                    : request.status === 'processing'
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
              />
              <span className="capitalize">{request.status}</span>
            </span>
          </div>

          <DialogTitle className="text-3xl font-extrabold text-text-primary tracking-tight pt-1">
            {formatCurrency(request.amount)}
          </DialogTitle>

          <p className="text-xs text-text-muted">
            Requested {formatDate(request.created_at)}
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Rider summary row */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface/70 border border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={request.delivery_boy?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {request.delivery_boy?.full_name?.charAt(0) || 'D'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-semibold text-text-primary">
                  {request.delivery_boy?.full_name}
                </p>
                <p className="text-[11px] text-text-muted">
                  {request.delivery_boy?.phone}
                </p>
              </div>
            </div>

            <div className="text-right">
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {request.payout_method_type}
              </Badge>
            </div>
          </div>

          {/* Floating cash warning if applicable */}
          {cashInHand > 0 && isPending && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Rider currently holds <strong>{formatCurrency(cashInHand)}</strong> in collected COD cash.
              </span>
            </div>
          )}

          {/* Payout Destination Info */}
          <div className="p-3.5 rounded-xl border border-border bg-white space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted font-medium">Send Payout To</span>
              {request.payout_method_type === 'upi' && (
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="text-primary hover:underline text-xs flex items-center gap-1 font-medium"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {showQr ? 'Hide QR' : 'Scan QR'}
                </button>
              )}
            </div>

            {request.payout_method_type === 'upi' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface/50 border border-border">
                  <span className="font-mono text-xs font-bold text-text-primary">
                    {request.payout_details?.upi_id || 'N/A'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-text-muted hover:text-text-primary"
                    onClick={() =>
                      copyToClipboard(request.payout_details?.upi_id || '', 'upi')
                    }
                  >
                    {copiedField === 'upi' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedField === 'upi' ? 'Copied' : 'Copy'}
                  </Button>
                </div>

                {showQr && (
                  <div className="p-3 bg-surface/50 rounded-xl flex flex-col items-center justify-center text-center">
                    <img
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      className="h-36 w-36 object-contain rounded-lg border border-border bg-white p-1"
                    />
                    <p className="text-[11px] text-text-muted mt-1.5">
                      Scan with any UPI app to pay {formatCurrency(request.amount)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Bank:</span>
                  <span className="font-medium text-text-primary">
                    {request.payout_details?.bank_name || 'Bank'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Account:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-medium">
                      {request.payout_details?.full_account_number ||
                        request.payout_details?.account_number ||
                        'N/A'}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          request.payout_details?.full_account_number ||
                            request.payout_details?.account_number ||
                            '',
                          'acct'
                        )
                      }
                      className="text-text-muted hover:text-text-primary"
                    >
                      {copiedField === 'acct' ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">IFSC:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-medium">
                      {request.payout_details?.ifsc_code || 'N/A'}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(request.payout_details?.ifsc_code || '', 'ifsc')
                      }
                      className="text-text-muted hover:text-text-primary"
                    >
                      {copiedField === 'ifsc' ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Expandable Ledger details */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-[11px] text-text-muted hover:text-text-primary py-1 px-1 transition-colors"
          >
            <span>Rider balance context</span>
            {showDetails ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {showDetails && (
            <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-surface/50 border border-border">
              <div>
                <span className="text-text-muted text-[10px] block">Wallet Balance</span>
                <span className="font-bold text-text-primary">{formatCurrency(balance)}</span>
              </div>
              <div>
                <span className="text-text-muted text-[10px] block">Cash In Hand</span>
                <span className="font-bold text-text-primary">{formatCurrency(cashInHand)}</span>
              </div>
            </div>
          )}

          {/* Action Zone */}
          {canAct ? (
            !rejectMode ? (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reference" className="text-xs text-text-muted">
                      UTR / Transfer Reference (Optional)
                    </Label>
                    <button
                      type="button"
                      onClick={handleGenerateImpsRef}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <Input
                    id="reference"
                    placeholder="e.g. UTR / IMPS reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    onClick={handleComplete}
                    disabled={processMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-10 rounded-xl"
                  >
                    {processMutation.isPending
                      ? 'Processing...'
                      : `Approve & Mark as Paid (${formatCurrency(request.amount)})`}
                  </Button>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRejectMode(true)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
                    >
                      Reject Request
                    </Button>

                    {isPending && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleProcessing}
                        disabled={processMutation.isPending}
                        className="text-xs text-text-muted hover:text-text-primary h-8"
                      >
                        Mark as Processing
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Reject Sub-view */
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-600">
                    Reject & Refund to Wallet
                  </span>
                  <button
                    type="button"
                    onClick={() => setRejectMode(false)}
                    className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                </div>

                <p className="text-[11px] text-text-muted">
                  Funds will be automatically refunded back to the partner&apos;s wallet balance.
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {quickRejectionReasons.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRejectionReason(r)}
                      className="text-[10px] px-2 py-1 rounded-md border border-border bg-surface hover:bg-surface-hover text-text-secondary"
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <Input
                  placeholder="Reason for rejection (shown to rider)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="h-9 text-xs"
                />

                <Button
                  onClick={handleReject}
                  disabled={processMutation.isPending || !rejectionReason.trim()}
                  variant="destructive"
                  className="w-full text-xs h-9 rounded-xl"
                >
                  {processMutation.isPending ? 'Refunding...' : 'Confirm Rejection & Refund'}
                </Button>
              </div>
            )
          ) : (
            /* Completed / Rejected record */
            <div className="p-3 rounded-xl border border-border bg-surface/50 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Settled On:</span>
                <span>{request.processed_at ? new Date(request.processed_at).toLocaleString() : 'N/A'}</span>
              </div>
              {request.transaction_reference && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Reference:</span>
                  <span className="font-mono font-medium">{request.transaction_reference}</span>
                </div>
              )}
              {request.rejection_reason && (
                <div className="pt-1 text-rose-600">
                  <span className="font-medium">Reason: </span>
                  {request.rejection_reason}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
