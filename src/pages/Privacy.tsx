import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">Last updated: December 2024</p>

            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
              <p className="text-muted-foreground">
                The ICT Device Issuance Management Platform ("we", "our", or "Platform") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
              <h3 className="text-lg font-medium text-foreground">Personal Information</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Full name and employee ID</li>
                <li>Email address and phone number</li>
                <li>Department and job title</li>
                <li>Profile photo (optional)</li>
              </ul>
              <h3 className="text-lg font-medium text-foreground mt-4">Usage Information</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Device request history and patterns</li>
                <li>Login and session information</li>
                <li>Browser type and IP address</li>
                <li>Platform interaction data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
              <p className="text-muted-foreground">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Process and manage device requests</li>
                <li>Communicate with you about request status</li>
                <li>Maintain and improve the Platform</li>
                <li>Ensure security and prevent fraud</li>
                <li>Generate analytics and reports for inventory management</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground">We may share your information with:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li><strong>Approvers and Administrators:</strong> To process your device requests</li>
                <li><strong>IT Department:</strong> For device tracking and support</li>
                <li><strong>Legal Authorities:</strong> When required by law</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We do not sell or rent your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your data:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication mechanisms</li>
                <li>Regular security assessments</li>
                <li>Access controls and audit logging</li>
                <li>Employee training on data protection</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law. Request history is retained for audit purposes for a minimum of 3 years.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Your Rights</h2>
              <p className="text-muted-foreground">You have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data (subject to legal requirements)</li>
                <li>Object to processing of your data</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to enhance your experience:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li><strong>Essential Cookies:</strong> Required for Platform functionality</li>
                <li><strong>Analytics Cookies:</strong> Help us understand usage patterns</li>
                <li><strong>Preference Cookies:</strong> Remember your settings (e.g., theme)</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                You can manage cookie preferences through our cookie consent banner.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">9. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">10. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy or our data practices, please contact our Data Protection Officer:
              </p>
              <p className="text-muted-foreground">
                Email: privacy@ictmanager.com<br />
                Phone: +1 (555) 123-4567<br />
                Address: 123 Technology Drive, Suite 100, Tech City, TC 12345
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
