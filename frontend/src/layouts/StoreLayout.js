import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useTheme } from '../contexts/ThemeContext';
import NotificationDropdown from '../components/NotificationDropdown';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '../components/ui/sheet';
import { Badge } from '../components/ui/badge';
import {
  Search, ShoppingCart, User, Menu, Heart, Package,
  LogOut, Sun, Moon, ChevronRight, Minus, Plus, Trash2, RefreshCw,
  Facebook, Instagram, Twitter, Youtube, Phone
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api, { categoriesAPI } from '../lib/api';
import { getImageUrl } from '../lib/utils';

export const StoreHeader = () => {
  const { user, logout, isAdmin, isWholesale } = useAuth();
  const { items, getItemCount, getSubtotal, updateQuantity, removeItem } = useCart();
  const { getWishlistCount } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings/public');
      console.log('Public Settings Response:', response.data);
      setSettings(response.data);
      // Update page title and favicon
      if (response.data.business_name) {
        document.title = response.data.business_name;
      }
      if (response.data.favicon_url) {
        const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
        link.rel = 'icon';
        link.href = response.data.favicon_url;
        document.head.appendChild(link);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 glass border-b" data-testid="store-header">
      {/* Top Bar - Only visible for normal customers (not wholesale) */}
      {!isWholesale && (
        <div className="bg-gradient-to-r from-[#f43397] to-[#5b21b6] text-white py-1.5 px-4 text-center text-sm font-medium">
          Free Shipping on orders above ₹1599
        </div>
      )}

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            {settings?.logo_url ? (
              <img src={getImageUrl(settings.logo_url)} alt="Logo" className="h-10 w-auto object-contain rounded-lg" />
            ) : (
              <div className="h-10 w-10 rounded-xl gradient-hero flex items-center justify-center flex-shrink-0">
                <span className="text-white font-extrabold text-xl">{settings?.business_name?.[0] || 'B'}</span>
              </div>
            )}
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search products, brands and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20"
                data-testid="search-input"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden sm:flex"
              data-testid="theme-toggle"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>

            {/* Wishlist */}
            <Link to="/wishlist" className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="w-5 h-5" />
                {getWishlistCount() > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                    {getWishlistCount()}
                  </span>
                )}
              </Button>
            </Link>

            {/* Notifications */}
            {user && <NotificationDropdown />}

            {/* Cart */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="cart-trigger">
                  <ShoppingCart className="w-5 h-5" />
                  {getItemCount() > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                      {getItemCount()}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md" data-testid="cart-sheet">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Your Cart ({getItemCount()} items)
                  </SheetTitle>
                  <SheetDescription>
                    Review your items and proceed to checkout
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 flex-1 overflow-auto scrollbar-invisible">
                  {items.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground">Your cart is empty</p>
                      <Button onClick={() => {
                        setCartOpen(false);
                        navigate('/products');
                      }} className="mt-4 btn-primary">
                        Start Shopping
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.product.id} className="flex gap-3 p-3 bg-muted/50 rounded-xl">
                          <img
                            src={getImageUrl(item.product.images?.[0]) || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&h=80&fit=crop&crop=center'}
                            alt={item.product.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                            <p className="text-lg font-bold price-tag text-primary mt-1">
                              ₹{item.product.selling_price}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="w-7 h-7"
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="w-7 h-7"
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-7 h-7 text-destructive ml-auto"
                                onClick={() => removeItem(item.product.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {items.length > 0 && (
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Subtotal</span>
                      <span className="price-tag">₹{getSubtotal().toLocaleString()}</span>
                    </div>
                    <Button
                      onClick={() => {
                        setCartOpen(false);
                        if (user) {
                          navigate('/checkout');
                        } else {
                          navigate('/login?redirect=/checkout');
                        }
                      }}
                      className="w-full btn-primary"
                      data-testid="checkout-btn"
                    >
                      Proceed to Checkout
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {/* User Menu - Moved to End */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2" data-testid="user-menu-trigger">
                    <User className="w-5 h-5" />
                    <span className="hidden sm:inline">{user.name?.split(' ')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                    {user.is_wholesale && (
                      <Badge className="mt-1 bg-[#5b21b6]">Wholesale Account</Badge>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/orders')} data-testid="my-orders-link">
                    <Package className="w-4 h-4 mr-2" />
                    My Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/returns')}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Returns
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/wishlist')}>
                    <Heart className="w-4 h-4 mr-2" />
                    Wishlist
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="admin-dashboard-link">
                        Admin Dashboard
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive" data-testid="logout-btn">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => navigate('/login')}
                className="btn-primary text-sm py-2 px-4"
                data-testid="login-btn"
              >
                Login
              </Button>
            )}

            {/* Mobile Menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar - Mobile */}
        <form onSubmit={handleSearch} className="mt-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-muted/50 border-0"
            />
          </div>
        </form>
      </div>

      {/* Categories Bar */}
      <nav className="border-t bg-background/50 hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <ul className="flex items-center gap-6 text-sm font-medium py-2 overflow-x-auto scrollbar-hide">
            <li><Link to="/products" className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">All Products</Link></li>
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/products?category=${category.id}`}
                  className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
};

export const StoreFooter = () => {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings/public');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  return (
    <footer className="bg-slate-900 text-white mt-auto" data-testid="store-footer">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              {settings?.logo_url ? (
                <img src={getImageUrl(settings.logo_url)} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                  <span className="text-white font-extrabold text-xl">{settings?.business_name?.[0] || 'B'}</span>
                </div>
              )}
            </div>
            <p className="text-slate-400 text-sm">
              India's favorite online marketplace for fashion, electronics, and more.
            </p>
            <div className="flex gap-4 mt-6">
              {settings?.facebook_url && (
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-500 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {settings?.instagram_url && (
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-500 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings?.twitter_url && (
                <a href={settings.twitter_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-400 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {settings?.youtube_url && (
                <a href={settings.youtube_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-red-500 transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/products" className="hover:text-white transition-colors">Shop</Link></li>
              <li><Link to="/orders" className="hover:text-white transition-colors">Track Order</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/return-policy" className="hover:text-white transition-colors">Returns & Refunds</Link></li>
              <li><Link to="/shipping" className="hover:text-white transition-colors">Shipping Info</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/return-policy" className="hover:text-white transition-colors">Return Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
          <p>© 2024 {settings?.business_name || 'Amorlias'}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default function StoreLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <StoreFooter />
    </div>
  );
}
