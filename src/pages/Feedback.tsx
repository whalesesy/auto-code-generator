import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Send, User } from 'lucide-react';
import { format } from 'date-fns';

interface FeedbackItem {
  id: string;
  subject: string;
  message: string;
  recipient_type: string;
  created_at: string;
}

interface UserOption {
  id: string;
  full_name: string;
  email: string;
}

export default function Feedback() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [myFeedback, setMyFeedback] = useState<FeedbackItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [formData, setFormData] = useState({
    recipient_type: 'admin',
    recipient_id: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    fetchMyFeedback();
    fetchUsers();
  }, [user]);

  const fetchMyFeedback = async () => {
    const { data } = await supabase
      .from('feedback')
      .select('id, subject, message, recipient_type, created_at')
      .eq('sender_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) setMyFeedback(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_id')
      .neq('user_id', user?.id);

    if (data) {
      setUsers(data.map(p => ({ id: p.user_id, full_name: p.full_name, email: p.email })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setLoading(true);

    // Base64 encode the message for "encryption"
    const encryptedContent = btoa(formData.message);

    const { error } = await supabase.from('feedback').insert({
      sender_id: user?.id,
      recipient_type: formData.recipient_type,
      recipient_id: formData.recipient_type === 'user' ? formData.recipient_id : null,
      subject: formData.subject,
      message: formData.message,
      encrypted_content: encryptedContent,
    });

    setLoading(false);

    if (error) {
      toast({ title: 'Error sending feedback', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Feedback sent!', description: 'Thank you for your feedback.' });
      setFormData({ recipient_type: 'admin', recipient_id: '', subject: '', message: '' });
      fetchMyFeedback();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Feedback</h1>
          <p className="text-muted-foreground">Send feedback to admins, approvers, or other users</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Send Feedback Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Feedback
              </CardTitle>
              <CardDescription>Your feedback helps improve the system</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Send To *</Label>
                  <Select
                    value={formData.recipient_type}
                    onValueChange={(v) => setFormData({ ...formData, recipient_type: v, recipient_id: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">System Administrator</SelectItem>
                      <SelectItem value="approver">Approvers</SelectItem>
                      <SelectItem value="user">Specific User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recipient_type === 'user' && (
                  <div className="space-y-2">
                    <Label>Select User *</Label>
                    <Select
                      value={formData.recipient_id}
                      onValueChange={(v) => setFormData({ ...formData, recipient_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {u.full_name} ({u.email})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input
                    placeholder="Feedback subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea
                    placeholder="Write your feedback here..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={5}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? 'Sending...' : 'Send Feedback'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Feedback History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                My Feedback History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myFeedback.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {myFeedback.map(item => (
                    <div key={item.id} className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.subject}</span>
                        <span className="text-xs text-muted-foreground capitalize">{item.recipient_type}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No feedback sent yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
