import { useState } from 'react';
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
import { CalendarIcon, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [formData, setFormData] = useState({
    device_category: '',
    device_type: '',
    device_model: '',
    quantity: 1,
    purpose: '',
    needed_date: undefined as Date | undefined,
    duration: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.device_category || !formData.device_type || !formData.purpose || !formData.needed_date || !formData.duration) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('device_requests').insert({
      requester_id: user?.id,
      device_category: formData.device_category as any,
      device_type: formData.device_type,
      device_model: formData.device_model || null,
      quantity: formData.quantity,
      purpose: formData.purpose,
      needed_date: formData.needed_date.toISOString().split('T')[0],
      duration: formData.duration,
    });

    setLoading(false);

    if (error) {
      toast({ title: 'Failed to submit request', description: error.message, variant: 'destructive' });
    } else {
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Device Category *</Label>
                  <Select
                    value={formData.device_category}
                    onValueChange={(value) => setFormData({ ...formData, device_category: value })}
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
                  <Input
                    id="device_type"
                    placeholder="e.g., Laptop, Monitor"
                    value={formData.device_type}
                    onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                  />
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
