import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportToCSV } from '@/lib/export';
import { BarChart3, Download, FileText, Package, Users, ClipboardList } from 'lucide-react';

export default function Reports() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalDevices: 0,
    availableDevices: 0,
    totalRequests: 0,
    pendingRequests: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    if (!authLoading && role !== 'admin') {
      navigate('/dashboard');
    }
  }, [role, authLoading, navigate]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [devicesRes, requestsRes, profilesRes] = await Promise.all([
      supabase.from('devices').select('status'),
      supabase.from('device_requests').select('status'),
      supabase.from('profiles').select('id'),
    ]);

    setStats({
      totalDevices: devicesRes.data?.length || 0,
      availableDevices: devicesRes.data?.filter(d => d.status === 'available').length || 0,
      totalRequests: requestsRes.data?.length || 0,
      pendingRequests: requestsRes.data?.filter(r => r.status === 'pending').length || 0,
      totalUsers: profilesRes.data?.length || 0,
    });
  };

  const exportFullReport = async () => {
    const { data: requests } = await supabase
      .from('device_requests')
      .select(`
        *,
        profiles!device_requests_requester_id_fkey (full_name, email, department)
      `);

    if (requests) {
      const formattedData = requests.map(r => ({
        requester: (r as any).profiles?.full_name || 'Unknown',
        email: (r as any).profiles?.email || '',
        department: (r as any).profiles?.department || '',
        device_type: r.device_type,
        category: r.device_category,
        quantity: r.quantity,
        purpose: r.purpose,
        status: r.status,
        created_at: r.created_at,
      }));
      exportToCSV(formattedData, 'full-system-report');
    }
  };

  const exportInventoryReport = async () => {
    const { data } = await supabase.from('devices').select('*');
    if (data) exportToCSV(data, 'inventory-report');
  };

  const exportRequestsReport = async () => {
    const { data } = await supabase.from('device_requests').select('*');
    if (data) exportToCSV(data, 'requests-report');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate and export system reports</p>
        </div>

        {/* Overview Stats */}
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Utilization</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalDevices > 0
                  ? Math.round(((stats.totalDevices - stats.availableDevices) / stats.totalDevices) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Device utilization rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Export Reports
            </CardTitle>
            <CardDescription>Download reports in CSV format</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Full System Report</CardTitle>
                  <CardDescription>Complete overview of all requests with user details</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={exportFullReport} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Inventory Report</CardTitle>
                  <CardDescription>All devices with status and details</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={exportInventoryReport} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Requests Report</CardTitle>
                  <CardDescription>All device requests and their status</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={exportRequestsReport} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
