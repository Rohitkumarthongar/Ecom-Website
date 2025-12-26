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
import { ordersAPI, courierAPI, offersAPI } from '../lib/api';
import { toast } from 'sonner';
import { CreditCard, Truck, Shield, ChevronLeft, Smartphone, Banknote, Building, MapPin, CheckCircle, AlertCircle, Clock, Tag, X } from 'lucide-react';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCart();
  const { user, isWholesale, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [pincodeVerification, setPincodeVerification] = useState({
    checking: false,
    result: null,
    error: null
  });

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

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

  // Delivery fee from pincode verification or default
  const deliveryFee = pincodeVerification.result?.delivery_charge !== undefined
    ? pincodeVerification.result.delivery_charge
    : (subtotal >= 499 ? 0 : 40);

  // Calculate discount
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discountAmount = (subtotal * appliedCoupon.discount_value) / 100;
      if (appliedCoupon.max_discount && discountAmount > appliedCoupon.max_discount) {
        discountAmount = appliedCoupon.max_discount;
      }
    } else {
      discountAmount = appliedCoupon.discount_value;
    }
  }

  const total = Math.max(0, subtotal + gstAmount + deliveryFee - discountAmount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    try {
      const response = await offersAPI.getAll();
      const offers = response.data || [];
      const coupon = offers.find(o => o.coupon_code === couponCode.trim() && o.is_active);

      if (!coupon) {
        toast.error('Invalid coupon code');
        setAppliedCoupon(null);
        return;
      }

      // Validate requirements
      if (subtotal < coupon.min_order_value) {
        toast.error(`Minimum order value of ₹${coupon.min_order_value} required`);
        setAppliedCoupon(null);
        return;
      }

      if (coupon.end_date && new Date(coupon.end_date) < new Date()) {
        toast.error('Coupon has expired');
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon(coupon);
      toast.success('Coupon applied successfully!');
    } catch (error) {
      console.error('Failed to validate coupon:', error);
      toast.error('Failed to validate coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.info('Coupon removed');
  };

  const handleAddressChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));

    // Auto-verify pincode when user enters 6 digits
    if (field === 'pincode' && value.length === 6 && /^\d{6}$/.test(value)) {
      verifyPincode(value);
    } else if (field === 'pincode' && value.length < 6) {
      // Reset verification when pincode is incomplete
      setPincodeVerification({ checking: false, result: null, error: null });
    }
  };

  const verifyPincode = async (pincode) => {
    setPincodeVerification({ checking: true, result: null, error: null });

    try {
      const response = await courierAPI.checkPincode(pincode);
      const result = response.data;

      setPincodeVerification({
        checking: false,
        result: result,
        error: null
      });

      if (result.serviceable) {
        toast.success(`✅ Delivery available to ${result.city}, ${result.state}`);
      } else {
        toast.error(`❌ Sorry, we don't deliver to pincode ${pincode}`);
      }
    } catch (error) {
      console.error('Pincode verification error:', error);
      setPincodeVerification({
        checking: false,
        result: null,
        error: 'Failed to verify pincode'
      });
      toast.error('Failed to verify pincode. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!address.name || !address.phone || !address.line1 || !address.city || !address.pincode) {
      toast.error('Please fill all required address fields');
      return;
    }

    // Check if pincode is verified and serviceable
    if (address.pincode.length === 6) {
      if (pincodeVerification.result === null) {
        toast.error('Please wait for pincode verification to complete');
        return;
      }

      if (pincodeVerification.result && !pincodeVerification.result.serviceable) {
        toast.error('Cannot place order. Delivery not available to this pincode.');
        return;
      }
    }

    // Validate COD availability if COD is selected
    if (paymentMethod === 'cod' && pincodeVerification.result && !pincodeVerification.result.cod) {
      toast.error('Cash on Delivery not available for this pincode. Please select online payment.');
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
                {/* Saved Addresses Selector */}
                {user?.addresses && user.addresses.length > 0 && (
                  <div className="mb-2">
                    <Label className="text-xs text-muted-foreground mb-1 block">Quick Fill from Saved Addresses</Label>
                    <select
                      className="w-full p-2 border rounded-md text-sm bg-background"
                      onChange={(e) => {
                        const idx = e.target.value;
                        if (idx !== "") {
                          const addr = user.addresses[idx];
                          setAddress(prev => ({
                            ...prev,
                            name: user.name || prev.name,
                            phone: user.phone || prev.phone,
                            line1: addr.line1 || '',
                            line2: addr.line2 || '',
                            city: addr.city || '',
                            state: addr.state || '',
                            pincode: addr.pincode || ''
                          }));
                          // Trigger pincode verify if valid
                          if (addr.pincode && addr.pincode.length === 6) verifyPincode(addr.pincode);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Select a saved address...</option>
                      {user.addresses.map((addr, idx) => (
                        <option key={idx} value={idx}>
                          {addr.line1}, {addr.city} - {addr.pincode}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                    <div className="relative">
                      <Input
                        id="pincode"
                        value={address.pincode}
                        onChange={(e) => handleAddressChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit PIN"
                        required
                        data-testid="checkout-pincode"
                        className={`pr-10 ${pincodeVerification.result?.serviceable === false ? 'border-red-500' :
                          pincodeVerification.result?.serviceable === true ? 'border-green-500' : ''
                          }`}
                      />
                      {pincodeVerification.checking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {pincodeVerification.result && !pincodeVerification.checking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {pincodeVerification.result.serviceable ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>

                    {pincodeVerification.result && (
                      <div className={`p-3 rounded-lg text-sm ${pincodeVerification.result.serviceable
                        ? 'bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300'
                        : 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300'
                        }`}>
                        {pincodeVerification.result.serviceable ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Delivery Available</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-medium">Delivery Not Available</span>
                          </div>
                        )}
                      </div>
                    )}

                    {pincodeVerification.error && (
                      <div className="p-3 rounded-lg text-sm bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>Unable to verify pincode. Please contact support.</span>
                        </div>
                      </div>
                    )}
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
                    <span className="text-muted-foreground">Delivery Charges</span>
                    <span className={deliveryFee === 0 ? 'text-emerald-600' : ''}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                  </div>

                  {/* Coupon Input */}
                  <div className="pt-2 pb-2">
                    {!appliedCoupon ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Coupon Code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="h-9"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponCode}
                          className="h-9"
                        >
                          {couponLoading ? '...' : 'Apply'}
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-md p-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-700">
                          <Tag className="w-4 h-4" />
                          <span className="font-medium text-xs">Code {appliedCoupon.coupon_code} applied</span>
                        </div>
                        <button onClick={removeCoupon} className="text-green-700 hover:text-green-900">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Discount</span>
                      <span>-₹{Math.round(discountAmount).toLocaleString()}</span>
                    </div>
                  )}
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
