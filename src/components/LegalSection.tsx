import LegalCard from "./LegalCard";

const legalItems = [
  {
    title: "Terms & Conditions",
    description: "Review our terms of service and usage policy",
    linkText: "Learn More",
  },
  {
    title: "Privacy Policy",
    description: "Learn how we protect your personal data and privacy",
    linkText: "Learn More",
  },
  {
    title: "Help Center",
    description: "Access documentation, tutorials, and FAQs",
    linkText: "Visit",
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {legalItems.map((item, index) => (
            <div 
              key={item.title}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <LegalCard {...item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LegalSection;
