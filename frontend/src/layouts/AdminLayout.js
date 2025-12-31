import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import NotificationDropdown from '../components/NotificationDropdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag, Image as ImageIcon,
  Percent, Truck, CreditCard, Settings, BarChart3, LogOut, Menu, X,
  Sun, Moon, Store, ChevronRight, RefreshCcw, FileText, Warehouse
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn, getImageUrl } from '../lib/utils';
import api from '../lib/api';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Package, label: 'Products', path: '/admin/products' },
  { icon: Tag, label: 'Categories', path: '/admin/categories' },
  { icon: Warehouse, label: 'Inventory', path: '/admin/inventory' },
  { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
  { icon: Truck, label: 'Shipping', path: '/admin/shipping' },
  { icon: Store, label: 'Offline Sales (POS)', path: '/admin/pos' },
  { icon: RefreshCcw, label: 'Returns', path: '/admin/returns' },
  { icon: ImageIcon, label: 'Banners', path: '/admin/banners' },
  { icon: Percent, label: 'Offers', path: '/admin/offers' },
  { icon: Settings, label: 'Couriers', path: '/admin/couriers' },
  { icon: CreditCard, label: 'Payment Gateways', path: '/admin/payments' },
  { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
  { icon: Warehouse, label: 'Inventory Status', path: '/admin/inventory-status' },
  { icon: FileText, label: 'Pages', path: '/admin/pages' },
  { icon: Users, label: 'Team', path: '/admin/team' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [settings, setSettings] = useState(null);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings/public');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      setTimeout(() => {
        fetchSettings(); // Add small delay to ensure backend is updated
      }, 500);
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  // Force dark theme for admin
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme !== 'dark') {
        document.documentElement.classList.remove('dark');
      }
    };
  }, []);

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white" data-testid="admin-layout">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 glass-dark border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <span className="font-bold">Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <NotificationDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Users className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/')}>
                  <Store className="w-4 h-4 mr-2" />
                  View Store
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-400">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className={cn(
          "hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-slate-800/50 border-r border-slate-700 transition-all duration-300 z-40",
          collapsed ? "w-20" : "w-64"
        )}>
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
            {!collapsed && (
              <Link to="/admin" className="flex items-center gap-2">
                {settings?.logo_url ? (
                  <img src={getImageUrl(settings.logo_url)} alt="Logo" className="h-10 w-auto object-contain rounded-lg" />
                ) : (
                  <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                    <span className="text-white font-extrabold text-xl">{settings?.business_name?.[0] || 'B'}</span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-slate-400">Admin Panel</span>
                </div>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-400 hover:text-white"
            >
              <ChevronRight className={cn("w-5 h-5 transition-transform", collapsed && "rotate-180")} />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4 scrollbar-invisible">
            <nav className="px-2 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive(item.path)
                      ? "bg-primary text-white font-medium"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700">
            <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.phone}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="flex-1 text-xs"
                >
                  <Store className="w-4 h-4 mr-1" />
                  Store
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="flex-1 text-xs text-red-400 hover:text-red-300"
                  data-testid="admin-logout-btn"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 bg-slate-800 border-r border-slate-700">
              <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
                <Link to="/admin" className="flex items-center gap-2">
                  {settings?.logo_url ? (
                    <img src={getImageUrl(settings.logo_url)} alt="Logo" className="h-10 w-auto object-contain rounded-lg" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                      <span className="text-white font-extrabold text-xl">{settings?.business_name?.[0] || 'B'}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-slate-400">Admin Panel</span>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <ScrollArea className="h-[calc(100vh-4rem)] scrollbar-invisible">
                <nav className="p-4 space-y-1">
                  {menuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                        isActive(item.path)
                          ? "bg-primary text-white font-medium"
                          : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </ScrollArea>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 min-h-screen transition-all duration-300",
          collapsed ? "lg:ml-20" : "lg:ml-64"
        )}>
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
