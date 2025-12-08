import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ClipboardList, CheckCircle, XCircle, Package, Clock, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useLowStockAlert } from '@/hooks/useLowStockAlert';

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  issued: number;
}

interface RecentActivity {
  id: string;
  device_type: string;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, loading, role } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, issued: 0 });
  
  // Low stock alert for admins
  useLowStockAlert();
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ date: string; requests: number }[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchRecentActivity();
      fetchWeeklyData();
    }
  }, [user, role]);

  const fetchStats = async () => {
    const query = role === 'staff' 
      ? supabase.from('device_requests').select('status').eq('requester_id', user?.id)
      : supabase.from('device_requests').select('status');

    const { data } = await query;
    if (data) {
      setStats({
        pending: data.filter(r => r.status === 'pending').length,
        approved: data.filter(r => r.status === 'approved').length,
        rejected: data.filter(r => r.status === 'rejected').length,
        issued: data.filter(r => r.status === 'issued').length,
      });
    }
  };

  const fetchRecentActivity = async () => {
    const query = role === 'staff'
      ? supabase.from('device_requests').select('id, device_type, status, created_at').eq('requester_id', user?.id)
      : supabase.from('device_requests').select('id, device_type, status, created_at');

    const { data } = await query.order('created_at', { ascending: false }).limit(5);
    if (data) setRecentActivity(data);
  };

  const fetchWeeklyData = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const query = role === 'staff'
      ? supabase.from('device_requests').select('created_at').eq('requester_id', user?.id).gte('created_at', sevenDaysAgo.toISOString())
      : supabase.from('device_requests').select('created_at').gte('created_at', sevenDaysAgo.toISOString());

    const { data } = await query;
    if (data) {
      const grouped: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        grouped[date.toISOString().split('T')[0]] = 0;
      }
      data.forEach(r => {
        const date = r.created_at.split('T')[0];
        if (grouped[date] !== undefined) grouped[date]++;
      });
      setWeeklyData(Object.entries(grouped).map(([date, requests]) => ({ date: date.slice(5), requests })));
    }
  };

  const pieData = [
    { name: 'Pending', value: stats.pending, color: 'hsl(var(--chart-1))' },
    { name: 'Approved', value: stats.approved, color: 'hsl(var(--chart-2))' },
    { name: 'Rejected', value: stats.rejected, color: 'hsl(var(--chart-3))' },
    { name: 'Issued', value: stats.issued, color: 'hsl(var(--chart-4))' },
  ].filter(d => d.value > 0);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'issued': return <Package className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const faqs = [
    { q: 'How do I request a device?', a: 'Navigate to "Request Device" from the sidebar and fill out the form with your requirements.' },
    { q: 'How long does approval take?', a: 'Most requests are reviewed within 24-48 business hours.' },
    { q: 'Can I cancel a request?', a: 'Pending requests can be cancelled from the "My Requests" page.' },
    { q: 'Who approves device requests?', a: 'Requests are reviewed by designated approvers in your department.' },
  ];

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your device requests.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rejected}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Issued</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.issued}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Request Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No requests yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Requests Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="requests" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & FAQ */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map(activity => (
                    <div key={activity.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        {statusIcon(activity.status)}
                        <span className="font-medium">{activity.device_type}</span>
                      </div>
                      <Badge variant={activity.status === 'pending' ? 'secondary' : activity.status === 'approved' ? 'default' : 'destructive'}>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No recent activity</p>
              )}
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/my-requests')}>
                View All Requests
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-sm">{faq.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
