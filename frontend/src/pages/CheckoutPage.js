import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Separator } from '../components/ui/separator';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { ordersAPI } from '../lib/api';
import { toast } from 'sonner';
import { CreditCard, Truck, Shield, ChevronLeft, Smartphone, Banknote, Building } from 'lucide-react';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCart();
  const { user, isWholesale, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const [address, setAddress] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Update address when user data loads
  useEffect(() => {
    if (user) {
      setAddress(prev => {
        const newAddress = {
          ...prev,
          name: user.name || prev.name,
          phone: user.phone || prev.phone,
        };

        // Try to get address from profile (either single address or first of addresses list)
        const savedAddress = user.address || (user.addresses && user.addresses.length > 0 ? user.addresses[0] : null);

        if (savedAddress) {
          newAddress.line1 = savedAddress.line1 || prev.line1;
          newAddress.line2 = savedAddress.line2 || prev.line2;
          newAddress.city = savedAddress.city || prev.city;
          newAddress.state = savedAddress.state || prev.state;
          newAddress.pincode = savedAddress.pincode || prev.pincode;
        }

        return newAddress;
      });
    }
  }, [user]);

  // Redirect to login if not authenticated
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/checkout');
    }
  }, [authLoading, user, navigate]);

  if (!authLoading && !user) {
    return null;
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const gstAmount = subtotal * 0.18; // Simplified GST calculation
  const deliveryFee = subtotal >= 499 ? 0 : 40;
  const total = subtotal + gstAmount + deliveryFee;

  const handleAddressChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!address.name || !address.phone || !address.line1 || !address.city || !address.pincode) {
      toast.error('Please fill all required address fields');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        shipping_address: address,
        payment_method: paymentMethod,
      };

      const response = await ordersAPI.create(orderData);
      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/orders/${response.data.id}`);
    } catch (error) {
      console.error('Order creation error:', error);
      const errorMessage = error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to place order';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Button onClick={() => navigate('/products')} className="btn-primary">
          Continue Shopping
        </Button>
      </div>
    );
  }

  const paymentOptions = [
    { id: 'cod', name: 'Cash on Delivery', icon: Banknote, description: 'Pay when you receive' },
    { id: 'phonepe', name: 'PhonePe', icon: Smartphone, description: 'UPI Payment' },
    { id: 'paytm', name: 'Paytm', icon: Smartphone, description: 'Wallet / UPI' },
    { id: 'upi', name: 'Other UPI', icon: Smartphone, description: 'GPay, BHIM, etc.' },
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard' },
    { id: 'netbanking', name: 'Net Banking', icon: Building, description: 'All major banks' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" data-testid="checkout-page">
      <button
        onClick={() => navigate('/products')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Continue Shopping
      </button>

      <h1 className="text-2xl md:text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={address.name}
                      onChange={(e) => handleAddressChange('name', e.target.value)}
                      placeholder="Enter full name"
                      required
                      data-testid="checkout-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={address.phone}
                      onChange={(e) => handleAddressChange('phone', e.target.value)}
                      placeholder="+91 9876543210"
                      required
                      data-testid="checkout-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line1">Address Line 1 *</Label>
                  <Input
                    id="line1"
                    value={address.line1}
                    onChange={(e) => handleAddressChange('line1', e.target.value)}
                    placeholder="House/Flat No., Building Name"
                    required
                    data-testid="checkout-address1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line2">Address Line 2</Label>
                  <Input
                    id="line2"
                    value={address.line2}
                    onChange={(e) => handleAddressChange('line2', e.target.value)}
                    placeholder="Street, Area, Landmark"
                  />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      placeholder="City"
                      required
                      data-testid="checkout-city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={address.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      placeholder="State"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      value={address.pincode}
                      onChange={(e) => handleAddressChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit PIN"
                      required
                      data-testid="checkout-pincode"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid sm:grid-cols-2 gap-3">
                  {paymentOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === option.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
                        }`}
                    >
                      <RadioGroupItem value={option.id} id={option.id} />
                      <option.icon className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{option.name}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
                {paymentMethod !== 'cod' && (
                  <p className="text-sm text-amber-600 mt-4 p-3 bg-amber-50 rounded-lg">
                    Note: Online payment integration coming soon. Currently, orders will be processed as COD.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-invisible">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-3 items-start">
                      <img
                        src={item.product.images?.[0] || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=60&h=60&fit=crop&crop=center'}
                        alt={item.product.name}
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          <p className="text-sm font-semibold">₹{(item.product.selling_price * item.quantity).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className={deliveryFee === 0 ? 'text-emerald-600' : ''}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="price-tag text-primary">₹{total.toLocaleString()}</span>
                </div>

                {isWholesale && (
                  <p className="text-xs text-[#5b21b6] font-medium p-2 bg-[#5b21b6]/10 rounded">
                    Wholesale prices applied!
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full btn-primary"
                  disabled={loading}
                  data-testid="place-order-btn"
                >
                  {loading ? 'Placing Order...' : `Place Order - ₹${total.toLocaleString()}`}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  Secure & Encrypted Payment
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
