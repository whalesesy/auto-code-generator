import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Clock, CheckCircle, XCircle, Package, FileText, Download, Search } from 'lucide-react';
import { exportToCSV } from '@/lib/export';

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

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

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
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
      approved: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> },
      issued: { variant: 'outline', icon: <Package className="h-3 w-3 mr-1" /> },
      returned: { variant: 'secondary', icon: <Package className="h-3 w-3 mr-1" /> },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleExport = () => {
    exportToCSV(filteredRequests, 'my-requests');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Requests</h1>
            <p className="text-muted-foreground">Track the status of your device requests</p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

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
      </div>
    </DashboardLayout>
  );
}