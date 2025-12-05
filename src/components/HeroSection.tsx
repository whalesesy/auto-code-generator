import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Shield, BarChart3 } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="hero-gradient py-20 md:py-32">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 animate-fade-in">
          ICT Device Issuance Management Platform
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Streamline device requests, approvals, inventory tracking, and reporting for enterprise-scale organizations
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <Button size="lg" className="gap-2 px-8" onClick={() => navigate('/auth')}>
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" className="gap-2 px-8" onClick={() => navigate('/auth')}>
            View Demo
          </Button>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card/50 border border-border">
            <div className="p-3 rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Role-Based Access</h3>
            <p className="text-sm text-muted-foreground">Staff, Approver, and Admin roles with tailored permissions</p>
          </div>
          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card/50 border border-border">
            <div className="p-3 rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Approval Workflow</h3>
            <p className="text-sm text-muted-foreground">Secure multi-step approval process with notifications</p>
          </div>
          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card/50 border border-border">
            <div className="p-3 rounded-full bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Analytics & Reports</h3>
            <p className="text-sm text-muted-foreground">Real-time dashboards and exportable reports</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
