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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Send, User, Inbox, ArrowLeft, Reply } from 'lucide-react';
import { format } from 'date-fns';

interface FeedbackItem {
  id: string;
  subject: string;
  message: string;
  recipient_type: string;
  recipient_id: string | null;
  sender_id: string;
  created_at: string;
  sender_profile?: { full_name: string; email: string } | null;
}

interface UserOption {
  id: string;
  full_name: string;
  email: string;
}

export default function Feedback() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sentFeedback, setSentFeedback] = useState<FeedbackItem[]>([]);
  const [receivedFeedback, setReceivedFeedback] = useState<FeedbackItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [formData, setFormData] = useState({
    recipient_type: 'admin',
    recipient_id: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    fetchFeedback();
    fetchUsers();
  }, [user]);

  const fetchFeedback = async () => {
    if (!user) return;
    
    // Fetch sent feedback with sender profile
    const { data: sent } = await supabase
      .from('feedback')
      .select('*')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch received feedback based on role and recipient_id
    let receivedQuery = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (role === 'admin') {
      // Admins see feedback sent to 'admin' or directly to them
      receivedQuery = receivedQuery.or(`recipient_type.eq.admin,recipient_id.eq.${user.id}`);
    } else if (role === 'approver') {
      // Approvers see feedback sent to 'approver' or directly to them
      receivedQuery = receivedQuery.or(`recipient_type.eq.approver,recipient_id.eq.${user.id}`);
    } else {
      // Staff only see feedback sent directly to them
      receivedQuery = receivedQuery.eq('recipient_id', user.id);
    }
    
    const { data: received } = await receivedQuery;

    // Fetch sender profiles for received feedback
    if (received && received.length > 0) {
      const senderIds = [...new Set(received.map(f => f.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', senderIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const enrichedReceived = received.map(f => ({
        ...f,
        sender_profile: profileMap.get(f.sender_id) || null,
      }));
      
      setReceivedFeedback(enrichedReceived.filter(f => f.sender_id !== user.id));
    }

    if (sent) setSentFeedback(sent);
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

    if (formData.recipient_type === 'user' && !formData.recipient_id) {
      toast({ title: 'Please select a user', variant: 'destructive' });
      return;
    }

    setLoading(true);

    // Encrypt message content
    const encryptedContent = btoa(unescape(encodeURIComponent(formData.message)));

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
      fetchFeedback();
    }
  };

  const handleReply = async () => {
    if (!selectedFeedback || !replyMessage.trim()) {
      toast({ title: 'Please enter a reply message', variant: 'destructive' });
      return;
    }

    setLoading(true);

    const encryptedContent = btoa(unescape(encodeURIComponent(replyMessage)));

    const { error } = await supabase.from('feedback').insert({
      sender_id: user?.id,
      recipient_type: 'user',
      recipient_id: selectedFeedback.sender_id,
      subject: `Re: ${selectedFeedback.subject}`,
      message: replyMessage,
      encrypted_content: encryptedContent,
    });

    setLoading(false);

    if (error) {
      toast({ title: 'Error sending reply', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Reply sent!' });
      setReplyMessage('');
      setSelectedFeedback(null);
      fetchFeedback();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Feedback</h1>
          <p className="text-muted-foreground">Send and receive feedback from admins, approvers, or other users</p>
        </div>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="inbox">
              Inbox
              {receivedFeedback.length > 0 && (
                <Badge variant="secondary" className="ml-2">{receivedFeedback.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="mt-4">
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
          </TabsContent>

          <TabsContent value="inbox" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="h-5 w-5" />
                  Received Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFeedback ? (
                  <div className="space-y-4">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedFeedback(null)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Inbox
                    </Button>
                    
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-lg">{selectedFeedback.subject}</span>
                        <Badge variant="outline">{selectedFeedback.recipient_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        From: {selectedFeedback.sender_profile?.full_name || 'Unknown'} 
                        ({selectedFeedback.sender_profile?.email || 'No email'})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(selectedFeedback.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      <div className="mt-4 p-4 bg-background rounded border">
                        <p className="whitespace-pre-wrap">{selectedFeedback.message}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Reply className="h-4 w-4" />
                        Reply
                      </Label>
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        rows={4}
                      />
                      <Button onClick={handleReply} disabled={loading || !replyMessage.trim()}>
                        <Send className="h-4 w-4 mr-2" />
                        {loading ? 'Sending...' : 'Send Reply'}
                      </Button>
                    </div>
                  </div>
                ) : receivedFeedback.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {receivedFeedback.map(item => (
                        <div 
                          key={item.id} 
                          className="p-4 rounded-lg bg-muted/50 space-y-2 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setSelectedFeedback(item)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.subject}</span>
                            <Badge variant="outline" className="text-xs">{item.recipient_type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            From: {item.sender_profile?.full_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No feedback received yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sent" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Sent Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sentFeedback.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {sentFeedback.map(item => (
                        <div key={item.id} className="p-4 rounded-lg bg-muted/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.subject}</span>
                            <Badge variant="secondary" className="text-xs capitalize">{item.recipient_type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No feedback sent yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}