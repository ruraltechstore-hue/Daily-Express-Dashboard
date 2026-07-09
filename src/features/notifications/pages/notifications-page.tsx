import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PageHeader, EmptyState } from '@/components/shared';
import { useNotifications, useSendNotification, useMarkAsRead } from '@/features/notifications/hooks/use-notifications';
import { formatRelativeDate } from '@/lib/utils';

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data, isLoading } = useNotifications(page, pageSize);
  const sendMutation = useSendNotification();
  const markAsReadMutation = useMarkAsRead();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    await sendMutation.mutateAsync({ title, body });
    setIsComposeOpen(false);
    setTitle('');
    setBody('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
      <PageHeader
        title="Notifications"
        description="View system notifications and send push messages"
      />

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Notification History</h2>
        
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Push Notification</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSend} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Special Offer!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  placeholder="Type your message here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsComposeOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={sendMutation.isPending || !title || !body}>
                  {sendMutation.isPending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[16px] w-full" />
          ))
        ) : !data?.data.length ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You don't have any notifications yet."
          />
        ) : (
          <>
            {data.data.map((notification) => (
              <Card key={notification.id} className={`transition-colors ${!notification.is_read ? 'bg-primary/5 border-primary/20' : ''}`}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!notification.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-text-primary">{notification.title}</h4>
                      <span className="text-xs text-text-muted">{formatRelativeDate(notification.created_at)}</span>
                    </div>
                    <p className="text-sm text-text-muted mt-1">{notification.body}</p>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-text-muted hover:text-primary"
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-text-muted">
                Total {data.count} notifications
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-text-muted">
                  Page {page} of {Math.ceil(data.count / pageSize) || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(data.count / pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
