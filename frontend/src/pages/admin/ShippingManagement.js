import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import { ordersAPI, courierAPI } from '../../lib/api';
import { toast } from 'sonner';
import { 
  Truck, Package, Search, MapPin, FileText, Printer, 
  RotateCcw, Ban, Eye, Clock, CheckCircle, AlertCircle,
  Download, RefreshCw, Phone, User, MapPinIcon
} from 'lucide-react';

export default function ShippingManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showPincodeDialog, setPincodeDialog] = useState(false);
  const [pincodeCheck, setPincodeCheck] = useState({ pincode: '', result: null });
  const [returnData, setReturnData] = useState({ reason: '', quantity: 1, weight: '500' });
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getAll({ limit: 100 });
      
      // The axios response has the data in response.data
      // The backend returns { orders: [...], total: ..., page: ..., limit: ... }
      const ordersData = response.data?.orders || [];
      
      setOrders(ordersData);
      
      // If no orders found, show a message
      if (ordersData.length === 0) {
        toast.info('No orders found. Create some orders to test shipping functionality.');
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleShipOrder = async (orderId) => {
    try {
      const result = await courierAPI.shipOrder(orderId);
      const awb = result.data?.awb || result.data?.tracking_number || 'Generated';
      toast.success(`Order shipped successfully! AWB: ${awb}`);
      fetchOrders();
    } catch (error) {
      console.error('Ship order error:', error);
      toast.error(error.response?.data?.detail || 'Failed to ship order');
    }
  };

  const handleTrackOrder = async (order) => {
    try {
      setSelectedOrder(order);
      const result = await courierAPI.trackOrder(order.id);
      setTrackingData(result.data);
      setShowTrackingDialog(true);
    } catch (error) {
      console.error('Track order error:', error);
      toast.error(error.response?.data?.detail || 'Failed to track order');
    }
  };

  const handlePrintLabel = async (orderId) => {
    try {
      const result = await courierAPI.getLabel(orderId);
      const labelUrl = result.data?.label_url || result.data?.url;
      if (labelUrl) {
        window.open(labelUrl, '_blank');
        toast.success('Label opened in new tab');
      } else {
        toast.error('No label URL received');
      }
    } catch (error) {
      console.error('Print label error:', error);
      toast.error(error.response?.data?.detail || 'Failed to get label');
    }
  };

  const handlePrintInvoice = async (orderId) => {
    try {
      const result = await courierAPI.getInvoice(orderId);
      if (result.data.invoice_url) {
        window.open(result.data.invoice_url, '_blank');
        toast.success('Invoice opened in new tab');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to get invoice');
    }
  };

  const handleCancelShipment = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this shipment?')) return;
    
    try {
      await courierAPI.cancelShipment(orderId);
      toast.success('Shipment cancelled successfully');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel shipment');
    }
  };

  const handleCreateReturn = async () => {
    try {
      await courierAPI.createReturn(selectedOrder.id, returnData);
      toast.success('Return pickup scheduled successfully');
      setShowReturnDialog(false);
      setReturnData({ reason: '', quantity: 1, weight: '500' });
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create return');
    }
  };

  const handlePincodeCheck = async () => {
    if (!pincodeCheck.pincode || pincodeCheck.pincode.length !== 6) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }
    
    try {
      const result = await courierAPI.checkPincode(pincodeCheck.pincode);
      setPincodeCheck({ ...pincodeCheck, result: result.data });
    } catch (error) {
      console.error('Pincode check error:', error);
      toast.error('Failed to check pincode');
    }
  };

  const handleDownloadPicklist = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await courierAPI.getPicklist(today);
      
      // Convert to CSV and download
      const csvContent = [
        ['Order Number', 'Customer', 'Product', 'SKU', 'Quantity', 'AWB', 'Payment Method'].join(','),
        ...result.data.picklist.map(item => [
          item.order_number,
          item.customer_name,
          item.product_name,
          item.sku,
          item.quantity,
          item.awb,
          item.payment_method
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `picklist-${today}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Picklist downloaded successfully');
    } catch (error) {
      toast.error('Failed to download picklist');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-500/20 text-yellow-400',
      'confirmed': 'bg-blue-500/20 text-blue-400',
      'processing': 'bg-purple-500/20 text-purple-400',
      'shipped': 'bg-green-500/20 text-green-400',
      'delivered': 'bg-emerald-500/20 text-emerald-400',
      'cancelled': 'bg-red-500/20 text-red-400',
      'returned': 'bg-orange-500/20 text-orange-400'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  };

  const filterOrdersByTab = (orders, tab) => {
    switch (tab) {
      case 'all':
        return orders;
      case 'ready-to-ship':
        return orders.filter(o => ['confirmed', 'processing', 'pending'].includes(o.status));
      case 'shipped':
        return orders.filter(o => o.status === 'shipped');
      case 'delivered':
        return orders.filter(o => o.status === 'delivered');
      case 'returns':
        return orders.filter(o => o.status === 'returned');
      default:
        return orders;
    }
  };

  const filteredOrders = filterOrdersByTab(orders, activeTab).filter(order =>
    order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    order.shipping_address?.name?.toLowerCase().includes(search.toLowerCase()) ||
    order.tracking_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="shipping-management">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Shipping Management</h1>
          <p className="text-slate-400">Manage orders, tracking, and courier services</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showPincodeDialog} onOpenChange={setPincodeDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MapPin className="w-4 h-4 mr-2" />
                Check Pincode
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle>Pincode Serviceability Check</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter pincode"
                    value={pincodeCheck.pincode}
                    onChange={(e) => setPincodeCheck({ ...pincodeCheck, pincode: e.target.value })}
                    className="input-admin"
                  />
                  <Button onClick={handlePincodeCheck}>Check</Button>
                </div>
                {pincodeCheck.result && (
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {pincodeCheck.result.serviceable ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className="font-medium">
                        {pincodeCheck.result.serviceable ? 'Serviceable' : 'Not Serviceable'}
                      </span>
                    </div>
                    {pincodeCheck.result.serviceable && (
                      <div className="text-sm space-y-1">
                        <p><strong>City:</strong> {pincodeCheck.result.city}</p>
                        <p><strong>State:</strong> {pincodeCheck.result.state}</p>
                        <p><strong>COD:</strong> {pincodeCheck.result.cod ? 'Available' : 'Not Available'}</p>
                        <p><strong>Prepaid:</strong> {pincodeCheck.result.prepaid ? 'Available' : 'Not Available'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={handleDownloadPicklist} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Picklist
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800">
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="ready-to-ship">Ready to Ship</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-4 mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search orders, customers, AWB..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 input-admin"
            />
          </div>
          <Button onClick={fetchOrders} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <TabsContent value={activeTab}>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Order</TableHead>
                    <TableHead className="text-slate-400">Customer</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">AWB</TableHead>
                    <TableHead className="text-slate-400">Amount</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id} className="border-slate-700">
                        <TableCell>
                          <div>
                            <span className="font-medium">{order.order_number}</span>
                            <p className="text-xs text-slate-400">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{order.shipping_address?.name || 'N/A'}</span>
                            <p className="text-xs text-slate-400">{order.shipping_address?.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {order.tracking_number || 'Not Generated'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">₹{order.grand_total}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {['all', 'ready-to-ship'].includes(activeTab) && ['confirmed', 'processing', 'pending'].includes(order.status) && (
                              <Button
                                size="sm"
                                onClick={() => handleShipOrder(order.id)}
                                className="bg-primary hover:bg-primary/90"
                              >
                                <Truck className="w-4 h-4 mr-1" />
                                Ship
                              </Button>
                            )}
                            
                            {order.tracking_number && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTrackOrder(order)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrintLabel(order.id)}
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            
                            {order.status === 'shipped' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelShipment(order.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {['delivered', 'shipped'].includes(order.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowReturnDialog(true);
                                }}
                                className="text-orange-400 hover:text-orange-300"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tracking Dialog */}
      <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>Order Tracking - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {trackingData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">AWB Number</Label>
                  <p className="font-mono">{trackingData.awb}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Current Status</Label>
                  <Badge className={getStatusColor(trackingData.current_status)}>
                    {trackingData.current_status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-slate-400">Current Location</Label>
                  <p>{trackingData.current_location || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Expected Delivery</Label>
                  <p>{trackingData.expected_delivery || 'N/A'}</p>
                </div>
              </div>
              
              {trackingData.tracking_history && trackingData.tracking_history.length > 0 && (
                <div>
                  <Label className="text-slate-400 mb-2 block">Tracking History</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {trackingData.tracking_history.map((event, index) => (
                      <div key={index} className="flex gap-3 p-3 bg-slate-700/50 rounded-lg">
                        <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{event.status}</p>
                          <p className="text-sm text-slate-400">{event.location}</p>
                          <p className="text-xs text-slate-500">{event.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>Create Return - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Return Reason</Label>
              <Textarea
                value={returnData.reason}
                onChange={(e) => setReturnData({ ...returnData, reason: e.target.value })}
                placeholder="Enter reason for return"
                className="input-admin"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={returnData.quantity}
                  onChange={(e) => setReturnData({ ...returnData, quantity: parseInt(e.target.value) })}
                  className="input-admin"
                />
              </div>
              <div>
                <Label>Weight (grams)</Label>
                <Input
                  value={returnData.weight}
                  onChange={(e) => setReturnData({ ...returnData, weight: e.target.value })}
                  className="input-admin"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowReturnDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateReturn} className="bg-primary hover:bg-primary/90">
                Schedule Return Pickup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}