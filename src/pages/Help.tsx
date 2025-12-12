import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Mail, Phone, MessageCircle, Globe, Facebook, Twitter, Linkedin } from 'lucide-react';
import LiveChatBot from '@/components/LiveChatBot';

const helpTopics = {
  'Getting Started': [
    { q: 'How do I create an account?', a: 'Click the "Sign Up" button on the login page and fill in your details. Your account will be created with Staff role by default.' },
    { q: 'How do I log in?', a: 'Use your registered email and password on the login page. You can also use the demo accounts for testing.' },
    { q: 'What are the different user roles?', a: 'Staff can submit and track requests. Approvers can approve/reject requests. Admins have full system access including inventory management.' },
  ],
  'Device Requests': [
    { q: 'How do I request a device?', a: 'Navigate to "Request Device" from the sidebar, fill out the form with device details, purpose, and duration, then submit.' },
    { q: 'Can I cancel a request?', a: 'Currently, pending requests cannot be cancelled directly. Please contact an administrator for assistance.' },
    { q: 'How long does approval take?', a: 'Approval times vary based on workload. Most requests are reviewed within 24-48 business hours.' },
    { q: 'What happens after approval?', a: 'Once approved, you\'ll receive a notification. The device will be issued to you based on availability.' },
  ],
  'Inventory Management': [
    { q: 'How do I add devices to inventory?', a: 'Admins can add devices via the Inventory page using the "Add Device" button.' },
    { q: 'What device statuses are available?', a: 'Available, Issued, Maintenance, Damaged, and Lost.' },
    { q: 'How do I export inventory data?', a: 'Use the Export button on the Inventory page to download CSV files.' },
  ],
  'Account & Settings': [
    { q: 'How do I change my password?', a: 'Contact an administrator to reset your password.' },
    { q: 'How do I update my profile?', a: 'Click on your profile icon in the header and select "Profile" to update your details.' },
    { q: 'How do I switch between light and dark mode?', a: 'Click the sun/moon icon in the header to toggle themes.' },
  ],
};

const contactInfo = [
  { icon: Mail, label: 'Email', value: 'devicehub68@gmail.com', href: 'mailto:devicehub68@gmail.com' },
  { icon: Phone, label: 'Phone', value: '+254 710 366 205', href: 'tel:+254710366205' },
  { icon: MessageCircle, label: 'Live Chat', value: 'Click the chat button below', href: '#' },
];

const socialLinks = [
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: Globe, label: 'Website', href: '#' },
];

export default function Help() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Help & Support</h1>
          <p className="text-muted-foreground">Find answers to common questions and get support</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* FAQ Section */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(helpTopics).map(([category, questions]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    {questions.map((item, index) => (
                      <AccordionItem key={index} value={`${category}-${index}`}>
                        <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact & Social */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
                <CardDescription>Get in touch with our support team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactInfo.map(({ icon: Icon, label, value, href }) => (
                  <a
                    key={label}
                    href={href}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">{value}</p>
                    </div>
                  </a>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Follow Us</CardTitle>
                <CardDescription>Stay updated on social media</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {socialLinks.map(({ icon: Icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      title={label}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Live Chat Bot */}
      <LiveChatBot />
    </DashboardLayout>
  );
}
