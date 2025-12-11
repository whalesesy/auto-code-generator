import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { UserCheck, UserX, Clock, CheckCircle, XCircle, ArrowLeft, Users, RefreshCw } from 'lucide-react';

interface SignupRequest {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  requested_role: 'admin' | 'approver' | 'staff';
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export default function SignupApprovals() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<SignupRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
    if (!authLoading && role !== 'admin' && role !== 'approver') {
      navigate('/dashboard');
      toast({ title: 'Access denied', description: 'Only approvers and admins can manage signup requests.', variant: 'destructive' });
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && (role === 'admin' || role === 'approver')) {
      fetchRequests();
    }
  }, [user, role]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('signup_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Error fetching requests', description: error.message, variant: 'destructive' });
    } else {
      setRequests(data as SignupRequest[]);
    }
    setLoading(false);
  };

  const handleAction = (request: SignupRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setRejectionReason('');
  };

  const processAction = async () => {
    if (!selectedRequest || !actionType) return;
    
    setProcessing(true);
    
    if (actionType === 'approve') {
      // Update signup request status
      const { error: updateError } = await supabase
        .from('signup_requests')
        .update({ 
          status: 'approved',
          approved_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);
      
      if (updateError) {
        toast({ title: 'Error approving request', description: updateError.message, variant: 'destructive' });
        setProcessing(false);
        return;
      }

      // Update user role to requested role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', selectedRequest.email)
        .single();
      
      if (profileData) {
        // Update user role
        await supabase
          .from('user_roles')
          .update({ role: selectedRequest.requested_role })
          .eq('user_id', profileData.user_id);
        
        // Mark profile as approved
        await supabase
          .from('profiles')
          .update({ is_approved: true })
          .eq('user_id', profileData.user_id);
        
        // Create notification for the user
        await supabase.from('notifications').insert({
          user_id: profileData.user_id,
          title: 'Account Approved!',
          message: `Your account has been approved with the role: ${selectedRequest.requested_role}. You can now log in to the system.`,
          type: 'success'
        });
      }
      
      toast({ title: 'Request approved', description: `${selectedRequest.full_name}'s account has been activated with ${selectedRequest.requested_role} role.` });
    } else {
      // Reject the request
      const { error: updateError } = await supabase
        .from('signup_requests')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);
      
      if (updateError) {
        toast({ title: 'Error rejecting request', description: updateError.message, variant: 'destructive' });
        setProcessing(false);
        return;
      }
      
      toast({ title: 'Request rejected', description: `${selectedRequest.full_name}'s signup request has been rejected.` });
    }
    
    setProcessing(false);
    setSelectedRequest(null);
    setActionType(null);
    fetchRequests();
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'approver': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'approved': return <Badge className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />Approved</Badge>;
      case 'rejected': return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      default: return null;
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Signup Approvals</h1>
            <p className="text-muted-foreground">Review and approve new user registrations</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Signup Requests
                </CardTitle>
                <CardDescription>Review and manage user registration requests</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchRequests}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No signup requests found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Requested Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map(request => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.full_name}</TableCell>
                      <TableCell>{request.email}</TableCell>
                      <TableCell>{request.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(request.requested_role)}>
                          {request.requested_role}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {request.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleAction(request, 'approve')}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleAction(request, 'reject')}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {request.rejection_reason && `Reason: ${request.rejection_reason}`}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => { setSelectedRequest(null); setActionType(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve Signup Request' : 'Reject Signup Request'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve' 
                  ? `Are you sure you want to approve ${selectedRequest?.full_name}'s account with ${selectedRequest?.requested_role} role?`
                  : `Please provide a reason for rejecting ${selectedRequest?.full_name}'s signup request.`
                }
              </DialogDescription>
            </DialogHeader>
            
            {actionType === 'reject' && (
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter the reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedRequest(null); setActionType(null); }}>
                Cancel
              </Button>
              <Button 
                onClick={processAction}
                disabled={processing || (actionType === 'reject' && !rejectionReason.trim())}
                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                variant={actionType === 'reject' ? 'destructive' : 'default'}
              >
                {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
