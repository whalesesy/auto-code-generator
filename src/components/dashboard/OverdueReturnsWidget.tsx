import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Clock, Bell } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface OverdueRequest {
  id: string;
  device_type: string;
  device_model: string | null;
  quantity: number;
  issued_at: string;
  expected_return_date: string;
  duration: string;
  requester_id: string;
  profiles: { full_name: string; email: string } | null;
}

export function OverdueReturnsWidget() {
  const { role, user } = useAuth();
  const [overdueRequests, setOverdueRequests] = useState<OverdueRequest[]>([]);
  const [upcomingReturns, setUpcomingReturns] = useState<OverdueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchOverdueReturns();
  }, [user, role]);

  const fetchOverdueReturns = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Build base query - staff sees only their devices, admins/approvers see all
    let overdueQuery = supabase
      .from('device_requests')
      .select('id, device_type, device_model, quantity, issued_at, expected_return_date, duration, requester_id, profiles!device_requests_requester_id_profiles_fkey(full_name, email)')
      .eq('status', 'issued')
      .lt('expected_return_date', today)
      .order('expected_return_date', { ascending: true });

    let upcomingQuery = supabase
      .from('device_requests')
      .select('id, device_type, device_model, quantity, issued_at, expected_return_date, duration, requester_id, profiles!device_requests_requester_id_profiles_fkey(full_name, email)')
      .eq('status', 'issued')
      .gte('expected_return_date', today)
      .lte('expected_return_date', nextWeek.toISOString().split('T')[0])
      .order('expected_return_date', { ascending: true });

    // Filter by user if staff role
    if (role === 'staff' && user?.id) {
      overdueQuery = overdueQuery.eq('requester_id', user.id);
      upcomingQuery = upcomingQuery.eq('requester_id', user.id);
    }

    const { data: overdue, error: overdueError } = await overdueQuery;
    if (overdueError) console.error('Error fetching overdue:', overdueError);
    if (overdue) setOverdueRequests(overdue as any);

    const { data: upcoming, error: upcomingError } = await upcomingQuery;
    if (upcomingError) console.error('Error fetching upcoming:', upcomingError);
    if (upcoming) setUpcomingReturns(upcoming as any);
    
    setLoading(false);
  };

  const sendReminderNotification = async (request: OverdueRequest) => {
    setSendingReminder(request.id);
    
    try {
      const daysOverdue = differenceInDays(new Date(), new Date(request.expected_return_date));
      const isOverdue = daysOverdue > 0;
      
      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: request.requester_id,
        title: isOverdue ? 'Overdue Device Return Reminder' : 'Upcoming Device Return Reminder',
        message: isOverdue 
          ? `Your ${request.device_type} is ${daysOverdue} day(s) overdue for return. Please return it as soon as possible.`
          : `Reminder: Your ${request.device_type} is due for return on ${format(new Date(request.expected_return_date), 'MMM d, yyyy')}.`,
        type: isOverdue ? 'warning' : 'info',
        related_request_id: request.id,
      });

      toast({
        title: 'Reminder sent!',
        description: `Notification sent to ${request.profiles?.full_name || 'user'}.`,
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reminder notification.',
        variant: 'destructive',
      });
    }
    
    setSendingReminder(null);
  };

  const getDaysInfo = (expectedDate: string) => {
    const days = differenceInDays(new Date(expectedDate), new Date());
    if (days < 0) {
      return { text: `${Math.abs(days)} day(s) overdue`, variant: 'destructive' as const };
    } else if (days === 0) {
      return { text: 'Due today', variant: 'secondary' as const };
    } else {
      return { text: `${days} day(s) remaining`, variant: 'outline' as const };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Device Returns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  // Show for all roles - staff sees their own, admins/approvers see all
  const canSendReminders = role === 'admin' || role === 'approver';

  const totalOverdue = overdueRequests.length;
  const totalUpcoming = upcomingReturns.length;

  return (
    <Card className={totalOverdue > 0 ? 'border-destructive/50 bg-destructive/5' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${totalOverdue > 0 ? 'text-destructive' : 'text-yellow-500'}`} />
            Device Returns Tracking
          </div>
          <div className="flex gap-2">
            {totalOverdue > 0 && (
              <Badge variant="destructive">{totalOverdue} Overdue</Badge>
            )}
            {totalUpcoming > 0 && (
              <Badge variant="secondary">{totalUpcoming} Due Soon</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalOverdue === 0 && totalUpcoming === 0 ? (
          <p className="text-center text-muted-foreground py-4">No devices pending return</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueRequests.map((request) => {
                  const daysInfo = getDaysInfo(request.expected_return_date);
                  return (
                    <TableRow key={request.id} className="bg-destructive/5">
                      <TableCell className="font-medium">
                        {request.profiles?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {request.device_type}
                        {request.device_model && <span className="text-muted-foreground text-xs ml-1">({request.device_model})</span>}
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.expected_return_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={daysInfo.variant}>{daysInfo.text}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canSendReminders && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendReminderNotification(request)}
                            disabled={sendingReminder === request.id}
                          >
                            <Bell className="h-4 w-4 mr-1" />
                            {sendingReminder === request.id ? 'Sending...' : 'Remind'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {upcomingReturns.map((request) => {
                  const daysInfo = getDaysInfo(request.expected_return_date);
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.profiles?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {request.device_type}
                        {request.device_model && <span className="text-muted-foreground text-xs ml-1">({request.device_model})</span>}
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.expected_return_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={daysInfo.variant}>{daysInfo.text}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canSendReminders && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => sendReminderNotification(request)}
                            disabled={sendingReminder === request.id}
                          >
                            <Bell className="h-4 w-4 mr-1" />
                            {sendingReminder === request.id ? 'Sending...' : 'Remind'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
