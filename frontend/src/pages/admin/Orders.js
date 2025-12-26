import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ordersAPI, couriersAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Search, Eye, Truck, FileText, Printer, Package } from 'lucide-react';

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updateData, setUpdateData] = useState({ status: '', tracking_number: '', courier_provider: '', notes: '' });

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const [ordersRes, couriersRes] = await Promise.all([
        ordersAPI.getAll(params),
        couriersAPI.getAll().catch(() => ({ data: [] })),
      ]);
      setOrders(ordersRes.data.orders || []);
      setCouriers(couriersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setUpdateData({
      status: order.status,
      tracking_number: order.tracking_number || '',
      courier_provider: order.courier_provider || '',
      notes: '',
    });
    setShowDialog(true);
  };

  const handleUpdateStatus = async () => {
    try {
      await ordersAPI.updateStatus(selectedOrder.id, updateData);
      toast.success('Order updated successfully');
      setShowDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const handlePrintInvoice = async (orderId) => {
    try {
      const response = await ordersAPI.getInvoice(orderId);
      
      // Create blob from response data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Open in new window for printing
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        // Fallback: download the file
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice_${orderId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Clean up
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Invoice error:', error);
      toast.error('Failed to generate invoice');
    }
  };

  const handlePrintLabel = async (orderId) => {
    try {
      const response = await ordersAPI.getShippingLabel(orderId);
      
      // Create blob from response data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Open in new window for printing
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        // Fallback: download the file
        const link = document.createElement('a');
        link.href = url;
        link.download = `ShippingLabel_${orderId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Clean up
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Shipping label error:', error);
      toast.error('Failed to generate shipping label');
    }
  };

  const filteredOrders = orders.filter(o =>
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_phone?.includes(search) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'bg-amber-500/20 text-amber-400',
      processing: 'bg-blue-500/20 text-blue-400',
      shipped: 'bg-indigo-500/20 text-indigo-400',
      delivered: 'bg-emerald-500/20 text-emerald-400',
      cancelled: 'bg-red-500/20 text-red-400',
    };
    return classes[status] || 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div className="space-y-6" data-testid="admin-orders">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-slate-400">{orders.length} orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by order #, phone, or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 input-admin"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-400">Order #</TableHead>
                <TableHead className="text-slate-400">Date</TableHead>
                <TableHead className="text-slate-400">Customer</TableHead>
                <TableHead className="text-slate-400">Items</TableHead>
                <TableHead className="text-slate-400">Total</TableHead>
                <TableHead className="text-slate-400">Payment</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} className="border-slate-700">
                    <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>{order.customer_name || order.customer_phone || '-'}</TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell className="font-semibold">₹{order.grand_total.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize border-slate-600">
                        {order.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleViewOrder(order)} title="View">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handlePrintInvoice(order.id)} title="Invoice">
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handlePrintLabel(order.id)} title="Label">
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Items */}
              <div>
                <h4 className="font-semibold mb-3">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-slate-400">SKU: {item.sku} | Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">₹{item.total.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between font-bold">
                  <span>Total</span>
                  <span>₹{selectedOrder.grand_total.toLocaleString()}</span>
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h4 className="font-semibold mb-3">Shipping Address</h4>
                <div className="p-3 bg-slate-700/50 rounded-lg text-sm">
                  <p className="font-medium">{selectedOrder.shipping_address.name}</p>
                  <p className="text-slate-400">{selectedOrder.shipping_address.line1}</p>
                  {selectedOrder.shipping_address.line2 && <p className="text-slate-400">{selectedOrder.shipping_address.line2}</p>}
                  <p className="text-slate-400">{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} - {selectedOrder.shipping_address.pincode}</p>
                  <p className="text-slate-400">Phone: {selectedOrder.shipping_address.phone}</p>
                </div>
              </div>

              {/* Update Status */}
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <h4 className="font-semibold">Update Order Status</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={updateData.status} onValueChange={(v) => setUpdateData({ ...updateData, status: v })}>
                      <SelectTrigger className="input-admin">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Courier Provider</Label>
                    <Select value={updateData.courier_provider} onValueChange={(v) => setUpdateData({ ...updateData, courier_provider: v })}>
                      <SelectTrigger className="input-admin">
                        <SelectValue placeholder="Select courier" />
                      </SelectTrigger>
                      <SelectContent>
                        {couriers.map((c) => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tracking Number</Label>
                  <Input
                    value={updateData.tracking_number}
                    onChange={(e) => setUpdateData({ ...updateData, tracking_number: e.target.value })}
                    placeholder="Enter tracking number"
                    className="input-admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={updateData.notes}
                    onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                    placeholder="Add a note..."
                    className="input-admin"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
                  <Button onClick={handleUpdateStatus} className="bg-primary hover:bg-primary/90">
                    Update Order
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
