import FeatureCard from "./FeatureCard";
import { Monitor, Package, CheckCircle, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Monitor,
    title: "Device Requests",
    description: "Submit and track device requests with real-time status updates and automated ticket generation for seamless processing.",
  },
  {
    icon: Package,
    title: "Inventory Management",
    description: "Track stock in/out, view real-time inventory levels, and maintain comprehensive device lifecycle records.",
  },
  {
    icon: CheckCircle,
    title: "Approval Workflow",
    description: "Multi-level approval system with automated notifications, comments, and complete audit trail for accountability.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Generate comprehensive reports and visualize device allocation trends, usage patterns, and approval statistics.",
  },
];

const CapabilitiesSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">
            Platform Capabilities
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools for device lifecycle management designed for enterprise-scale operations
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={feature.title} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <FeatureCard {...feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CapabilitiesSection;
