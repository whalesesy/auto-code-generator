import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Send, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { z } from 'zod';

// Validation schema for device requests
const deviceRequestSchema = z.object({
  device_category: z.string().min(1, 'Device category is required'),
  device_type: z.string().min(1, 'Device type is required').max(100, 'Device type must be less than 100 characters'),
  device_model: z.string().max(100, 'Device model must be less than 100 characters').optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(50, 'Quantity cannot exceed 50'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters').max(1000, 'Purpose must be less than 1000 characters'),
  duration: z.string().min(1, 'Duration is required'),
});

interface InventoryDevice {
  id: string;
  name: string;
  category: string;
  model: string | null;
  current_stock: number;
}

const categories = [
  { value: 'computing', label: 'Computing (Laptops, Desktops)' },
  { value: 'mobile', label: 'Mobile (Phones, Tablets)' },
  { value: 'peripherals', label: 'Peripherals (Keyboards, Mice, Monitors)' },
  { value: 'networking', label: 'Networking (Routers, Switches)' },
  { value: 'audio_visual', label: 'Audio/Visual (Projectors, Cameras)' },
  { value: 'other', label: 'Other' },
];

const durations = [
  { value: '1_day', label: '1 Day' },
  { value: '3_days', label: '3 Days' },
  { value: '1_week', label: '1 Week' },
  { value: '2_weeks', label: '2 Weeks' },
  { value: '1_month', label: '1 Month' },
  { value: 'permanent', label: 'Permanent Assignment' },
];

export default function RequestDevice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inventoryDevices, setInventoryDevices] = useState<InventoryDevice[]>([]);
  const [deviceNotFound, setDeviceNotFound] = useState(false);
  const [formData, setFormData] = useState({
    device_category: '',
    device_type: '',
    device_model: '',
    quantity: 1,
    purpose: '',
    needed_date: undefined as Date | undefined,
    duration: '',
  });

  // Fetch available devices from inventory
  useEffect(() => {
    fetchInventoryDevices();
  }, []);

  const fetchInventoryDevices = async () => {
    const { data: devicesData } = await supabase
      .from('devices')
      .select('*')
      .order('name');

    const { data: movementsData } = await supabase
      .from('stock_movements')
      .select('*');

    if (devicesData) {
      const devicesWithStock = devicesData.map(device => {
        const deviceMovements = movementsData?.filter(m => m.device_id === device.id) || [];
        const stock_in = deviceMovements.filter(m => m.movement_type === 'in').reduce((acc, m) => acc + m.quantity, 0);
        const stock_out = deviceMovements.filter(m => m.movement_type === 'out').reduce((acc, m) => acc + m.quantity, 0);
        return {
          id: device.id,
          name: device.name,
          category: device.category,
          model: device.model,
          current_stock: stock_in - stock_out,
        };
      }).filter(d => d.current_stock > 0); // Only show devices with available stock
      setInventoryDevices(devicesWithStock);
    }
  };

  // Filter devices by selected category
  const filteredDevices = formData.device_category
    ? inventoryDevices.filter(d => d.category === formData.device_category)
    : inventoryDevices;

  // Check if manually entered device exists in inventory
  const checkDeviceExists = (deviceType: string) => {
    if (!deviceType) {
      setDeviceNotFound(false);
      return;
    }
    const exists = inventoryDevices.some(d => 
      d.name.toLowerCase().includes(deviceType.toLowerCase()) ||
      (d.model && d.model.toLowerCase().includes(deviceType.toLowerCase()))
    );
    setDeviceNotFound(!exists);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with Zod schema
    const validation = deviceRequestSchema.safeParse({
      device_category: formData.device_category,
      device_type: formData.device_type.trim(),
      device_model: formData.device_model?.trim() || undefined,
      quantity: formData.quantity,
      purpose: formData.purpose.trim(),
      duration: formData.duration,
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({ title: firstError.message, variant: 'destructive' });
      return;
    }

    if (!formData.needed_date) {
      toast({ title: 'Please select a needed date', variant: 'destructive' });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('device_requests').insert({
      requester_id: user?.id,
      device_category: formData.device_category as any,
      device_type: formData.device_type.trim(),
      device_model: formData.device_model?.trim() || null,
      quantity: formData.quantity,
      purpose: formData.purpose.trim(),
      needed_date: formData.needed_date.toISOString().split('T')[0],
      duration: formData.duration,
    });

    setLoading(false);

    if (error) {
      toast({ title: 'Failed to submit request', description: error.message, variant: 'destructive' });
    } else {
      // Notify all approvers and admins about the new request
      try {
        const { data: approverRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['approver', 'admin']);

        if (approverRoles && approverRoles.length > 0) {
          const notifications = approverRoles
            .filter(r => r.user_id !== user?.id) // Don't notify the requester if they're an admin/approver
            .map(r => ({
              user_id: r.user_id,
              title: 'New Device Request',
              message: `A new request for ${formData.device_type} has been submitted and is awaiting approval.`,
              type: 'info',
            }));

          if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
          }
        }
      } catch (notifyError) {
        console.error('Failed to notify approvers:', notifyError);
      }

      toast({ title: 'Request submitted!', description: 'Your request is now pending approval.' });
      navigate('/my-requests');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Request a Device</CardTitle>
            <CardDescription>Fill out the form below to request ICT equipment</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {deviceNotFound && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Device not found in inventory. Please select from available devices or contact admin.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Device Category *</Label>
                  <Select
                    value={formData.device_category}
                    onValueChange={(value) => setFormData({ ...formData, device_category: value, device_type: '', device_model: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device_type">Device Type *</Label>
                  {filteredDevices.length > 0 ? (
                    <Select
                      value={formData.device_type}
                      onValueChange={(value) => {
                        const device = inventoryDevices.find(d => d.name === value);
                        setFormData({ 
                          ...formData, 
                          device_type: value,
                          device_model: device?.model || ''
                        });
                        setDeviceNotFound(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select device from inventory" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredDevices.map(device => (
                          <SelectItem key={device.id} value={device.name}>
                            {device.name} {device.model ? `(${device.model})` : ''} - {device.current_stock} available
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="device_type"
                      placeholder="e.g., Laptop, Monitor"
                      value={formData.device_type}
                      onChange={(e) => {
                        setFormData({ ...formData, device_type: e.target.value });
                        checkDeviceExists(e.target.value);
                      }}
                    />
                  )}
                  {filteredDevices.length === 0 && formData.device_category && (
                    <p className="text-xs text-muted-foreground">No devices available in this category. Enter device type manually.</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="model">Specific Model (Optional)</Label>
                  <Input
                    id="model"
                    placeholder="e.g., Dell XPS 15"
                    value={formData.device_model}
                    onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                    disabled={filteredDevices.length > 0 && formData.device_type !== ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose / Justification *</Label>
                <Textarea
                  id="purpose"
                  placeholder="Explain why you need this device..."
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date Needed *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.needed_date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.needed_date ? format(formData.needed_date, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.needed_date}
                        onSelect={(date) => setFormData({ ...formData, needed_date: date })}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Duration *</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData({ ...formData, duration: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {durations.map(dur => (
                        <SelectItem key={dur.value} value={dur.value}>{dur.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
