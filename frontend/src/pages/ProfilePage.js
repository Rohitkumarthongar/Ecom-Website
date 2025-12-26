import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { ordersAPI, notificationsAPI, sellerRequestsAPI, pincodeAPI } from '../lib/api';
import { toast } from 'sonner';
import { User, MapPin, Package, Bell, Store, Plus, Check, X, Truck, Edit, Save } from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [showSellerDialog, setShowSellerDialog] = useState(false);
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    addresses: [],
  });

  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  });

  const [sellerRequest, setSellerRequest] = useState({
    business_name: '',
    gst_number: '',
  });

  const [pincodeValid, setPincodeValid] = useState(null);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        addresses: user.addresses || [],
      });
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [ordersRes, notifRes] = await Promise.all([
        ordersAPI.getUserOrders(),
        notificationsAPI.getUser(),
      ]);
      setOrders(ordersRes.data || []);
      setNotifications(notifRes.data.notifications || []);
      setUnreadCount(notifRes.data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ name: profile.name, email: profile.email });
      toast.success('Profile updated');
      setEditMode(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const verifyPincode = async (pincode) => {
    if (pincode.length === 6) {
      try {
        const response = await pincodeAPI.verify(pincode);
        setPincodeValid(response.data);
        if (response.data.valid) {
          toast.success(`Serviceable: ${response.data.region}`);
        } else {
          toast.error('This pincode is not serviceable');
        }
      } catch (error) {
        setPincodeValid(null);
      }
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.name || !newAddress.line1 || !newAddress.city || !newAddress.pincode) {
      toast.error('Please fill required fields');
      return;
    }

    const updatedAddresses = [...profile.addresses, { ...newAddress, id: Date.now().toString() }];
    
    try {
      await updateProfile({ addresses: updatedAddresses });
      setProfile({ ...profile, addresses: updatedAddresses });
      setShowAddressDialog(false);
      setNewAddress({
        label: 'Home',
        name: '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
        isDefault: false,
      });
      toast.success('Address added');
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const handleRemoveAddress = async (addressId) => {
    const updatedAddresses = profile.addresses.filter(a => a.id !== addressId);
    try {
      await updateProfile({ addresses: updatedAddresses });
      setProfile({ ...profile, addresses: updatedAddresses });
      toast.success('Address removed');
    } catch (error) {
      toast.error('Failed to remove address');
    }
  };

  const handleRequestSeller = async () => {
    try {
      await sellerRequestsAPI.request(sellerRequest);
      toast.success('Seller request submitted! You will be notified once approved.');
      setShowSellerDialog(false);
    } catch (error) {
      toast.error('Failed to submit request');
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark read');
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all read');
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p>Please login to view your profile</p>
        <Button onClick={() => navigate('/login')} className="mt-4 btn-primary">Login</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" data-testid="profile-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Account</h1>
          <p className="text-muted-foreground">Manage your profile and preferences</p>
        </div>
        {!user.is_seller && (
          <Dialog open={showSellerDialog} onOpenChange={setShowSellerDialog}>
            <DialogTrigger asChild>
              <Button className="btn-secondary">
                <Store className="w-4 h-4 mr-2" />
                Become a Seller
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Seller Access</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  As a seller, you'll get access to wholesale prices on bulk orders.
                </p>
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input
                    value={sellerRequest.business_name}
                    onChange={(e) => setSellerRequest({ ...sellerRequest, business_name: e.target.value })}
                    placeholder="Your business name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                  id="gst_number"
                    required
                    value={sellerRequest.gst_number}
                    onChange={(e) => setSellerRequest({ ...sellerRequest, gst_number: e.target.value.toUpperCase() })}
                    placeholder="e.g., 29ABCDE1234F1Z5"
                  />
                </div>
                <Button onClick={handleRequestSeller} className="w-full btn-primary">
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {user.is_seller && (
          <Badge className="bg-violet-500/20 text-violet-600 px-4 py-2">
            <Store className="w-4 h-4 mr-2" />
            Verified Seller
          </Badge>
        )}
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            Notifications
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              {!editMode ? (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <Button size="sm" onClick={handleSaveProfile} className="btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={profile.phone} disabled />
                  <p className="text-xs text-muted-foreground">Phone number cannot be changed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Saved Addresses</h3>
              <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Address
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Address</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={newAddress.name}
                          onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                          placeholder="Full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          placeholder="Phone number"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Address Line 1 *</Label>
                      <Input
                        value={newAddress.line1}
                        onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                        placeholder="House/Flat No., Building"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address Line 2</Label>
                      <Input
                        value={newAddress.line2}
                        onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                        placeholder="Street, Area"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>City *</Label>
                        <Input
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          placeholder="City"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input
                          value={newAddress.state}
                          onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          placeholder="State"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pincode *</Label>
                        <Input
                          value={newAddress.pincode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setNewAddress({ ...newAddress, pincode: val });
                            if (val.length === 6) verifyPincode(val);
                          }}
                          placeholder="6-digit"
                          className={pincodeValid?.valid === false ? 'border-red-500' : ''}
                        />
                        {pincodeValid && (
                          <p className={`text-xs ${pincodeValid.valid ? 'text-emerald-500' : 'text-red-500'}`}>
                            {pincodeValid.valid ? `✓ ${pincodeValid.region}` : 'Not serviceable'}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button onClick={handleAddAddress} className="w-full btn-primary">
                      Save Address
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {profile.addresses.length === 0 ? (
              <Card className="p-8 text-center">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No saved addresses</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {profile.addresses.map((address) => (
                  <Card key={address.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="outline" className="mb-2">{address.label}</Badge>
                          <p className="font-medium">{address.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {address.line1}
                            {address.line2 && `, ${address.line2}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.city}, {address.state} - {address.pincode}
                          </p>
                          {address.phone && (
                            <p className="text-sm text-muted-foreground mt-1">📞 {address.phone}</p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => handleRemoveAddress(address.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-6">
          <div className="space-y-4">
            {orders.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No orders yet</p>
                <Button onClick={() => navigate('/products')} className="mt-4 btn-primary">
                  Start Shopping
                </Button>
              </Card>
            ) : (
              orders.slice(0, 5).map((order) => (
                <Card key={order.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/orders/${order.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">#{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">₹{order.grand_total.toLocaleString()}</p>
                        <Badge className={`status-badge status-${order.status}`}>{order.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {orders.length > 5 && (
              <Button variant="outline" className="w-full" onClick={() => navigate('/orders')}>
                View All Orders
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Recent Notifications</h3>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllRead}>
                  Mark All Read
                </Button>
              )}
            </div>
            
            {notifications.length === 0 ? (
              <Card className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No notifications</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <Card 
                    key={notif.id} 
                    className={`cursor-pointer transition-colors ${!notif.read ? 'bg-primary/5 border-primary/20' : ''}`}
                    onClick={() => {
                      markNotificationRead(notif.id);
                      if (notif.data?.order_id) navigate(`/orders/${notif.data.order_id}`);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className={`p-2 rounded-full ${!notif.read ? 'bg-primary/10' : 'bg-muted'}`}>
                            {notif.type === 'order_placed' && <Package className="w-4 h-4 text-primary" />}
                            {notif.type === 'order_update' && <Truck className="w-4 h-4 text-blue-500" />}
                            {notif.type === 'seller_approved' && <Check className="w-4 h-4 text-emerald-500" />}
                            {!['order_placed', 'order_update', 'seller_approved'].includes(notif.type) && <Bell className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium">{notif.title}</p>
                            <p className="text-sm text-muted-foreground">{notif.message}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notif.created_at).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
