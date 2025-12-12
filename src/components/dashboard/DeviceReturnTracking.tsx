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
  status: string;
  return_verified: boolean | null;
  profiles: { full_name: string; email: string } | null;
  request_tickets: { ticket_number: string }[];
}

export function DeviceReturnTracking() {
  const { role, user } = useAuth();
  const [issuedRequests, setIssuedRequests] = useState<IssuedRequest[]>([]);
  const [pendingVerification, setPendingVerification] = useState<IssuedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<IssuedRequest | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionType, setActionType] = useState<'return' | 'verify'>('return');

  useEffect(() => {
    if (user) {
      fetchIssuedDevices();
      fetchPendingVerification();
    }
  }, [user, role]);

  const fetchIssuedDevices = async () => {
    let query = supabase
      .from('device_requests')
      .select(`
        id, device_type, device_model, quantity, issued_at, expected_return_date, duration, requester_id, status,
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

  // Fetch devices pending return verification (staff marked as returned, awaiting admin verification)
  const fetchPendingVerification = async () => {
    if (role !== 'admin' && role !== 'approver') return;

    const { data, error } = await supabase
      .from('device_requests')
      .select(`
        id, device_type, device_model, quantity, issued_at, expected_return_date, duration, requester_id, status,
        profiles!device_requests_requester_id_profiles_fkey(full_name, email),
        request_tickets(ticket_number)
      `)
      .eq('status', 'pending_return')
      .order('expected_return_date', { ascending: true });

    if (error) console.error('Error fetching pending verification:', error);
    if (data) setPendingVerification(data as any);
  };

  // Staff marks device as returned (pending verification)
  const handleStaffReturn = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    const { error } = await supabase
      .from('device_requests')
      .update({
        status: 'pending_return',
        approver_comments: returnNotes ? `Staff return notes: ${returnNotes}` : null,
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Notify admins about pending return verification
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'approver']);

      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map(r => ({
          user_id: r.user_id,
          title: 'Device Return Pending Verification',
          message: `${selectedRequest.profiles?.full_name || 'A user'} has marked ${selectedRequest.device_type} as returned. Please verify.`,
          type: 'info',
          related_request_id: selectedRequest.id,
        }));
        await supabase.from('notifications').insert(notifications);
      }

      toast({ title: 'Return submitted!', description: 'Awaiting admin verification.' });
      fetchIssuedDevices();
    }

    setSelectedRequest(null);
    setReturnNotes('');
    setProcessing(false);
  };

  // Admin verifies the return
  const handleVerifyReturn = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    const { error } = await supabase
      .from('device_requests')
      .update({
        status: 'returned',
        returned_at: new Date().toISOString(),
        approver_comments: returnNotes ? `Verified return notes: ${returnNotes}` : 'Return verified by admin',
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
          action: 'return_verified',
          performed_by: user?.id,
          details: `Return verified by admin. Notes: ${returnNotes || 'None'}`,
          encrypted_details: btoa(unescape(encodeURIComponent(`Return verified. Notes: ${returnNotes || 'None'}`))),
        });

        await supabase.from('request_tickets')
          .update({ status: 'closed' })
          .eq('id', ticket.id);
      }

      // Restore stock to inventory
      try {
        const { data: matchingDevice } = await supabase
          .from('devices')
          .select('id, name')
          .or(`name.ilike.%${selectedRequest.device_type}%,name.eq.${selectedRequest.device_type}`)
          .maybeSingle();

        if (matchingDevice) {
          await supabase.from('stock_movements').insert({
            device_id: matchingDevice.id,
            movement_type: 'in',
            quantity: selectedRequest.quantity,
            reason: `Returned by ${selectedRequest.profiles?.full_name || 'user'} - Request ID: ${selectedRequest.id}`,
            performed_by: user?.id,
          });
        }
      } catch (stockError) {
        console.error('Failed to restore stock:', stockError);
      }

      // Notify the user
      await supabase.from('notifications').insert({
        user_id: selectedRequest.requester_id,
        title: 'Device Return Verified',
        message: `Your ${selectedRequest.device_type} return has been verified. Thank you!`,
        type: 'success',
        related_request_id: selectedRequest.id,
      });

      toast({ title: 'Return verified!', description: 'Stock has been restored to inventory.' });
      fetchIssuedDevices();
      fetchPendingVerification();
    }

    setSelectedRequest(null);
    setReturnNotes('');
    setProcessing(false);
  };

  const handleAction = () => {
    if (actionType === 'return') {
      handleStaffReturn();
    } else {
      handleVerifyReturn();
    }
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

  // Staff can initiate return, admins/approvers can verify returns
  const canInitiateReturn = role === 'staff';
  const canVerifyReturn = role === 'admin' || role === 'approver';

  return (
    <>
      {/* Pending Verification Section (Admins/Approvers only) */}
      {canVerifyReturn && pendingVerification.length > 0 && (
        <Card className="border-amber-500/50 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-amber-700 dark:text-amber-400">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Returns Pending Verification
              </div>
              <Badge variant="secondary">{pendingVerification.length} awaiting</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingVerification.map((request) => (
                    <TableRow key={request.id}>
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
                      <TableCell>{request.quantity}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedRequest(request);
                            setActionType('verify');
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verify Return
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issued Devices Section */}
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
                    const isOwnRequest = request.requester_id === user?.id;
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
                          {/* Staff can initiate return for their own devices */}
                          {isOwnRequest && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('return');
                              }}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Return Device
                            </Button>
                          )}
                          {/* Admins can directly mark as returned (skip verification) */}
                          {canVerifyReturn && !isOwnRequest && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('verify');
                              }}
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

      {/* Return/Verify Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {actionType === 'return' ? 'Return Device' : 'Verify Device Return'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'return' 
                ? `Submit a return request for ${selectedRequest?.device_type}. An admin will verify the return.`
                : `Confirm that ${selectedRequest?.profiles?.full_name} has returned the ${selectedRequest?.device_type}. This will restore stock to inventory.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {actionType === 'return' ? 'Return Notes (Optional)' : 'Verification Notes (Optional)'}
              </label>
              <Textarea
                placeholder={actionType === 'return' 
                  ? "Add any notes about the device condition, etc."
                  : "Add verification notes, device condition, etc."
                }
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={processing}>
              {processing 
                ? 'Processing...' 
                : actionType === 'return' 
                  ? 'Submit Return' 
                  : 'Verify & Complete Return'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
