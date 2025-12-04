import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Info, UserPlus, LogIn, Users, Search } from "lucide-react";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-semibold text-primary text-lg">ICT Device Issuance Management Platform</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="secondary" size="sm" className="gap-2">
              <Info className="h-4 w-4" />
              About
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <UserPlus className="h-4 w-4" />
              Register
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <LogIn className="h-4 w-4" />
              Login
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              Demo Accounts
            </Button>
            <Button size="sm" className="ml-2 gap-2">
              <Users className="h-4 w-4" />
              Login
            </Button>
          </nav>
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-center pb-4 gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search FAQs, Help Center," 
              className="pl-10 bg-card border-border"
            />
          </div>
          <Button variant="link" className="text-primary font-medium">
            Demo Accounts
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
