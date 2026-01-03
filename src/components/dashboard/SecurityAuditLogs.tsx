import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Search, RefreshCw, AlertTriangle, LogIn, LogOut, UserX, Key, Clock } from 'lucide-react';
import { format } from 'date-fns';

import { Json } from '@/integrations/supabase/types';

interface SecurityLog {
  id: string;
  event_type: string;
  user_id: string | null;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Json | null;
  created_at: string;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  login_success: { label: 'Login Success', icon: <LogIn className="h-3 w-3" />, variant: 'default' },
  login_failed: { label: 'Login Failed', icon: <AlertTriangle className="h-3 w-3" />, variant: 'destructive' },
  logout: { label: 'Logout', icon: <LogOut className="h-3 w-3" />, variant: 'secondary' },
  account_locked: { label: 'Account Locked', icon: <UserX className="h-3 w-3" />, variant: 'destructive' },
  password_reset: { label: 'Password Reset', icon: <Key className="h-3 w-3" />, variant: 'outline' },
  mfa_enabled: { label: 'MFA Enabled', icon: <Shield className="h-3 w-3" />, variant: 'default' },
  mfa_disabled: { label: 'MFA Disabled', icon: <Shield className="h-3 w-3" />, variant: 'secondary' },
  signup: { label: 'Signup', icon: <LogIn className="h-3 w-3" />, variant: 'default' },
};

export function SecurityAuditLogs() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('security_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (eventFilter !== 'all') {
        query = query.eq('event_type', eventFilter);
      }

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,ip_address.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching security logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, eventFilter, searchTerm]);

  const getEventConfig = (eventType: string) => {
    return EVENT_TYPE_CONFIG[eventType] || { 
      label: eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      icon: <Clock className="h-3 w-3" />, 
      variant: 'outline' as const 
    };
  };

  const formatUserAgent = (ua: string | null) => {
    if (!ua) return 'Unknown';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Audit Logs
            </CardTitle>
            <CardDescription>Monitor authentication and security events</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or IP address..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>
          <Select value={eventFilter} onValueChange={(value) => { setEventFilter(value); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="login_success">Login Success</SelectItem>
              <SelectItem value="login_failed">Login Failed</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="account_locked">Account Locked</SelectItem>
              <SelectItem value="password_reset">Password Reset</SelectItem>
              <SelectItem value="mfa_enabled">MFA Enabled</SelectItem>
              <SelectItem value="mfa_disabled">MFA Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Browser</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No security logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const config = getEventConfig(log.event_type);
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                          {config.icon}
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.email || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || '—'}
                      </TableCell>
                      <TableCell>
                        {formatUserAgent(log.user_agent)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {logs.length} logs (page {page + 1})
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={logs.length < pageSize || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
