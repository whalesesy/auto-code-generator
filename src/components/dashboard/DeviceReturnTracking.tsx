import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, RotateCcw, CheckCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface IssuedRequest {
  id: string;
  device_type: string;
  device_model: string | null;
  quantity: number;
  issued_at: string;
  expected_return_date: string | null;
  duration: string;
  requester_id: string;
  profiles: { full_name: string; email: string } | null;
  request_tickets: { ticket_number: string }[];
}

export function DeviceReturnTracking() {
  const { role, user } = useAuth();
  const [issuedRequests, setIssuedRequests] = useState<IssuedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<IssuedRequest | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) fetchIssuedDevices();
  }, [user, role]);

  const fetchIssuedDevices = async () => {
    let query = supabase
      .from('device_requests')
      .select(`
        id, device_type, device_model, quantity, issued_at, expected_return_date, duration, requester_id,
        profiles!device_requests_requester_id_profiles_fkey(full_name, email),
        request_tickets(ticket_number)
      `)
      .eq('status', 'issued')
      .order('expected_return_date', { ascending: true });

    // Filter by user if staff role
    if (role === 'staff' && user?.id) {
      query = query.eq('requester_id', user.id);
    }

    const { data, error } = await query;
    if (error) console.error('Error fetching issued devices:', error);
    if (data) setIssuedRequests(data as any);
    setLoading(false);
  };

  const handleMarkAsReturned = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    const { error } = await supabase
      .from('device_requests')
      .update({
        status: 'returned',
        returned_at: new Date().toISOString(),
        approver_comments: returnNotes ? `Return notes: ${returnNotes}` : null,
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Log audit entry
      const { data: ticket } = await supabase
        .from('request_tickets')
        .select('id')
        .eq('request_id', selectedRequest.id)
        .maybeSingle();

      if (ticket) {
        await supabase.from('ticket_audit_log').insert({
          ticket_id: ticket.id,
          action: 'returned',
          performed_by: user?.id,
          details: `Device marked as returned. Notes: ${returnNotes || 'None'}`,
          encrypted_details: btoa(unescape(encodeURIComponent(`Device returned. Notes: ${returnNotes || 'None'}`))),
        });

        await supabase.from('request_tickets')
          .update({ status: 'closed' })
          .eq('id', ticket.id);
      }

      // Notify the user
      await supabase.from('notifications').insert({
        user_id: selectedRequest.requester_id,
        title: 'Device Returned',
        message: `Your ${selectedRequest.device_type} has been marked as returned. Thank you!`,
        type: 'success',
        related_request_id: selectedRequest.id,
      });

      toast({ title: 'Device marked as returned!', description: 'The request has been updated.' });
      fetchIssuedDevices();
    }

    setSelectedRequest(null);
    setReturnNotes('');
    setProcessing(false);
  };

  const getDaysInfo = (expectedDate: string | null) => {
    if (!expectedDate) return { text: 'No due date', variant: 'outline' as const };
    const days = differenceInDays(new Date(expectedDate), new Date());
    if (days < 0) {
      return { text: `${Math.abs(days)} day(s) overdue`, variant: 'destructive' as const };
    } else if (days === 0) {
      return { text: 'Due today', variant: 'secondary' as const };
    } else {
      return { text: `${days} day(s) left`, variant: 'outline' as const };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Device Return Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  // Show for all roles - staff sees their own, admins/approvers see all and can mark as returned
  const canMarkReturned = role === 'admin' || role === 'approver';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Issued Devices - Return Tracking
            </div>
            <Badge variant="secondary">{issuedRequests.length} devices issued</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issuedRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No devices currently issued</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Issued On</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issuedRequests.map((request) => {
                    const daysInfo = getDaysInfo(request.expected_return_date);
                    return (
                      <TableRow 
                        key={request.id}
                        className={daysInfo.variant === 'destructive' ? 'bg-destructive/5' : ''}
                      >
                        <TableCell className="font-mono text-xs">
                          {request.request_tickets?.[0]?.ticket_number || '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {request.profiles?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {request.device_type}
                          {request.device_model && (
                            <span className="text-muted-foreground text-xs ml-1">({request.device_model})</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {request.issued_at ? format(new Date(request.issued_at), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {request.expected_return_date 
                            ? format(new Date(request.expected_return_date), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={daysInfo.variant}>{daysInfo.text}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canMarkReturned && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Returned
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

      {/* Return Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Mark Device as Returned
            </DialogTitle>
            <DialogDescription>
              Confirm that {selectedRequest?.profiles?.full_name} has returned the {selectedRequest?.device_type}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Return Notes (Optional)</label>
              <Textarea
                placeholder="Add any notes about the device condition, etc."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsReturned} disabled={processing}>
              {processing ? 'Processing...' : 'Confirm Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
