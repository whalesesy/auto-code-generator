import { ArrowRight } from "lucide-react";

interface LegalCardProps {
  title: string;
  description: string;
  linkText: string;
}

const LegalCard = ({ title, description, linkText }: LegalCardProps) => {
  return (
    <div className="bg-card rounded-xl p-6 card-shadow hover:card-shadow-hover transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      <a href="#" className="inline-flex items-center gap-1 text-primary font-medium text-sm hover:underline">
        {linkText}
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
};

export default LegalCard;
