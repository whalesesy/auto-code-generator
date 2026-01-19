import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Shield, Search, RefreshCw, AlertTriangle, LogIn, LogOut, UserX, Key, Clock, Download, FileText, FileSpreadsheet, Radio } from 'lucide-react';
import { format } from 'date-fns';
import { exportToCSV, exportToPDF } from '@/lib/export';
import { toast } from 'sonner';

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
  const [exporting, setExporting] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Helper functions defined before they're used
  const getEventConfig = useCallback((eventType: string) => {
    return EVENT_TYPE_CONFIG[eventType] || { 
      label: eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      icon: <Clock className="h-3 w-3" />, 
      variant: 'outline' as const 
    };
  }, []);

  const formatUserAgent = useCallback((ua: string | null) => {
    if (!ua) return 'Unknown';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  }, []);

  const fetchAllLogsForExport = async () => {
    setExporting(true);
    try {
      let query = supabase
        .from('security_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (eventFilter !== 'all') {
        query = query.eq('event_type', eventFilter);
      }

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,ip_address.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []).map(log => ({
        event_type: getEventConfig(log.event_type).label,
        email: log.email || 'N/A',
        ip_address: log.ip_address || 'N/A',
        user_agent: formatUserAgent(log.user_agent),
        timestamp: format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      }));
    } catch (err) {
      console.error('Failed to fetch logs for export:', err);
      toast.error('Failed to export logs');
      return [];
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    const data = await fetchAllLogsForExport();
    if (data.length > 0) {
      exportToCSV(data, 'security-audit-logs');
      toast.success('Security logs exported to CSV');
    }
  };

  const handleExportPDF = async () => {
    const data = await fetchAllLogsForExport();
    if (data.length > 0) {
      exportToPDF(data, 'security-audit-logs', 'Security Audit Logs Report');
      toast.success('Security logs exported to PDF');
    }
  };

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

  // Real-time subscription for new security events
  useEffect(() => {
    if (!isLive) return;

    console.log('Setting up realtime subscription for security_audit_logs');
    
    const channel = supabase
      .channel('security-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_audit_logs',
        },
        (payload) => {
          console.log('New security event received:', payload);
          const newLog = payload.new as SecurityLog;
          
          // Only add to list if on first page and matches filters
          if (page === 0) {
            const matchesFilter = eventFilter === 'all' || newLog.event_type === eventFilter;
            const matchesSearch = !searchTerm || 
              (newLog.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               newLog.ip_address?.toLowerCase().includes(searchTerm.toLowerCase()));
            
            if (matchesFilter && matchesSearch) {
              setLogs(prev => [newLog, ...prev.slice(0, pageSize - 1)]);
              toast.info(`New security event: ${getEventConfig(newLog.event_type).label}`, {
                description: newLog.email || 'System event',
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [isLive, page, eventFilter, searchTerm, getEventConfig]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Audit Logs
                {isLive && (
                  <Badge variant="outline" className="ml-2 flex items-center gap-1 text-green-600 border-green-600">
                    <Radio className="h-3 w-3 animate-pulse" />
                    Live
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Monitor authentication and security events</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isLive ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLive(!isLive)}
              className={isLive ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <Radio className={`h-4 w-4 mr-2 ${isLive ? 'animate-pulse' : ''}`} />
              {isLive ? 'Live' : 'Paused'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exporting}>
                  <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-pulse' : ''}`} />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
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
