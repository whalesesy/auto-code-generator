import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  ArrowLeft, 
  Search, 
  HelpCircle, 
  Laptop, 
  Users, 
  ClipboardCheck, 
  Settings, 
  Shield, 
  FileText,
  ArrowRight 
} from 'lucide-react';

const helpCategories = [
  {
    icon: Laptop,
    title: 'Device Requests',
    description: 'Learn how to request and manage devices',
    faqs: [
      { q: 'How do I request a device?', a: 'Navigate to "Request Device" from the dashboard sidebar, fill out the form with device details including category, type, quantity, purpose, needed date, and duration, then submit your request.' },
      { q: 'What happens after I submit a request?', a: 'Your request goes to the approval queue. Approvers will review it and either approve or reject it. You\'ll receive a notification once a decision is made.' },
      { q: 'Can I edit or cancel a pending request?', a: 'Currently, pending requests cannot be directly edited or cancelled. Please contact an administrator for assistance with modifications.' },
      { q: 'How long does approval typically take?', a: 'Most requests are reviewed within 24-48 business hours, depending on approver availability and request complexity.' },
    ],
  },
  {
    icon: ClipboardCheck,
    title: 'Approval Process',
    description: 'Understanding the approval workflow',
    faqs: [
      { q: 'Who approves device requests?', a: 'Users with the Approver or Admin role can review and approve/reject device requests.' },
      { q: 'What criteria are used for approval?', a: 'Approvers consider the business justification, device availability, user\'s request history, and organizational policies.' },
      { q: 'Can I appeal a rejected request?', a: 'Yes, you can submit a new request with additional justification or contact the approver directly through the feedback system.' },
    ],
  },
  {
    icon: Users,
    title: 'User Roles',
    description: 'Understanding permissions and access',
    faqs: [
      { q: 'What are the different user roles?', a: 'There are three roles: Staff (submit and track requests), Approver (review and approve/reject requests), and Admin (full system access including inventory management).' },
      { q: 'How do I get elevated permissions?', a: 'Role changes must be approved by an administrator. Contact your IT department or use the feedback system to request a role change.' },
      { q: 'Can I have multiple roles?', a: 'Users are assigned a single primary role that determines their access level and permissions.' },
    ],
  },
  {
    icon: Settings,
    title: 'Account Settings',
    description: 'Managing your profile and preferences',
    faqs: [
      { q: 'How do I update my profile information?', a: 'Click on your profile icon in the header and select "Profile" to update your name, department, phone number, and other details.' },
      { q: 'How do I change my password?', a: 'Use the "Forgot Password" option on the login page to reset your password via email.' },
      { q: 'How do I switch between light and dark mode?', a: 'Click the sun/moon icon in the header to toggle between themes. Your preference is saved automatically.' },
    ],
  },
  {
    icon: Shield,
    title: 'Security & Privacy',
    description: 'Data protection and security measures',
    faqs: [
      { q: 'How is my data protected?', a: 'We use industry-standard encryption, secure authentication, and regular security audits to protect your information.' },
      { q: 'Who can see my request history?', a: 'Only you, approvers reviewing your requests, and administrators can see your request history.' },
      { q: 'How long is my data retained?', a: 'Request history is retained for audit purposes for a minimum of 3 years. See our Privacy Policy for complete details.' },
    ],
  },
  {
    icon: FileText,
    title: 'Reports & Export',
    description: 'Generating and exporting data',
    faqs: [
      { q: 'How do I export my request history?', a: 'Navigate to "My Requests" and click the Export button to download your request history as a CSV file.' },
      { q: 'What reports are available?', a: 'Depending on your role, you can access full system reports, inventory reports, requests reports, and personal request history.' },
      { q: 'Can I schedule automatic reports?', a: 'Automatic report scheduling is currently not available. You can manually export reports at any time.' },
    ],
  },
];

export default function HelpCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = helpCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(
      faq => 
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => searchQuery === '' || category.faqs.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="text-center mb-12">
          <div className="inline-flex p-3 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Help Center</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Find answers to common questions and learn how to make the most of the ICT Device Issuance Platform.
          </p>
          
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
          {helpCategories.slice(0, 6).map(({ icon: Icon, title }) => (
            <a
              key={title}
              href={`#${title.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="font-medium text-sm">{title}</span>
            </a>
          ))}
        </div>

        {/* FAQ Categories */}
        <div className="max-w-4xl mx-auto space-y-8">
          {filteredCategories.map(({ icon: Icon, title, description, faqs }) => (
            <Card key={title} id={title.toLowerCase().replace(/\s+/g, '-')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`${title}-${index}`}>
                      <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact CTA */}
        <Card className="max-w-4xl mx-auto mt-12 bg-primary/5 border-primary/20">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 p-6">
            <div>
              <h3 className="text-lg font-semibold">Still need help?</h3>
              <p className="text-muted-foreground">Our support team is ready to assist you.</p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/contact">
                Contact Support
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
