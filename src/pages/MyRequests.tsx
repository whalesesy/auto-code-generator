import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Clock, CheckCircle, XCircle, Package, FileText, Download, Search, BarChart3, PieChart, MessageSquare, ClipboardList, Printer, FileDown, ArrowLeft } from 'lucide-react';
import { exportToCSV, exportToPDF } from '@/lib/export';
import { QueryFilters, defaultFilters, applyQueryFilters } from '@/components/filters/QueryFiltersSidebar';
import { ReportCardWithFilters } from '@/components/reports/ReportCardWithFilters';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis 
} from '@/components/ui/pagination';

interface Request {
  id: string;
  device_category: string;
  device_type: string;
  device_model: string | null;
  quantity: number;
  purpose: string;
  needed_date: string;
  duration: string;
  status: string;
  approver_comments: string | null;
  created_at: string;
  pickup_location?: string | null;
  expected_return_date?: string | null;
}

interface ReportData {
  id: string;
  [key: string]: any;
}

const categories = ['computing', 'mobile', 'peripherals', 'networking', 'audio_visual', 'other'];
const statuses = ['pending', 'approved', 'rejected', 'issued', 'returned'];

export default function MyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter states
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Reports state
  const [reportType, setReportType] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const totalItems = reportData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = reportData.slice(startIndex, endIndex);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [reportData]);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('device_requests')
      .select('*')
      .eq('requester_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) setRequests(data);
    setLoading(false);
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.device_type.toLowerCase().includes(search.toLowerCase()) ||
      request.purpose.toLowerCase().includes(search.toLowerCase()) ||
      request.device_model?.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || request.device_category === filterCategory;
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" />, label: 'Pending Approval' },
      approved: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" />, label: 'Approved - Waiting to be Issued' },
      rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" />, label: 'Rejected' },
      issued: { variant: 'outline', icon: <Package className="h-3 w-3 mr-1" />, label: 'Issued' },
      returned: { variant: 'secondary', icon: <Package className="h-3 w-3 mr-1" />, label: 'Returned' },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const handleExport = () => {
    exportToCSV(filteredRequests, 'my-requests');
  };

  // ===== STAFF REPORTS =====
  const generateMyRequestsReport = async (filters: QueryFilters) => {
    if (!user) return;
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      const formatted = data.map(r => ({
        id: r.id,
        device_type: r.device_type,
        category: r.device_category,
        device_category: r.device_category,
        quantity: r.quantity,
        purpose: r.purpose,
        status: r.status,
        needed_date: new Date(r.needed_date).toLocaleDateString(),
        pickup_location: r.pickup_location || '-',
        expected_return_date: r.expected_return_date ? new Date(r.expected_return_date).toLocaleDateString() : '-',
        created_at: r.created_at,
        submitted: new Date(r.created_at).toLocaleDateString(),
      }));
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at', categoryField: 'device_category', statusField: 'status' }));
      setReportType('My Requests Report');
    }
    setLoadingReport(false);
  };

  const generateStatusReport = async (filters: QueryFilters) => {
    if (!user) return;
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*')
      .eq('requester_id', user.id)
      .order('status');
    
    if (data) {
      const formatted = data.map(r => ({
        id: r.id,
        device_type: r.device_type,
        device_category: r.device_category,
        status: r.status.toUpperCase(),
        created_at: r.created_at,
        submitted: new Date(r.created_at).toLocaleDateString(),
        updated: new Date(r.updated_at).toLocaleDateString(),
        comments: r.approver_comments || '-',
      }));
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at', categoryField: 'device_category', statusField: 'status' }));
      setReportType('Status Report');
    }
    setLoadingReport(false);
  };

  const generateAnalyticReport = async (filters: QueryFilters) => {
    if (!user) return;
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      const filteredData = applyQueryFilters(data.map(r => ({ ...r, device_category: r.device_category })), filters, { dateField: 'created_at', categoryField: 'device_category', statusField: 'status' });
      
      const byMonth: { [key: string]: { pending: number; approved: number; rejected: number } } = {};
      filteredData.forEach(r => {
        const month = new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!byMonth[month]) byMonth[month] = { pending: 0, approved: 0, rejected: 0 };
        if (r.status === 'pending') byMonth[month].pending++;
        else if (r.status === 'approved' || r.status === 'issued') byMonth[month].approved++;
        else if (r.status === 'rejected') byMonth[month].rejected++;
      });
      
      const formatted = Object.entries(byMonth).map(([month, counts]) => ({
        id: month,
        month,
        pending: counts.pending,
        approved: counts.approved,
        rejected: counts.rejected,
        total: counts.pending + counts.approved + counts.rejected,
      }));
      setReportData(formatted);
      setReportType('Analytics Report');
    }
    setLoadingReport(false);
  };

  const generateFeedbackReport = async (filters: QueryFilters) => {
    if (!user) return;
    setLoadingReport(true);
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      const formatted = data.map(f => ({
        id: f.id,
        subject: f.subject,
        recipient_type: f.recipient_type,
        message: f.message.substring(0, 100) + (f.message.length > 100 ? '...' : ''),
        created_at: f.created_at,
        sent_at: new Date(f.created_at).toLocaleDateString(),
      }));
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at' }));
      setReportType('My Feedback Report');
    }
    setLoadingReport(false);
  };

  const staffReports = [
    { title: 'Analytics Report', desc: 'Monthly breakdown of your requests', action: generateAnalyticReport, icon: PieChart, showCategory: true, showApproval: true },
    { title: 'Status Report', desc: 'View status: Pending, Approved, or Rejected', action: generateStatusReport, icon: BarChart3, showCategory: true, showApproval: true },
    { title: 'My Requests', desc: 'All your device requests with dates', action: generateMyRequestsReport, icon: ClipboardList, showCategory: true, showApproval: true },
    { title: 'My Feedback', desc: 'Feedback you have submitted', action: generateFeedbackReport, icon: MessageSquare, showCategory: false, showApproval: false },
  ];

  const handleReportExport = () => {
    if (reportData.length > 0) {
      exportToCSV(reportData, reportType.toLowerCase().replace(/ /g, '-'));
    }
  };

  const handleReportExportPDF = () => {
    if (reportData.length > 0) {
      exportToPDF(reportData, reportType.toLowerCase().replace(/ /g, '-'), reportType);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const clearReport = () => {
    setReportData([]);
    setReportType('');
  };

  const getReportColumns = () => {
    if (reportData.length === 0) return [];
    return Object.keys(reportData[0]).filter(k => k !== 'id' && k !== 'created_at' && k !== 'device_category');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Requests</h1>
            <p className="text-muted-foreground">Track the status of your device requests and generate reports</p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="requests">My Requests</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search by device, model, or purpose..." 
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
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Request History
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
                          <TableHead>Device</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Needed By</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pickup / Return Info</TableHead>
                          <TableHead>Submitted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.map(request => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">
                              {request.device_type}
                              {request.device_model && (
                                <span className="text-muted-foreground text-sm block">{request.device_model}</span>
                              )}
                            </TableCell>
                            <TableCell className="capitalize">{request.device_category.replace('_', ' ')}</TableCell>
                            <TableCell>{request.quantity}</TableCell>
                            <TableCell>{format(new Date(request.needed_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="capitalize">{request.duration.replace('_', ' ')}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell>
                              {request.status === 'issued' ? (
                                <div className="text-sm">
                                  <p><span className="font-medium">Pickup:</span> {request.pickup_location || '-'}</p>
                                  <p><span className="font-medium">Return by:</span> {request.expected_return_date ? format(new Date(request.expected_return_date), 'MMM d, yyyy') : '-'}</p>
                                </div>
                              ) : request.status === 'approved' ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Awaiting Pickup Info
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{format(new Date(request.created_at), 'MMM d, yyyy')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {requests.length > 0 ? 'No requests match your filters' : 'No requests yet'}
                    </p>
                    {requests.length === 0 && (
                      <Button className="mt-4" onClick={() => window.location.href = '/request'}>
                        Create Your First Request
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {requests.some(r => r.approver_comments) && (
              <Card>
                <CardHeader>
                  <CardTitle>Approver Comments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {requests.filter(r => r.approver_comments).map(request => (
                    <div key={request.id} className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{request.device_type}</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{request.approver_comments}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {!reportType ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Available Reports
                  </CardTitle>
                  <CardDescription>Click on a report to configure filters and generate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {staffReports.map((report, index) => (
                      <ReportCardWithFilters
                        key={index}
                        title={report.title}
                        description={report.desc}
                        icon={report.icon}
                        onGenerate={report.action}
                        showCategoryFilter={report.showCategory}
                        showApprovalFilters={report.showApproval}
                        showTicketFilter={true}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {reportType}
                      </CardTitle>
                      <CardDescription>{reportData.length} records found</CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" onClick={clearReport}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <Button variant="outline" onClick={handleReportExport} disabled={reportData.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button variant="outline" onClick={handleReportExportPDF} disabled={reportData.length === 0}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button variant="outline" onClick={handlePrint} disabled={reportData.length === 0}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingReport ? (
                    <p className="text-center py-8 text-muted-foreground">Generating report...</p>
                  ) : reportData.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No data found for this report</p>
                  ) : (
                    <>
                      {/* Pagination Controls - Top */}
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Show</span>
                          <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-muted-foreground">per page</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} records
                        </span>
                      </div>

                      <div className="overflow-x-auto print:overflow-visible">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {getReportColumns().map(col => (
                                <TableHead key={col} className="capitalize">{col.replace(/_/g, ' ')}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedData.map(row => (
                              <TableRow key={row.id}>
                                {getReportColumns().map(col => (
                                  <TableCell key={col}>
                                    {col === 'status' ? (
                                      <Badge variant={
                                        row[col] === 'approved' || row[col] === 'APPROVED' || row[col] === 'ISSUED' ? 'default' : 
                                        row[col] === 'rejected' || row[col] === 'REJECTED' ? 'destructive' : 
                                        'secondary'
                                      }>
                                        {row[col]}
                                      </Badge>
                                    ) : (
                                      String(row[col] ?? '-')
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination Controls - Bottom */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious 
                                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                              </PaginationItem>
                              
                              {currentPage > 3 && (
                                <>
                                  <PaginationItem>
                                    <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">1</PaginationLink>
                                  </PaginationItem>
                                  {currentPage > 4 && <PaginationEllipsis />}
                                </>
                              )}
                              
                              {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => page >= currentPage - 2 && page <= currentPage + 2)
                                .map(page => (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      onClick={() => setCurrentPage(page)}
                                      isActive={currentPage === page}
                                      className="cursor-pointer"
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                ))
                              }
                              
                              {currentPage < totalPages - 2 && (
                                <>
                                  {currentPage < totalPages - 3 && <PaginationEllipsis />}
                                  <PaginationItem>
                                    <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">{totalPages}</PaginationLink>
                                  </PaginationItem>
                                </>
                              )}
                              
                              <PaginationItem>
                                <PaginationNext 
                                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
