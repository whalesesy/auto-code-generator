import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ClipboardList, CheckCircle, XCircle, Package, Clock, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useLowStockAlert } from '@/hooks/useLowStockAlert';
import { OverdueReturnsWidget } from '@/components/dashboard/OverdueReturnsWidget';
import { DeviceReturnTracking } from '@/components/dashboard/DeviceReturnTracking';

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

// Custom 3D-like colors for pie chart
const PIE_COLORS = {
  pending: '#EAB308', // Yellow
  approved: '#22C55E', // Green
  rejected: '#EF4444', // Red
  issued: '#3B82F6', // Blue
};

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
    { name: 'Pending', value: stats.pending, color: PIE_COLORS.pending },
    { name: 'Approved', value: stats.approved, color: PIE_COLORS.approved },
    { name: 'Rejected', value: stats.rejected, color: PIE_COLORS.rejected },
    { name: 'Issued', value: stats.issued, color: PIE_COLORS.issued },
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

  // Custom label for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

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
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Issued</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.issued}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Request Status Distribution</CardTitle>
              <CardDescription>Color-coded status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <defs>
                      {pieData.map((entry, index) => (
                        <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                          <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                        </linearGradient>
                      ))}
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3"/>
                      </filter>
                    </defs>
                    <Pie 
                      data={pieData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={100}
                      innerRadius={40}
                      labelLine={false}
                      label={renderCustomizedLabel}
                      filter="url(#shadow)"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#gradient-${index})`} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value, 'Requests']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry: any) => (
                        <span style={{ color: entry.color, fontWeight: 500 }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No requests yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Requests Over Time
              </CardTitle>
              <CardDescription>Last 7 days activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                    formatter={(value: number) => [value, 'Requests']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                    filter="url(#glow)"
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'white', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Returns Widget - All roles can view their relevant returns */}
        <OverdueReturnsWidget />

        {/* Device Return Tracking - All roles can view their issued devices */}
        <DeviceReturnTracking />

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
