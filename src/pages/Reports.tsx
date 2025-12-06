import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportToCSV } from '@/lib/export';
import { BarChart3, Download, FileText, Package, Users, ClipboardList, Printer, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';

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
  });
  const [reportType, setReportType] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [devicesRes, requestsRes, profilesRes, stockRes] = await Promise.all([
      supabase.from('devices').select('status'),
      supabase.from('device_requests').select('status'),
      supabase.from('profiles').select('id'),
      supabase.from('stock_movements').select('movement_type, quantity'),
    ]);

    const stockIn = stockRes.data?.filter(s => s.movement_type === 'in').reduce((acc, s) => acc + s.quantity, 0) || 0;
    const stockOut = stockRes.data?.filter(s => s.movement_type === 'out').reduce((acc, s) => acc + s.quantity, 0) || 0;

    setStats({
      totalDevices: devicesRes.data?.length || 0,
      availableDevices: devicesRes.data?.filter(d => d.status === 'available').length || 0,
      totalRequests: requestsRes.data?.length || 0,
      pendingRequests: requestsRes.data?.filter(r => r.status === 'pending').length || 0,
      approvedRequests: requestsRes.data?.filter(r => r.status === 'approved').length || 0,
      rejectedRequests: requestsRes.data?.filter(r => r.status === 'rejected').length || 0,
      totalUsers: profilesRes.data?.length || 0,
      totalStockIn: stockIn,
      totalStockOut: stockOut,
    });
  };

  // Admin Reports
  const generateFullSystemReport = async () => {
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*, profiles!device_requests_requester_id_fkey(full_name, email, department)');
    
    if (data) {
      const formatted = data.map(r => ({
        id: r.id,
        requester: (r as any).profiles?.full_name || 'Unknown',
        email: (r as any).profiles?.email || '',
        department: (r as any).profiles?.department || '',
        device_type: r.device_type,
        category: r.device_category,
        quantity: r.quantity,
        purpose: r.purpose,
        status: r.status,
        created_at: new Date(r.created_at).toLocaleDateString(),
      }));
      setReportData(formatted);
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
          model: d.model || '-',
          serial_number: d.serial_number || '-',
          status: d.status,
          stock_in: stockIn,
          stock_out: stockOut,
          current_stock: stockIn - stockOut,
          location: d.location || '-',
        };
      });
      setReportData(formatted);
      setReportType('Inventory Report');
    }
    setLoadingReport(false);
  };

  const generateStockMovementReport = async () => {
    setLoadingReport(true);
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*, devices(name)')
      .order('created_at', { ascending: false });
    
    if (movements) {
      const formatted = movements.map(m => ({
        id: m.id,
        device: (m as any).devices?.name || 'Unknown',
        type: m.movement_type === 'in' ? 'Stock In' : 'Stock Out',
        quantity: m.quantity,
        reason: m.reason || '-',
        date: new Date(m.created_at).toLocaleDateString(),
      }));
      setReportData(formatted);
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

  // Approver Reports
  const generatePendingApprovalsReport = async () => {
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*, profiles!device_requests_requester_id_fkey(full_name, email, department)')
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
      .select('*, profiles!device_requests_requester_id_fkey(full_name, department)')
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

  // Staff Reports
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

  const generateMyApprovedDevicesReport = async () => {
    if (!user) return;
    setLoadingReport(true);
    const { data } = await supabase
      .from('device_requests')
      .select('*')
      .eq('requester_id', user.id)
      .eq('status', 'approved');
    
    if (data) {
      const formatted = data.map(r => ({
        id: r.id,
        device_type: r.device_type,
        model: r.device_model || '-',
        quantity: r.quantity,
        approved_at: r.approved_at ? new Date(r.approved_at).toLocaleDateString() : '-',
        duration: r.duration,
        comments: r.approver_comments || '-',
      }));
      setReportData(formatted);
      setReportType('My Approved Devices Report');
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
  ];

  const approverReports = [
    { title: 'Pending Approvals', desc: 'All requests awaiting your approval', action: generatePendingApprovalsReport, icon: ClipboardList },
    { title: 'Approval History', desc: 'Your approval/rejection decisions', action: generateApprovalHistoryReport, icon: FileText },
  ];

  const staffReports = [
    { title: 'My Requests', desc: 'All your device requests and their status', action: generateMyRequestsReport, icon: ClipboardList },
    { title: 'My Approved Devices', desc: 'Devices approved for your use', action: generateMyApprovedDevicesReport, icon: Package },
  ];

  const getAvailableReports = () => {
    if (role === 'admin') return [...adminReports, ...approverReports, ...staffReports];
    if (role === 'approver') return [...approverReports, ...staffReports];
    return staffReports;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Generate, download, and print system reports</p>
          </div>
        </div>

        {/* Overview Stats - Admin Only */}
        {role === 'admin' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                <CardTitle className="text-sm font-medium">Stock In</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.totalStockIn}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Stock Out</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.totalStockOut}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRequests}</div>
                <p className="text-xs text-muted-foreground">{stats.pendingRequests} pending</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
          </div>
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
                  <Card key={index} className="border-dashed hover:border-primary cursor-pointer transition-colors" onClick={report.action}>
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
                      {reportData.map((row, index) => (
                        <TableRow key={row.id || index}>
                          {getReportColumns().map(col => (
                            <TableCell key={col}>
                              {col === 'status' ? (
                                <Badge variant={
                                  row[col] === 'approved' ? 'default' :
                                  row[col] === 'rejected' ? 'destructive' :
                                  row[col] === 'pending' ? 'secondary' : 'outline'
                                } className="capitalize">
                                  {row[col]}
                                </Badge>
                              ) : col === 'type' ? (
                                <Badge variant={row[col] === 'Stock In' ? 'default' : 'destructive'}>
                                  {row[col]}
                                </Badge>
                              ) : (
                                String(row[col])
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
    </DashboardLayout>
  );
}
