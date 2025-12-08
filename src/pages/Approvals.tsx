import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CheckSquare, CheckCircle, XCircle, MessageSquare, Search, AlertTriangle } from 'lucide-react';

interface PendingRequest {
  id: string;
  device_category: string;
  device_type: string;
  device_model: string | null;
  quantity: number;
  purpose: string;
  needed_date: string;
  duration: string;
  created_at: string;
  requester_id: string;
  profiles: { full_name: string; email: string; department: string | null } | null;
}

const categories = ['computing', 'mobile', 'peripherals', 'networking', 'audio_visual', 'other'];

export default function Approvals() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Search and filter states
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDate, setFilterDate] = useState('all');

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    const { data } = await supabase
      .from('device_requests')
      .select(`
        *,
        profiles!device_requests_requester_id_fkey (full_name, email, department)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) setRequests(data as any);
    setLoading(false);
  };

  // Filter out user's own requests - approvers/admins cannot approve their own
  const filteredRequests = requests
    .filter(r => r.requester_id !== user?.id) // Cannot approve own requests
    .filter(request => {
      const matchesSearch = 
        request.device_type.toLowerCase().includes(search.toLowerCase()) ||
        request.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        request.profiles?.department?.toLowerCase().includes(search.toLowerCase()) ||
        request.purpose.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = filterCategory === 'all' || request.device_category === filterCategory;
      
      let matchesDate = true;
      if (filterDate === 'today') {
        matchesDate = new Date(request.created_at).toDateString() === new Date().toDateString();
      } else if (filterDate === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = new Date(request.created_at) >= weekAgo;
      } else if (filterDate === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = new Date(request.created_at) >= monthAgo;
      }
      
      return matchesSearch && matchesCategory && matchesDate;
    });

  // Get user's own pending requests count
  const ownPendingRequests = requests.filter(r => r.requester_id === user?.id);

  const handleAction = async () => {
    if (!selectedRequest || !action) return;

    setProcessing(true);

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const { error } = await supabase
      .from('device_requests')
      .update({
        status: newStatus,
        approver_id: user?.id,
        approver_comments: comments || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Create notification for requester
      await supabase.from('notifications').insert({
        user_id: selectedRequest.requester_id,
        title: `Request ${newStatus}`,
        message: `Your request for ${selectedRequest.device_type} has been ${newStatus}.${comments ? ` Comment: ${comments}` : ''}`,
        type: action === 'approve' ? 'success' : 'warning',
        related_request_id: selectedRequest.id,
      });

      toast({ title: `Request ${newStatus}!` });
      fetchPendingRequests();
    }

    setSelectedRequest(null);
    setAction(null);
    setComments('');
    setProcessing(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pending Approvals</h1>
          <p className="text-muted-foreground">Review and process device requests</p>
        </div>

        {/* Alert for own pending requests */}
        {ownPendingRequests.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-medium">
                  You have {ownPendingRequests.length} pending request(s) that require approval from another approver.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by device, requester, department, or purpose..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    className="pl-9" 
                  />
                </div>
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Date Range" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Requests Awaiting Approval
              <Badge variant="secondary" className="ml-2">{filteredRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : filteredRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requester</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Needed By</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map(request => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{request.profiles?.department || 'No department'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.device_type}
                          {request.device_model && (
                            <span className="text-muted-foreground text-sm block">{request.device_model}</span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{request.device_category.replace('_', ' ')}</TableCell>
                        <TableCell>{request.quantity}</TableCell>
                        <TableCell>{format(new Date(request.needed_date), 'MMM d')}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={request.purpose}>
                          {request.purpose}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => { setSelectedRequest(request); setAction('approve'); }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => { setSelectedRequest(request); setAction('reject'); }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {requests.length > 0 && filteredRequests.length === 0 
                    ? 'No requests match your filters' 
                    : 'No pending requests'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedRequest && !!action} onOpenChange={() => { setSelectedRequest(null); setAction(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {action === 'approve' ? 'Approve Request' : 'Reject Request'}
              </DialogTitle>
              <DialogDescription>
                {action === 'approve'
                  ? 'This will approve the device request and notify the requester.'
                  : 'This will reject the device request. Please provide a reason.'}
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p><strong>Device:</strong> {selectedRequest.device_type}</p>
                  <p><strong>Requester:</strong> {selectedRequest.profiles?.full_name}</p>
                  <p><strong>Purpose:</strong> {selectedRequest.purpose}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comments {action === 'reject' && '(Required)'}
                  </label>
                  <Textarea
                    placeholder="Add comments for the requester..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedRequest(null); setAction(null); }}>
                Cancel
              </Button>
              <Button
                variant={action === 'approve' ? 'default' : 'destructive'}
                onClick={handleAction}
                disabled={processing || (action === 'reject' && !comments.trim())}
              >
                {processing ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}