import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Shield, HelpCircle, Phone } from "lucide-react";

const legalItems = [
  {
    icon: FileText,
    title: "Terms & Conditions",
    description: "Review our terms of service and usage policy",
    linkText: "Learn More",
    href: "/terms",
  },
  {
    icon: Shield,
    title: "Privacy Policy",
    description: "Learn how we protect your personal data and privacy",
    linkText: "Learn More",
    href: "/privacy",
  },
  {
    icon: HelpCircle,
    title: "Help Center",
    description: "Access documentation, tutorials, and FAQs",
    linkText: "Visit",
    href: "/help-center",
  },
  {
    icon: Phone,
    title: "Contact Us",
    description: "Get in touch with our support team",
    linkText: "Contact",
    href: "/contact",
  },
];

const LegalSection = () => {
  return (
    <section className="py-20 hero-gradient">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">
            Legal & Support Resources
          </h2>
          <p className="text-muted-foreground">
            Important information and help documentation
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {legalItems.map((item, index) => (
            <div 
              key={item.title}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6 flex flex-col items-center text-center h-full">
                  <div className="p-3 rounded-full bg-primary/10 mb-4">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">{item.description}</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={item.href}>{item.linkText}</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LegalSection;
