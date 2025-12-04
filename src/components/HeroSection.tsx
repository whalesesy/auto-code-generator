import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="hero-gradient py-20 md:py-32">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 animate-fade-in">
          ICT Device Issuance Management Platform
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Streamline device requests, approvals, inventory tracking, and reporting for enterprise-scale organizations
        </p>
        <Button size="lg" className="gap-2 px-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Get Started
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </section>
  );
};

export default HeroSection;
