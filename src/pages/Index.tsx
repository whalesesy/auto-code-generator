import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CapabilitiesSection from "@/components/CapabilitiesSection";
import LegalSection from "@/components/LegalSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <CapabilitiesSection />
        <LegalSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
