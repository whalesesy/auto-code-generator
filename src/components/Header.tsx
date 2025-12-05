import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, LogIn, UserPlus, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const Header = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-semibold text-primary text-lg hidden sm:inline">ICT Device Issuance Platform</span>
            <span className="font-semibold text-primary text-lg sm:hidden">ICT Platform</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-muted-foreground"
              onClick={() => navigate('/auth')}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Register</span>
            </Button>
            <Button 
              size="sm" 
              className="gap-2"
              onClick={() => navigate('/auth')}
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
