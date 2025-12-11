import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, Download, FileText, Package, Users, ClipboardList, Printer, 
  TrendingUp, ArrowLeft, MessageSquare, Activity, PieChart,
  FileDown
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Calculate pagination
  const totalItems = reportData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = reportData.slice(startIndex, endIndex);
  
  // Reset page when report data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [reportData]);

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
  const generateFullSystemReport = async (filters: QueryFilters) => {
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
        pickup_location: r.pickup_location || '-',
        pickup_time: r.pickup_time ? new Date(r.pickup_time).toLocaleString() : '-',
        expected_return_date: r.expected_return_date ? new Date(r.expected_return_date).toLocaleDateString() : '-',
        created_at: r.created_at,
        date: new Date(r.created_at).toLocaleDateString(),
      }));
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at', categoryField: 'device_category', statusField: 'status' }));
      setReportType('Full System Report');
    }
    setLoadingReport(false);
  };

  const generateInventoryReport = async (filters: QueryFilters) => {
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

  const generateStockMovementReport = async (filters: QueryFilters) => {
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

  const generateUserReport = async (filters: QueryFilters) => {
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
          created_at: p.created_at,
          joined: new Date(p.created_at).toLocaleDateString(),
        };
      });
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at' }));
      setReportType('User Report');
    }
    setLoadingReport(false);
  };

  const generateAdminActivityReport = async (filters: QueryFilters) => {
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
        created_at: r.approved_at || r.created_at,
        date: r.approved_at ? new Date(r.approved_at).toLocaleDateString() : '-',
      }));
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at' }));
      setReportType('Admin Activity Report');
    }
    setLoadingReport(false);
  };

  const generateUserActivityReport = async (filters: QueryFilters) => {
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
        device_category: r.device_category,
        created_at: r.created_at,
        date: new Date(r.created_at).toLocaleDateString(),
      }));
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at', categoryField: 'device_category', statusField: 'status' }));
      setReportType('User Activity Report');
    }
    setLoadingReport(false);
  };

  // ===== APPROVER REPORTS =====
  const generatePendingApprovalsReport = async (filters: QueryFilters) => {
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
        device_category: r.device_category,
        quantity: r.quantity,
        purpose: r.purpose,
        needed_date: new Date(r.needed_date).toLocaleDateString(),
        created_at: r.created_at,
        submitted: new Date(r.created_at).toLocaleDateString(),
      }));
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at', categoryField: 'device_category' }));
      setReportType('Pending Approvals Report');
    }
    setLoadingReport(false);
  };

  const generateApprovalHistoryReport = async (filters: QueryFilters) => {
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
        device_category: r.device_category,
        comments: r.approver_comments || '-',
        created_at: r.approved_at || r.created_at,
        decided_at: r.approved_at ? new Date(r.approved_at).toLocaleDateString() : '-',
      }));
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at', categoryField: 'device_category', statusField: 'status' }));
      setReportType('Approval History Report');
    }
    setLoadingReport(false);
  };

  // ===== STAFF/USER REPORTS =====
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
      // First apply date filters
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

  const generateAllFeedbackReport = async (filters: QueryFilters) => {
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
        created_at: f.created_at,
        sent_at: new Date(f.created_at).toLocaleDateString(),
      }));
      setReportData(applyQueryFilters(formatted, filters, { dateField: 'created_at' }));
      setReportType('All Feedback Report');
    }
    setLoadingReport(false);
  };

  const handleExport = () => {
    if (reportData.length > 0) {
      exportToCSV(reportData, reportType.toLowerCase().replace(/ /g, '-'));
    }
  };

  const handleExportPDF = () => {
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

  // Report definitions
  const adminReports = [
    { title: 'Full System Report', desc: 'Complete overview of all requests with user details', action: generateFullSystemReport, icon: FileText, showCategory: true, showApproval: true },
    { title: 'Inventory Report', desc: 'All devices with stock levels and details', action: generateInventoryReport, icon: Package, showCategory: true, showApproval: true },
    { title: 'Stock Movement Report', desc: 'All stock in/out movements history', action: generateStockMovementReport, icon: TrendingUp, showCategory: true, showApproval: false },
    { title: 'User Report', desc: 'All users with roles and departments', action: generateUserReport, icon: Users, showCategory: false, showApproval: false },
    { title: 'Admin Activity', desc: 'Actions taken by administrators', action: generateAdminActivityReport, icon: Activity, showCategory: false, showApproval: false },
    { title: 'User Activity', desc: 'Recent user activities and requests', action: generateUserActivityReport, icon: Activity, showCategory: true, showApproval: true },
    { title: 'All Feedback', desc: 'All feedback submitted by users', action: generateAllFeedbackReport, icon: MessageSquare, showCategory: false, showApproval: false },
  ];

  const approverReports = [
    { title: 'Pending Approvals', desc: 'All requests awaiting your approval', action: generatePendingApprovalsReport, icon: ClipboardList, showCategory: true, showApproval: false },
    { title: 'Approval History', desc: 'Your approval/rejection decisions', action: generateApprovalHistoryReport, icon: FileText, showCategory: true, showApproval: true },
    { title: 'Analytics Report', desc: 'Monthly breakdown of requests by status', action: generateAnalyticReport, icon: PieChart, showCategory: true, showApproval: true },
    { title: 'Status Report', desc: 'Current status of all your requests', action: generateStatusReport, icon: BarChart3, showCategory: true, showApproval: true },
    { title: 'My Feedback', desc: 'Feedback you have submitted', action: generateFeedbackReport, icon: MessageSquare, showCategory: false, showApproval: false },
  ];

  const staffReports = [
    { title: 'Analytics Report', desc: 'Monthly breakdown of your requests', action: generateAnalyticReport, icon: PieChart, showCategory: true, showApproval: true },
    { title: 'Status Report', desc: 'View status: Pending, Approved, or Rejected', action: generateStatusReport, icon: BarChart3, showCategory: true, showApproval: true },
    { title: 'My Requests', desc: 'All your device requests with dates', action: generateMyRequestsReport, icon: ClipboardList, showCategory: true, showApproval: true },
    { title: 'My Feedback', desc: 'Feedback you have submitted', action: generateFeedbackReport, icon: MessageSquare, showCategory: false, showApproval: false },
  ];

  const getAvailableReports = () => {
    if (role === 'admin') return [...adminReports, ...approverReports.filter(r => r.title !== 'Analytics Report' && r.title !== 'Status Report' && r.title !== 'My Feedback'), ...staffReports];
    if (role === 'approver') return [...approverReports, ...staffReports.filter(r => r.title !== 'Analytics Report' && r.title !== 'Status Report' && r.title !== 'My Feedback')];
    return staffReports;
  };

  return (
    <DashboardLayout>
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
              <CardDescription>Click on a report to configure filters and generate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getAvailableReports().map((report, index) => (
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
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={clearReport}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button variant="outline" onClick={handleExport} disabled={reportData.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={handleExportPDF} disabled={reportData.length === 0}>
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
                          
                          {/* First page */}
                          {currentPage > 3 && (
                            <>
                              <PaginationItem>
                                <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">1</PaginationLink>
                              </PaginationItem>
                              {currentPage > 4 && <PaginationEllipsis />}
                            </>
                          )}
                          
                          {/* Pages around current */}
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
                          
                          {/* Last page */}
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
      </div>
    </DashboardLayout>
  );
}
