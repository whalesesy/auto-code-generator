import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Package, Plus, Edit, Trash2, Download, Printer, Search, ArrowUpCircle, ArrowDownCircle, History, AlertTriangle } from 'lucide-react';
import { exportToCSV } from '@/lib/export';
import { checkAndNotifyLowStock } from '@/hooks/useLowStockAlert';

interface Device {
  id: string;
  name: string;
  category: string;
  model: string | null;
  serial_number: string | null;
  status: string;
  location: string | null;
  notes: string | null;
  created_at: string;
}

interface StockMovement {
  id: string;
  device_id: string;
  movement_type: string;
  quantity: number;
  reason: string | null;
  performed_by: string;
  created_at: string;
}

interface DeviceWithStock extends Device {
  stock_in: number;
  stock_out: number;
  current_stock: number;
}

interface PendingRequest {
  id: string;
  device_type: string;
  device_category: string;
  quantity: number;
  status: string;
}

const categories = ['computing', 'mobile', 'peripherals', 'networking', 'audio_visual', 'other'];
const statuses = ['available', 'issued', 'maintenance', 'damaged', 'lost'];
const LOW_STOCK_THRESHOLD = 3;

export default function Inventory() {
  const { role, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DeviceWithStock[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithStock | null>(null);
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockReason, setStockReason] = useState('');
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [selectedStockDevice, setSelectedStockDevice] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'computing',
    model: '',
    serial_number: '',
    status: 'available',
    location: '',
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && role !== 'admin') {
      navigate('/dashboard');
    }
  }, [role, authLoading, navigate]);

  useEffect(() => {
    fetchDevices();
    fetchStockMovements();
    fetchPendingRequests();
  }, []);

  const fetchDevices = async () => {
    const { data: devicesData } = await supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: movementsData } = await supabase
      .from('stock_movements')
      .select('*');

    if (devicesData) {
      const devicesWithStock = devicesData.map(device => {
        const deviceMovements = movementsData?.filter(m => m.device_id === device.id) || [];
        const stock_in = deviceMovements.filter(m => m.movement_type === 'in').reduce((acc, m) => acc + m.quantity, 0);
        const stock_out = deviceMovements.filter(m => m.movement_type === 'out').reduce((acc, m) => acc + m.quantity, 0);
        return {
          ...device,
          stock_in,
          stock_out,
          current_stock: stock_in - stock_out,
        };
      });
      setDevices(devicesWithStock);
    }
    setLoading(false);
  };

  const fetchStockMovements = async () => {
    const { data } = await supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setStockMovements(data);
  };

  const fetchPendingRequests = async () => {
    const { data } = await supabase
      .from('device_requests')
      .select('id, device_type, device_category, quantity, status')
      .in('status', ['pending', 'approved']);
    if (data) setPendingRequests(data);
  };

  // Devices that are requested but might be out of stock
  const outOfStockAlerts = devices.filter(d => d.current_stock === 0);
  const lowStockAlerts = devices.filter(d => d.current_stock > 0 && d.current_stock < LOW_STOCK_THRESHOLD);

  // Calculate requested devices that are out of stock
  const requestedOutOfStock = pendingRequests.filter(req => {
    const matchingDevice = devices.find(d => 
      d.name.toLowerCase().includes(req.device_type.toLowerCase()) ||
      d.category === req.device_category
    );
    return matchingDevice && matchingDevice.current_stock < req.quantity;
  });

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(search.toLowerCase()) ||
      device.serial_number?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || device.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({ title: 'Device name is required', variant: 'destructive' });
      return;
    }

    if (editDevice) {
      const { error } = await supabase
        .from('devices')
        .update({
          name: formData.name,
          category: formData.category as any,
          model: formData.model || null,
          serial_number: formData.serial_number || null,
          status: formData.status as any,
          location: formData.location || null,
          notes: formData.notes || null,
        })
        .eq('id', editDevice.id);

      if (error) {
        toast({ title: 'Error updating device', variant: 'destructive' });
      } else {
        toast({ title: 'Device updated!' });
        fetchDevices();
      }
    } else {
      const { error } = await supabase.from('devices').insert({
        name: formData.name,
        category: formData.category as any,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        status: formData.status as any,
        location: formData.location || null,
        notes: formData.notes || null,
      });

      if (error) {
        toast({ title: 'Error adding device', variant: 'destructive' });
      } else {
        toast({ title: 'Device added!' });
        fetchDevices();
      }
    }

    resetForm();
  };

  const handleStockMovement = async () => {
    if (!selectedDevice && !selectedStockDevice) return;
    if (!user) return;

    const deviceId = selectedDevice?.id || selectedStockDevice;
    const device = devices.find(d => d.id === deviceId);
    
    if (!device) return;

    if (stockAction === 'out' && stockQuantity > device.current_stock) {
      toast({ title: 'Cannot remove more than available stock', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('stock_movements').insert({
      device_id: deviceId,
      movement_type: stockAction,
      quantity: stockQuantity,
      reason: stockReason || null,
      performed_by: user.id,
    });

    if (error) {
      toast({ title: 'Error recording stock movement', variant: 'destructive' });
    } else {
      toast({ title: `Stock ${stockAction === 'in' ? 'added' : 'removed'} successfully!` });
      
      // Check for low stock and notify admins
      const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      if (adminRoles) {
        const adminIds = adminRoles.map(r => r.user_id);
        checkAndNotifyLowStock(deviceId, adminIds);
      }
      
      fetchDevices();
      fetchStockMovements();
      setIsStockDialogOpen(false);
      setStockQuantity(1);
      setStockReason('');
      setSelectedStockDevice('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;

    const { error } = await supabase.from('devices').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error deleting device', variant: 'destructive' });
    } else {
      toast({ title: 'Device deleted!' });
      fetchDevices();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', category: 'computing', model: '', serial_number: '', status: 'available', location: '', notes: '' });
    setIsAddOpen(false);
    setEditDevice(null);
  };

  const openEdit = (device: DeviceWithStock) => {
    setEditDevice(device);
    setFormData({
      name: device.name,
      category: device.category,
      model: device.model || '',
      serial_number: device.serial_number || '',
      status: device.status,
      location: device.location || '',
      notes: device.notes || '',
    });
    setIsAddOpen(true);
  };

  const openStockDialog = (device: DeviceWithStock | null, action: 'in' | 'out') => {
    setSelectedDevice(device);
    setSelectedStockDevice(device?.id || '');
    setStockAction(action);
    setStockQuantity(1);
    setStockReason('');
    setIsStockDialogOpen(true);
  };

  const openQuickStockIn = () => {
    setSelectedDevice(null);
    setSelectedStockDevice('');
    setStockAction('in');
    setStockQuantity(1);
    setStockReason('');
    setIsStockDialogOpen(true);
  };

  const openHistory = (device: DeviceWithStock) => {
    setSelectedDevice(device);
    setIsHistoryOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      available: 'default',
      issued: 'secondary',
      maintenance: 'outline',
      damaged: 'destructive',
      lost: 'destructive',
    };
    return colors[status] || 'secondary';
  };

  const getStockBadgeColor = (stock: number) => {
    if (stock === 0) return 'destructive';
    if (stock <= 2) return 'outline';
    return 'default';
  };

  const handlePrint = () => {
    window.print();
  };

  const deviceHistory = selectedDevice
    ? stockMovements.filter(m => m.device_id === selectedDevice.id)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">Manage all ICT devices and stock levels</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => exportToCSV(devices.map(d => ({
              ...d,
              stock_in: d.stock_in,
              stock_out: d.stock_out,
              current_stock: d.current_stock,
            })), 'inventory')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="secondary" onClick={openQuickStockIn}>
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Quick Stock In
            </Button>
            <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsAddOpen(true); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editDevice ? 'Edit Device' : 'Add New Device'}</DialogTitle>
                  <DialogDescription>
                    {editDevice ? 'Update device details' : 'Add a new device to inventory'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Device name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="Model" />
                    </div>
                    <div className="space-y-2">
                      <Label>Serial Number</Label>
                      <Input value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} placeholder="Serial #" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Location" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button onClick={handleSubmit}>{editDevice ? 'Update' : 'Add'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {(lowStockAlerts.length > 0 || outOfStockAlerts.length > 0) && (
          <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {outOfStockAlerts.length > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  <strong>Out of Stock ({outOfStockAlerts.length}):</strong> {outOfStockAlerts.map(d => d.name).join(', ')}
                </p>
              )}
              {lowStockAlerts.length > 0 && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>Low Stock ({lowStockAlerts.length}):</strong> {lowStockAlerts.map(d => `${d.name} (${d.current_stock})`).join(', ')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stock Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{devices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Total Stock In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {devices.reduce((acc, d) => acc + d.stock_in, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Total Stock Out</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {devices.reduce((acc, d) => acc + d.stock_out, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Current Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {devices.reduce((acc, d) => acc + d.current_stock, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search devices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              All Devices
              <Badge variant="secondary" className="ml-2">{filteredDevices.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Serial #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Stock In</TableHead>
                      <TableHead className="text-center">Stock Out</TableHead>
                      <TableHead className="text-center">Current Stock</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDevices.map(device => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.name}</TableCell>
                        <TableCell className="capitalize">{device.category.replace('_', ' ')}</TableCell>
                        <TableCell>{device.model || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{device.serial_number || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(device.status)} className="capitalize">{device.status}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {device.stock_in}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {device.stock_out}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getStockBadgeColor(device.current_stock)}>
                            {device.current_stock}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openStockDialog(device, 'in')} title="Stock In">
                              <ArrowUpCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openStockDialog(device, 'out')} title="Stock Out" disabled={device.current_stock === 0}>
                              <ArrowDownCircle className="h-4 w-4 text-red-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openHistory(device)} title="View History">
                              <History className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(device)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(device.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Movement Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {stockAction === 'in' ? (
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowDownCircle className="h-5 w-5 text-red-600" />
              )}
              {stockAction === 'in' ? 'Stock In' : 'Stock Out'} - {selectedDevice?.name}
            </DialogTitle>
            <DialogDescription>
              {stockAction === 'in' 
                ? 'Add stock to this device' 
                : `Remove stock from this device (Available: ${selectedDevice?.current_stock})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedDevice && (
              <div className="space-y-2">
                <Label>Select Device</Label>
                <Select value={selectedStockDevice} onValueChange={setSelectedStockDevice}>
                  <SelectTrigger><SelectValue placeholder="Choose a device..." /></SelectTrigger>
                  <SelectContent>
                    {devices.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} (Current: {d.current_stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input 
                type="number" 
                min={1} 
                max={stockAction === 'out' ? selectedDevice?.current_stock : undefined}
                value={stockQuantity} 
                onChange={(e) => setStockQuantity(parseInt(e.target.value) || 1)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea 
                value={stockReason} 
                onChange={(e) => setStockReason(e.target.value)} 
                placeholder={stockAction === 'in' ? 'e.g., New purchase, Return from user' : 'e.g., Issued to John Doe, Sent for repair'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleStockMovement}
              className={stockAction === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {stockAction === 'in' ? 'Add Stock' : 'Remove Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Stock History - {selectedDevice?.name}
            </DialogTitle>
            <DialogDescription>
              View all stock movements for this device
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {deviceHistory.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No stock movements recorded</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviceHistory.map(movement => (
                    <TableRow key={movement.id}>
                      <TableCell>{new Date(movement.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={movement.movement_type === 'in' ? 'default' : 'destructive'} className="capitalize">
                          {movement.movement_type === 'in' ? 'Stock In' : 'Stock Out'}
                        </Badge>
                      </TableCell>
                      <TableCell className={movement.movement_type === 'in' ? 'text-green-600' : 'text-red-600'}>
                        {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity}
                      </TableCell>
                      <TableCell>{movement.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
