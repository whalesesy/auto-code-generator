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
import { toast } from '@/hooks/use-toast';
import { Package, Plus, Edit, Trash2, Download, Printer, Search } from 'lucide-react';
import { exportToCSV } from '@/lib/export';

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

const categories = ['computing', 'mobile', 'peripherals', 'networking', 'audio_visual', 'other'];
const statuses = ['available', 'issued', 'maintenance', 'damaged', 'lost'];

export default function Inventory() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
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
  }, []);

  const fetchDevices = async () => {
    const { data } = await supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setDevices(data);
    setLoading(false);
  };

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

  const openEdit = (device: Device) => {
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">Manage all ICT devices</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToCSV(devices, 'inventory')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
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
                      <TableHead>Location</TableHead>
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
                        <TableCell>{device.location || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
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
    </DashboardLayout>
  );
}
