import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportToCSV } from '@/lib/export';
import { QueryFiltersSidebar, QueryFilters, defaultFilters, applyQueryFilters } from '@/components/filters/QueryFiltersSidebar';
import { 
  BarChart3, Download, FileText, Package, Users, ClipboardList, Printer, 
  TrendingUp, TrendingDown, ArrowLeft, MessageSquare, Activity, PieChart, Calendar,
  PanelLeftClose, PanelLeft, Filter
} from 'lucide-react';

interface ReportData {
  id: string;
  [key: string]: any;
}

export default function Reports() {
  const { role, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalDevices: 0,
    availableDevices: 0,
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalUsers: 0,
    totalStockIn: 0,
    totalStockOut: 0,
    totalFeedback: 0,
    adminCount: 0,
    approverCount: 0,
    staffCount: 0,
  });
  const [reportType, setReportType] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [filters, setFilters] = useState<QueryFilters>(defaultFilters);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [devicesRes, requestsRes, profilesRes, stockRes, feedbackRes, rolesRes] = await Promise.all([
      supabase.from('devices').select('status'),
      supabase.from('device_requests').select('status'),
      supabase.from('profiles').select('id'),
      supabase.from('stock_movements').select('movement_type, quantity'),
      supabase.from('feedback').select('id'),
      supabase.from('user_roles').select('role'),
    ]);

    const stockIn = stockRes.data?.filter(s => s.movement_type === 'in').reduce((acc, s) => acc + s.quantity, 0) || 0;
    const stockOut = stockRes.data?.filter(s => s.movement_type === 'out').reduce((acc, s) => acc + s.quantity, 0) || 0;

    setStats({
      totalDevices: devicesRes.data?.length || 0,
      availableDevices: devicesRes.data?.filter(d => d.status === 'available').length || 0,
      totalRequests: requestsRes.data?.length || 0,
      pendingRequests: requestsRes.data?.filter(r => r.status === 'pending').length || 0,
      approvedRequests: requestsRes.data?.filter(r => r.status === 'approved' || r.status === 'issued').length || 0,
      rejectedRequests: requestsRes.data?.filter(r => r.status === 'rejected').length || 0,
      totalUsers: profilesRes.data?.length || 0,
      totalStockIn: stockIn,
      totalStockOut: stockOut,
      totalFeedback: feedbackRes.data?.length || 0,
      adminCount: rolesRes.data?.filter(r => r.role === 'admin').length || 0,
      approverCount: rolesRes.data?.filter(r => r.role === 'approver').length || 0,
      staffCount: rolesRes.data?.filter(r => r.role === 'staff').length || 0,
    });
  };

  // ===== ADMIN REPORTS =====
  const generateFullSystemReport = async () => {
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*, profiles!device_requests_requester_id_profiles_fkey(full_name, email, department)')
      .order('created_at', { ascending: false });
    
    if (data) {
      const formatted = data.map(r => ({
        id: r.id,
        requester: (r as any).profiles?.full_name || 'Unknown',
        email: (r as any).profiles?.email || '',
        department: (r as any).profiles?.department || '',
        device_type: r.device_type,
        category: r.device_category,
        device_category: r.device_category,
        quantity: r.quantity,
        purpose: r.purpose,
        status: r.status.toUpperCase(),
        created_at: r.created_at,
        date: new Date(r.created_at).toLocaleDateString(),
      }));
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at', categoryField: 'device_category', statusField: 'status' }));
      setReportType('Full System Report');
    }
    setLoadingReport(false);
  };

  const generateInventoryReport = async () => {
    setLoadingReport(true);
    const { data: devices } = await supabase.from('devices').select('*');
    const { data: movements } = await supabase.from('stock_movements').select('*');
    
    if (devices) {
      const formatted = devices.map(d => {
        const deviceMovements = movements?.filter(m => m.device_id === d.id) || [];
        const stockIn = deviceMovements.filter(m => m.movement_type === 'in').reduce((acc, m) => acc + m.quantity, 0);
        const stockOut = deviceMovements.filter(m => m.movement_type === 'out').reduce((acc, m) => acc + m.quantity, 0);
        return {
          id: d.id,
          name: d.name,
          category: d.category,
          device_category: d.category,
          model: d.model || '-',
          serial_number: d.serial_number || '-',
          status: d.status.toUpperCase(),
          stock_in: stockIn,
          stock_out: stockOut,
          current_stock: stockIn - stockOut,
          location: d.location || '-',
          created_at: d.created_at,
        };
      });
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at', categoryField: 'device_category', statusField: 'status' }));
      setReportType('Inventory Report');
    }
    setLoadingReport(false);
  };

  const generateStockMovementReport = async () => {
    setLoadingReport(true);
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*, devices(name, category)')
      .order('created_at', { ascending: false });
    
    if (movements) {
      const formatted = movements.map(m => ({
        id: m.id,
        device: (m as any).devices?.name || 'Unknown',
        category: (m as any).devices?.category || '-',
        device_category: (m as any).devices?.category || '-',
        type: m.movement_type === 'in' ? 'Stock In' : 'Stock Out',
        quantity: m.quantity,
        reason: m.reason || '-',
        date: new Date(m.created_at).toLocaleDateString(),
        created_at: m.created_at,
      }));
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at', categoryField: 'device_category' }));
      setReportType('Stock Movement Report');
    }
    setLoadingReport(false);
  };

  const generateUserReport = async () => {
    setLoadingReport(true);
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('*');
    
    if (profiles) {
      const formatted = profiles.map(p => {
        const userRole = roles?.find(r => r.user_id === p.user_id);
        return {
          id: p.id,
          name: p.full_name,
          email: p.email,
          department: p.department || '-',
          phone: p.phone || '-',
          role: userRole?.role || 'staff',
          joined: new Date(p.created_at).toLocaleDateString(),
        };
      });
      setReportData(formatted);
      setReportType('User Report');
    }
    setLoadingReport(false);
  };

  const generateAdminActivityReport = async () => {
    setLoadingReport(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    const adminIds = roles?.map(r => r.user_id) || [];
    
    const { data } = await supabase
      .from('device_requests')
      .select('*, profiles!device_requests_requester_id_profiles_fkey(full_name)')
      .in('approver_id', adminIds)
      .order('approved_at', { ascending: false });
    
    if (data) {
      const formatted = data.map(r => ({
        id: r.id,
        action: r.status,
        device: r.device_type,
        requester: (r as any).profiles?.full_name || 'Unknown',
        comments: r.approver_comments || '-',
        date: r.approved_at ? new Date(r.approved_at).toLocaleDateString() : '-',
      }));
      setReportData(formatted);
      setReportType('Admin Activity Report');
    }
    setLoadingReport(false);
  };

  const generateUserActivityReport = async () => {
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*, profiles!device_requests_requester_id_profiles_fkey(full_name, department)')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (data) {
      const formatted = data.map(r => ({
        id: r.id,
        user: (r as any).profiles?.full_name || 'Unknown',
        department: (r as any).profiles?.department || '-',
        device: r.device_type,
        status: r.status,
        date: new Date(r.created_at).toLocaleDateString(),
      }));
      setReportData(formatted);
      setReportType('User Activity Report');
    }
    setLoadingReport(false);
  };

  // ===== APPROVER REPORTS =====
  const generatePendingApprovalsReport = async () => {
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*, profiles!device_requests_requester_id_profiles_fkey(full_name, email, department)')
      .eq('status', 'pending');
    
    if (data) {
      const formatted = data.map(r => ({
        id: r.id,
        requester: (r as any).profiles?.full_name || 'Unknown',
        department: (r as any).profiles?.department || '-',
        device_type: r.device_type,
        category: r.device_category,
        quantity: r.quantity,
        purpose: r.purpose,
        needed_date: new Date(r.needed_date).toLocaleDateString(),
        submitted: new Date(r.created_at).toLocaleDateString(),
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
      .select('*, profiles!device_requests_requester_id_profiles_fkey(full_name, department)')
      .in('status', ['approved', 'rejected'])
      .order('updated_at', { ascending: false });
    
    if (data) {
      const formatted = data.map(r => ({
        id: r.id,
        requester: (r as any).profiles?.full_name || 'Unknown',
        department: (r as any).profiles?.department || '-',
        device_type: r.device_type,
        status: r.status,
        comments: r.approver_comments || '-',
        decided_at: r.approved_at ? new Date(r.approved_at).toLocaleDateString() : '-',
      }));
      setReportData(formatted);
      setReportType('Approval History Report');
    }
    setLoadingReport(false);
  };

  // ===== STAFF/USER REPORTS =====
  const generateMyRequestsReport = async () => {
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
        quantity: r.quantity,
        purpose: r.purpose,
        status: r.status,
        needed_date: new Date(r.needed_date).toLocaleDateString(),
        submitted: new Date(r.created_at).toLocaleDateString(),
      }));
      setReportData(formatted);
      setReportType('My Requests Report');
    }
    setLoadingReport(false);
  };

  const generateStatusReport = async () => {
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
        status: r.status.toUpperCase(),
        submitted: new Date(r.created_at).toLocaleDateString(),
        updated: new Date(r.updated_at).toLocaleDateString(),
        comments: r.approver_comments || '-',
      }));
      setReportData(formatted);
      setReportType('Status Report');
    }
    setLoadingReport(false);
  };

  const generateAnalyticReport = async () => {
    if (!user) return;
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      const byMonth: { [key: string]: { pending: number; approved: number; rejected: number } } = {};
      data.forEach(r => {
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

  const generateFeedbackReport = async () => {
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
        sent_at: new Date(f.created_at).toLocaleDateString(),
      }));
      setReportData(formatted);
      setReportType('My Feedback Report');
    }
    setLoadingReport(false);
  };

  const generateAllFeedbackReport = async () => {
    setLoadingReport(true);
    const { data } = await supabase
      .from('feedback')
      .select('*, profiles!feedback_sender_id_profiles_fkey(full_name)')
      .order('created_at', { ascending: false });
    
    if (data) {
      const formatted = data.map(f => ({
        id: f.id,
        sender: (f as any).profiles?.full_name || 'Unknown',
        subject: f.subject,
        recipient_type: f.recipient_type,
        message: f.message.substring(0, 100) + (f.message.length > 100 ? '...' : ''),
        sent_at: new Date(f.created_at).toLocaleDateString(),
      }));
      setReportData(formatted);
      setReportType('All Feedback Report');
    }
    setLoadingReport(false);
  };

  const handleExport = () => {
    if (reportData.length > 0) {
      exportToCSV(reportData, reportType.toLowerCase().replace(/ /g, '-'));
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
    return Object.keys(reportData[0]).filter(k => k !== 'id');
  };

  // Report cards based on role
  const adminReports = [
    { title: 'Full System Report', desc: 'Complete overview of all requests with user details', action: generateFullSystemReport, icon: FileText },
    { title: 'Inventory Report', desc: 'All devices with stock levels and details', action: generateInventoryReport, icon: Package },
    { title: 'Stock Movement Report', desc: 'All stock in/out movements history', action: generateStockMovementReport, icon: TrendingUp },
    { title: 'User Report', desc: 'All users with roles and departments', action: generateUserReport, icon: Users },
    { title: 'Admin Activity', desc: 'Actions taken by administrators', action: generateAdminActivityReport, icon: Activity },
    { title: 'User Activity', desc: 'Recent user activities and requests', action: generateUserActivityReport, icon: Activity },
    { title: 'All Feedback', desc: 'All feedback submitted by users', action: generateAllFeedbackReport, icon: MessageSquare },
  ];

  const approverReports = [
    { title: 'Pending Approvals', desc: 'All requests awaiting your approval', action: generatePendingApprovalsReport, icon: ClipboardList },
    { title: 'Approval History', desc: 'Your approval/rejection decisions', action: generateApprovalHistoryReport, icon: FileText },
    { title: 'Analytics Report', desc: 'Monthly breakdown of requests by status', action: generateAnalyticReport, icon: PieChart },
    { title: 'Status Report', desc: 'Current status of all your requests', action: generateStatusReport, icon: BarChart3 },
    { title: 'My Feedback', desc: 'Feedback you have submitted', action: generateFeedbackReport, icon: MessageSquare },
  ];

  const staffReports = [
    { title: 'Analytics Report', desc: 'Monthly breakdown of your requests', action: generateAnalyticReport, icon: PieChart },
    { title: 'Status Report', desc: 'View status: Pending, Approved, or Rejected', action: generateStatusReport, icon: BarChart3 },
    { title: 'My Requests', desc: 'All your device requests with dates', action: generateMyRequestsReport, icon: ClipboardList },
    { title: 'My Feedback', desc: 'Feedback you have submitted', action: generateFeedbackReport, icon: MessageSquare },
  ];

  const getAvailableReports = () => {
    if (role === 'admin') return [...adminReports, ...approverReports.filter(r => r.title !== 'Analytics Report' && r.title !== 'Status Report' && r.title !== 'My Feedback'), ...staffReports];
    if (role === 'approver') return [...approverReports, ...staffReports.filter(r => r.title !== 'Analytics Report' && r.title !== 'Status Report' && r.title !== 'My Feedback')];
    return staffReports;
  };

  return (
    <DashboardLayout>
      <div className="flex gap-6">
        {/* Sidebar Filters */}
        {showSidebar && (
          <div className="w-64 shrink-0">
            <QueryFiltersSidebar
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => setFilters(defaultFilters)}
            />
          </div>
        )}

        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Reports & Analytics</h1>
                <p className="text-muted-foreground">Generate, download, and print system reports</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex items-center gap-2"
            >
              {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Overview Stats - Admin/ICT Manager Only */}
          {role === 'admin' && (
            <>
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    ICT Manager Dashboard - Project Overview
                  </CardTitle>
                  <CardDescription>Complete system overview with admin and user activities</CardDescription>
                </CardHeader>
              </Card>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDevices}</div>
                  <p className="text-xs text-muted-foreground">{stats.availableDevices} available</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Stock In / Out</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <span className="text-xl font-bold text-green-600">+{stats.totalStockIn}</span>
                    <span className="text-xl font-bold text-red-600">-{stats.totalStockOut}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Request Status</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRequests}</div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{stats.pendingRequests} pending</Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700">{stats.approvedRequests} approved</Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700">{stats.rejectedRequests} rejected</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Users by Role</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline">{stats.adminCount} admins</Badge>
                    <Badge variant="outline">{stats.approverCount} approvers</Badge>
                    <Badge variant="outline">{stats.staffCount} staff</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={generateAdminActivityReport}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-primary" />
                    Admin Activities
                  </CardTitle>
                  <CardDescription>View all actions taken by administrators</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">View Admin Activity Report</Button>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={generateUserActivityReport}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    User Activities
                  </CardTitle>
                  <CardDescription>View recent activities from all users</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">View User Activity Report</Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Report Selection */}
        {!reportType && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Available Reports
              </CardTitle>
              <CardDescription>Select a report type to generate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getAvailableReports().map((report, index) => (
                  <Card key={index} className="border-dashed hover:border-primary hover:shadow-md cursor-pointer transition-all" onClick={report.action}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <report.icon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                      </div>
                      <CardDescription>{report.desc}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" variant="outline">
                        Generate Report
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Report View */}
        {reportType && (
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
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearReport}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button variant="outline" onClick={handleExport} disabled={reportData.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={handlePrint} disabled={reportData.length === 0}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingReport ? (
                <p className="text-center py-8 text-muted-foreground">Generating report...</p>
              ) : reportData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No data found for this report</p>
              ) : (
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
                      {reportData.map(row => (
                        <TableRow key={row.id}>
                          {getReportColumns().map(col => (
                            <TableCell key={col}>
                              {col === 'status' ? (
                                <Badge variant={
                                  row[col] === 'approved' || row[col] === 'APPROVED' ? 'default' : 
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
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
