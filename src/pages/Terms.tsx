import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText } from 'lucide-react';

export default function Terms() {
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
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Terms & Conditions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">Last updated: December 2024</p>

            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using the ICT Device Issuance Management Platform ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. User Accounts</h2>
              <p className="text-muted-foreground">
                To use certain features of the Platform, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Keep your password confidential and secure</li>
                <li>Be responsible for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. Device Request and Usage</h2>
              <p className="text-muted-foreground">
                When requesting devices through the Platform, you agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Submit accurate information about your device requirements</li>
                <li>Use requested devices only for legitimate business purposes</li>
                <li>Return devices in the same condition as received (normal wear excepted)</li>
                <li>Report any damage, loss, or malfunction immediately</li>
                <li>Follow all organizational policies regarding device usage</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. User Responsibilities</h2>
              <p className="text-muted-foreground">Users are responsible for:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Complying with all applicable laws and regulations</li>
                <li>Maintaining the security of issued devices</li>
                <li>Not sharing access credentials with others</li>
                <li>Using the Platform in a manner that does not interfere with other users</li>
                <li>Not attempting to gain unauthorized access to any system or data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Liability and Damages</h2>
              <p className="text-muted-foreground">
                Users may be held financially responsible for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Lost or stolen devices under their care</li>
                <li>Damage beyond normal wear and tear</li>
                <li>Late returns (applicable fees may apply)</li>
                <li>Unauthorized modifications to devices</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">6. Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content, features, and functionality of the Platform are owned by the organization and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Termination</h2>
              <p className="text-muted-foreground">
                We reserve the right to suspend or terminate your account and access to the Platform at our discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. We will notify users of significant changes via email or Platform notification. Continued use of the Platform after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">9. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these Terms, please contact us at:
              </p>
              <p className="text-muted-foreground">
                Email: legal@ictmanager.com<br />
                Phone: +1 (555) 123-4567
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
