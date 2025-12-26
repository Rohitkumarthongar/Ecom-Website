import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import React from 'react';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PopupProvider } from './contexts/PopupContext';

// Layouts
import StoreLayout from './layouts/StoreLayout';
import AdminLayout from './layouts/AdminLayout';

// Store Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import WishlistPage from './pages/WishlistPage';
import NotificationsPage from './pages/NotificationsPage';
import LoginPage from './pages/LoginPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ReturnsPage from './pages/ReturnsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import ReturnPolicyPage from './pages/ReturnPolicyPage';
import ContactPage from './pages/ContactPage';
import ProfilePage from './pages/ProfilePage';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminCategories from './pages/admin/Categories';
import AdminInventory from './pages/admin/Inventory';
import AdminInventoryStatus from './pages/admin/InventoryStatus';
import AdminOrders from './pages/admin/Orders';
import AdminPOS from './pages/admin/POS';
import AdminReturns from './pages/admin/Returns';
import AdminBanners from './pages/admin/Banners';
import AdminOffers from './pages/admin/Offers';
import AdminCouriers from './pages/admin/Couriers';
import AdminShipping from './pages/admin/ShippingManagement';
import AdminPayments from './pages/admin/Payments';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';
import AdminPages from './pages/admin/Pages';
import AdminTeam from './pages/admin/Team';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Store Routes Wrapper
const StoreRoutes = ({ children }) => (
  <StoreLayout>{children}</StoreLayout>
);

// Admin Routes Wrapper
const AdminRoutes = ({ children }) => (
  <ProtectedRoute adminOnly>
    <AdminLayout>{children}</AdminLayout>
  </ProtectedRoute>
);

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Store Routes */}
        <Route path="/" element={<StoreRoutes><HomePage /></StoreRoutes>} />
        <Route path="/products" element={<StoreRoutes><ProductsPage /></StoreRoutes>} />
        <Route path="/products/:id" element={<StoreRoutes><ProductDetailPage /></StoreRoutes>} />
        <Route path="/wishlist" element={<StoreRoutes><WishlistPage /></StoreRoutes>} />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <StoreRoutes><NotificationsPage /></StoreRoutes>
          </ProtectedRoute>
        } />
        <Route path="/login" element={<StoreRoutes><LoginPage /></StoreRoutes>} />
        <Route path="/register" element={<StoreRoutes><LoginPage /></StoreRoutes>} />
        <Route path="/checkout" element={<StoreRoutes><CheckoutPage /></StoreRoutes>} />
        <Route path="/profile" element={
          <ProtectedRoute>
            <StoreRoutes><ProfilePage /></StoreRoutes>
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute>
            <StoreRoutes><OrdersPage /></StoreRoutes>
          </ProtectedRoute>
        } />
        <Route path="/orders/:id" element={
          <ProtectedRoute>
            <StoreRoutes><OrderDetailPage /></StoreRoutes>
          </ProtectedRoute>
        } />
        <Route path="/returns" element={
          <ProtectedRoute>
            <StoreRoutes><ReturnsPage /></StoreRoutes>
          </ProtectedRoute>
        } />
        <Route path="/privacy-policy" element={<StoreRoutes><PrivacyPolicyPage /></StoreRoutes>} />
        <Route path="/return-policy" element={<StoreRoutes><ReturnPolicyPage /></StoreRoutes>} />
        <Route path="/contact" element={<StoreRoutes><ContactPage /></StoreRoutes>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoutes><AdminDashboard /></AdminRoutes>} />
        <Route path="/admin/products" element={<AdminRoutes><AdminProducts /></AdminRoutes>} />
        <Route path="/admin/categories" element={<AdminRoutes><AdminCategories /></AdminRoutes>} />
        <Route path="/admin/inventory" element={<AdminRoutes><AdminInventory /></AdminRoutes>} />
        <Route path="/admin/inventory-status" element={<AdminRoutes><AdminInventoryStatus /></AdminRoutes>} />
        <Route path="/admin/orders" element={<AdminRoutes><AdminOrders /></AdminRoutes>} />
        <Route path="/admin/shipping" element={<AdminRoutes><AdminShipping /></AdminRoutes>} />
        <Route path="/admin/pos" element={<AdminRoutes><AdminPOS /></AdminRoutes>} />
        <Route path="/admin/returns" element={<AdminRoutes><AdminReturns /></AdminRoutes>} />
        <Route path="/admin/banners" element={<AdminRoutes><AdminBanners /></AdminRoutes>} />
        <Route path="/admin/offers" element={<AdminRoutes><AdminOffers /></AdminRoutes>} />
        <Route path="/admin/couriers" element={<AdminRoutes><AdminCouriers /></AdminRoutes>} />
        <Route path="/admin/payments" element={<AdminRoutes><AdminPayments /></AdminRoutes>} />
        <Route path="/admin/reports" element={<AdminRoutes><AdminReports /></AdminRoutes>} />
        <Route path="/admin/settings" element={<AdminRoutes><AdminSettings /></AdminRoutes>} />
        <Route path="/admin/pages" element={<AdminRoutes><AdminPages /></AdminRoutes>} />
        <Route path="/admin/team" element={<AdminRoutes><AdminTeam /></AdminRoutes>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <WishlistProvider>
            <CartProvider>
              <PopupProvider>
                <AppContent />
                <Toaster
                  position="top-right"
                  richColors
                  closeButton
                  toastOptions={{
                    style: {
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    },
                  }}
                />
              </PopupProvider>
            </CartProvider>
          </WishlistProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
