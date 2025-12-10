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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  CheckSquare, CheckCircle, XCircle, MessageSquare, Search, AlertTriangle, Mail, 
  FileText, Download, Printer, BarChart3, Clock, ListChecks
} from 'lucide-react';
import { exportToCSV } from '@/lib/export';

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
  request_tickets?: { ticket_number: string }[];
}

const categories = ['computing', 'mobile', 'peripherals', 'networking', 'audio_visual', 'other'];

export default function Approvals() {
  const { user, role } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [bulkComments, setBulkComments] = useState('');
  
  // Search and filter states
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  
  // Report generation
  const [showReportSection, setShowReportSection] = useState(false);
  const [reportType, setReportType] = useState<string>('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    const { data } = await supabase
      .from('device_requests')
      .select(`
        *,
        profiles!device_requests_requester_id_fkey (full_name, email, department),
        request_tickets (ticket_number)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) setRequests(data as any);
    setLoading(false);
  };

  // Filter out user's own requests - cannot approve own
  const filteredRequests = requests
    .filter(r => r.requester_id !== user?.id)
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

  const ownPendingRequests = requests.filter(r => r.requester_id === user?.id);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const sendNotificationEmail = async (request: PendingRequest, status: 'approved' | 'rejected', comments: string) => {
    if (!request.profiles?.email) return;
    
    try {
      await supabase.functions.invoke('send-request-notification', {
        body: {
          to: request.profiles.email,
          recipientName: request.profiles.full_name || 'User',
          deviceType: request.device_type,
          status,
          comments: comments || undefined,
        },
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  };

  const logTicketAction = async (requestId: string, action: string, details: string) => {
    // Get ticket for this request
    const { data: ticket } = await supabase
      .from('request_tickets')
      .select('id')
      .eq('request_id', requestId)
      .maybeSingle();
    
    if (ticket) {
      await supabase.from('ticket_audit_log').insert({
        ticket_id: ticket.id,
        action,
        performed_by: user?.id,
        details,
        encrypted_details: btoa(details),
      });
      
      // Update ticket status
      await supabase.from('request_tickets')
        .update({ status: action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'open' })
        .eq('id', ticket.id);
    }
  };

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
      // Log ticket action
      await logTicketAction(selectedRequest.id, newStatus, `Request ${newStatus} by approver. Comments: ${comments || 'None'}`);
      
      // Create notification
      await supabase.from('notifications').insert({
        user_id: selectedRequest.requester_id,
        title: `Request ${newStatus}`,
        message: `Your request for ${selectedRequest.device_type} has been ${newStatus}.${comments ? ` Comment: ${comments}` : ''}`,
        type: action === 'approve' ? 'success' : 'warning',
        related_request_id: selectedRequest.id,
      });

      if (sendEmail) {
        await sendNotificationEmail(selectedRequest, newStatus, comments);
        toast({ title: `Request ${newStatus}!`, description: 'Email notification sent.' });
      } else {
        toast({ title: `Request ${newStatus}!` });
      }

      fetchPendingRequests();
    }

    setSelectedRequest(null);
    setAction(null);
    setComments('');
    setProcessing(false);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setProcessing(true);

    const newStatus = bulkAction === 'approve' ? 'approved' : 'rejected';
    const selectedRequests = filteredRequests.filter(r => selectedIds.has(r.id));
    
    let successCount = 0;
    let failCount = 0;

    for (const request of selectedRequests) {
      const { error } = await supabase
        .from('device_requests')
        .update({
          status: newStatus,
          approver_id: user?.id,
          approver_comments: bulkComments || null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (!error) {
        successCount++;
        
        await logTicketAction(request.id, newStatus, `Bulk ${newStatus} by approver. Comments: ${bulkComments || 'None'}`);
        
        await supabase.from('notifications').insert({
          user_id: request.requester_id,
          title: `Request ${newStatus}`,
          message: `Your request for ${request.device_type} has been ${newStatus}.${bulkComments ? ` Comment: ${bulkComments}` : ''}`,
          type: bulkAction === 'approve' ? 'success' : 'warning',
          related_request_id: request.id,
        });

        if (sendEmail && request.profiles?.email) {
          await sendNotificationEmail(request, newStatus, bulkComments);
        }
      } else {
        failCount++;
      }
    }

    toast({ 
      title: `Bulk action complete`, 
      description: `${successCount} requests ${newStatus}, ${failCount} failed.` 
    });

    setSelectedIds(new Set());
    setShowBulkDialog(false);
    setBulkAction(null);
    setBulkComments('');
    setProcessing(false);
    fetchPendingRequests();
  };

  // ===== REPORT FUNCTIONS =====
  const generatePendingApprovalsReport = async () => {
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*, profiles!device_requests_requester_id_fkey(full_name, department), request_tickets(ticket_number)')
      .eq('status', 'pending');
    
    if (data) {
      const formatted = data.map((r: any) => ({
        id: r.id,
        ticket: r.request_tickets?.[0]?.ticket_number || '-',
        requester: r.profiles?.full_name || 'Unknown',
        department: r.profiles?.department || '-',
        device: r.device_type,
        category: r.device_category,
        quantity: r.quantity,
        needed_date: format(new Date(r.needed_date), 'MMM d, yyyy'),
        submitted: format(new Date(r.created_at), 'MMM d, yyyy'),
      }));
      setReportData(formatted);
      setReportType('Pending Approvals Report');
    }
    setLoadingReport(false);
  };

  const generateApprovalHistoryReport = async () => {
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*, profiles!device_requests_requester_id_fkey(full_name, department), request_tickets(ticket_number)')
      .in('status', ['approved', 'rejected'])
      .order('approved_at', { ascending: false });
    
    if (data) {
      const formatted = data.map((r: any) => ({
        id: r.id,
        ticket: r.request_tickets?.[0]?.ticket_number || '-',
        requester: r.profiles?.full_name || 'Unknown',
        device: r.device_type,
        status: r.status.toUpperCase(),
        comments: r.approver_comments || '-',
        decided_at: r.approved_at ? format(new Date(r.approved_at), 'MMM d, yyyy') : '-',
      }));
      setReportData(formatted);
      setReportType('Approval History Report');
    }
    setLoadingReport(false);
  };

  const generateAnalyticsReport = async () => {
    setLoadingReport(true);
    const { data } = await supabase.from('device_requests').select('*');
    
    if (data) {
      const byMonth: Record<string, { total: number; approved: number; rejected: number; pending: number }> = {};
      data.forEach(r => {
        const month = format(new Date(r.created_at), 'MMM yyyy');
        if (!byMonth[month]) byMonth[month] = { total: 0, approved: 0, rejected: 0, pending: 0 };
        byMonth[month].total++;
        if (r.status === 'approved' || r.status === 'issued') byMonth[month].approved++;
        else if (r.status === 'rejected') byMonth[month].rejected++;
        else if (r.status === 'pending') byMonth[month].pending++;
      });
      
      const formatted = Object.entries(byMonth).map(([month, stats]) => ({
        id: month,
        month,
        total: stats.total,
        approved: stats.approved,
        rejected: stats.rejected,
        pending: stats.pending,
        approval_rate: stats.total > 0 ? `${Math.round((stats.approved / stats.total) * 100)}%` : '0%',
      }));
      setReportData(formatted);
      setReportType('Analytics Report');
    }
    setLoadingReport(false);
  };

  const generateStatusReport = async () => {
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*, request_tickets(ticket_number)')
      .order('status');
    
    if (data) {
      const formatted = data.map((r: any) => ({
        id: r.id,
        ticket: r.request_tickets?.[0]?.ticket_number || '-',
        device: r.device_type,
        category: r.device_category,
        status: r.status.toUpperCase(),
        submitted: format(new Date(r.created_at), 'MMM d, yyyy'),
        updated: format(new Date(r.updated_at), 'MMM d, yyyy'),
      }));
      setReportData(formatted);
      setReportType('Status Report');
    }
    setLoadingReport(false);
  };

  const generateFeedbackReport = async () => {
    setLoadingReport(true);
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .or(`recipient_type.eq.approver,recipient_id.eq.${user?.id}`)
      .order('created_at', { ascending: false });
    
    if (data) {
      const formatted = data.map(f => ({
        id: f.id,
        subject: f.subject,
        message: f.message.substring(0, 80) + (f.message.length > 80 ? '...' : ''),
        from: f.recipient_type === 'approver' ? 'All Approvers' : 'Direct',
        date: format(new Date(f.created_at), 'MMM d, yyyy'),
      }));
      setReportData(formatted);
      setReportType('Feedback Report');
    }
    setLoadingReport(false);
  };

  const generateMyRequestsReport = async () => {
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*, request_tickets(ticket_number)')
      .eq('requester_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      const formatted = data.map((r: any) => ({
        id: r.id,
        ticket: r.request_tickets?.[0]?.ticket_number || '-',
        device: r.device_type,
        category: r.device_category,
        quantity: r.quantity,
        status: r.status.toUpperCase(),
        submitted: format(new Date(r.created_at), 'MMM d, yyyy'),
      }));
      setReportData(formatted);
      setReportType('My Requests Report');
    }
    setLoadingReport(false);
  };

  const handleExport = () => {
    if (reportData.length > 0) {
      exportToCSV(reportData, reportType.toLowerCase().replace(/ /g, '-'));
    }
  };

  const clearReport = () => {
    setReportData([]);
    setReportType('');
  };

  const approverReports = [
    { title: 'Pending Approvals', icon: Clock, action: generatePendingApprovalsReport },
    { title: 'Approval History', icon: FileText, action: generateApprovalHistoryReport },
    { title: 'Analytics', icon: BarChart3, action: generateAnalyticsReport },
    { title: 'Status Report', icon: ListChecks, action: generateStatusReport },
    { title: 'Feedback', icon: MessageSquare, action: generateFeedbackReport },
    { title: 'My Requests', icon: FileText, action: generateMyRequestsReport },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Pending Approvals</h1>
            <p className="text-muted-foreground">Review and process device requests</p>
          </div>
          <Button variant="outline" onClick={() => setShowReportSection(!showReportSection)}>
            <FileText className="h-4 w-4 mr-2" />
            {showReportSection ? 'Hide Reports' : 'Reports'}
          </Button>
        </div>

        {/* Report Section */}
        {showReportSection && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Approver Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!reportType ? (
                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                  {approverReports.map((report) => (
                    <Button 
                      key={report.title}
                      variant="outline" 
                      className="h-auto py-4 flex flex-col gap-2"
                      onClick={report.action}
                    >
                      <report.icon className="h-5 w-5" />
                      <span className="text-sm">{report.title}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{reportType}</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={clearReport}>Back</Button>
                      <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />Export
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <Printer className="h-4 w-4 mr-2" />Print
                      </Button>
                    </div>
                  </div>
                  {loadingReport ? (
                    <p className="text-center py-4 text-muted-foreground">Generating...</p>
                  ) : reportData.length > 0 ? (
                    <div className="overflow-x-auto max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(reportData[0]).filter(k => k !== 'id').map(col => (
                              <TableHead key={col} className="capitalize">{col.replace(/_/g, ' ')}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.map(row => (
                            <TableRow key={row.id}>
                              {Object.entries(row).filter(([k]) => k !== 'id').map(([k, v]) => (
                                <TableCell key={k}>
                                  {k === 'status' ? (
                                    <Badge variant={v === 'APPROVED' ? 'default' : v === 'REJECTED' ? 'destructive' : 'secondary'}>
                                      {String(v)}
                                    </Badge>
                                  ) : String(v ?? '-')}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center py-4 text-muted-foreground">No data found</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <p className="font-medium">{selectedIds.size} request(s) selected</p>
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    onClick={() => { setBulkAction('approve'); setShowBulkDialog(true); }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve All
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => { setBulkAction('reject'); setShowBulkDialog(true); }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject All
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedIds(new Set())}>
                    Clear Selection
                  </Button>
                </div>
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
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={selectedIds.size === filteredRequests.length && filteredRequests.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Needed By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map(request => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.has(request.id)}
                            onCheckedChange={() => toggleSelect(request.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {request.request_tickets?.[0]?.ticket_number || '-'}
                          </Badge>
                        </TableCell>
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

        {/* Single Action Dialog */}
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
                  <p><strong>Ticket:</strong> {selectedRequest.request_tickets?.[0]?.ticket_number || 'N/A'}</p>
                  <p><strong>Device:</strong> {selectedRequest.device_type}</p>
                  <p><strong>Requester:</strong> {selectedRequest.profiles?.full_name}</p>
                  <p><strong>Email:</strong> {selectedRequest.profiles?.email}</p>
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

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sendEmail"
                    checked={sendEmail}
                    onCheckedChange={(checked) => setSendEmail(!!checked)}
                  />
                  <label htmlFor="sendEmail" className="text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Send email notification to requester
                  </label>
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

        {/* Bulk Action Dialog */}
        <Dialog open={showBulkDialog} onOpenChange={() => { setShowBulkDialog(false); setBulkAction(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Bulk {bulkAction === 'approve' ? 'Approve' : 'Reject'} Requests
              </DialogTitle>
              <DialogDescription>
                You are about to {bulkAction} {selectedIds.size} request(s). This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments for all requests {bulkAction === 'reject' && '(Required)'}
                </label>
                <Textarea
                  placeholder="Add comments that will be applied to all selected requests..."
                  value={bulkComments}
                  onChange={(e) => setBulkComments(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="bulkSendEmail"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(!!checked)}
                />
                <label htmlFor="bulkSendEmail" className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send email notifications to all requesters
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowBulkDialog(false); setBulkAction(null); }}>
                Cancel
              </Button>
              <Button
                variant={bulkAction === 'approve' ? 'default' : 'destructive'}
                onClick={handleBulkAction}
                disabled={processing || (bulkAction === 'reject' && !bulkComments.trim())}
              >
                {processing ? 'Processing...' : `${bulkAction === 'approve' ? 'Approve' : 'Reject'} ${selectedIds.size} Requests`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}