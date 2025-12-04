import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Clock, CheckCircle, XCircle, Package, FileText, Download } from 'lucide-react';
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

export default function MyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
      approved: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> },
      issued: { variant: 'outline', icon: <Package className="h-3 w-3 mr-1" /> },
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
    exportToCSV(requests, 'my-requests');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Requests</h1>
            <p className="text-muted-foreground">Track the status of your device requests</p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Request History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : requests.length > 0 ? (
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
                    {requests.map(request => (
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
                <p className="text-muted-foreground">No requests yet</p>
                <Button className="mt-4" onClick={() => window.location.href = '/request'}>
                  Create Your First Request
                </Button>
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
