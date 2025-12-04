import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { 
  LayoutDashboard, 
  ClipboardPlus, 
  FileText, 
  CheckSquare, 
  Package, 
  BarChart3, 
  MessageSquare,
  HelpCircle,
  Moon,
  Sun,
  Menu,
  LogOut,
  User,
  Monitor
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['staff', 'approver', 'admin'] },
    { label: 'Request Device', icon: ClipboardPlus, href: '/request', roles: ['staff', 'approver', 'admin'] },
    { label: 'My Requests', icon: FileText, href: '/my-requests', roles: ['staff', 'approver', 'admin'] },
    { label: 'Pending Approvals', icon: CheckSquare, href: '/approvals', roles: ['approver', 'admin'] },
    { label: 'Inventory', icon: Package, href: '/inventory', roles: ['admin'] },
    { label: 'Reports', icon: BarChart3, href: '/reports', roles: ['admin'] },
    { label: 'Feedback', icon: MessageSquare, href: '/feedback', roles: ['staff', 'approver', 'admin'] },
    { label: 'Help', icon: HelpCircle, href: '/help', roles: ['staff', 'approver', 'admin'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    role && item.roles.includes(role)
  );

  const NavContent = () => (
    <nav className="space-y-1">
      {filteredNavItems.map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <div className="flex items-center gap-2 mb-6">
                <Monitor className="h-6 w-6 text-primary" />
                <span className="font-bold">ICT Manager</span>
              </div>
              <NavContent />
            </SheetContent>
          </Sheet>

          <Link to="/dashboard" className="flex items-center gap-2">
            <Monitor className="h-6 w-6 text-primary" />
            <span className="font-bold hidden sm:inline">ICT Device Manager</span>
          </Link>

          <div className="flex-1" />

          <NotificationDropdown />

          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user?.email?.split('@')[0]}</span>
                <Badge variant="outline" className="ml-1 capitalize">{role}</Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 border-r min-h-[calc(100vh-3.5rem)] p-4">
          <NavContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
