import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { ordersAPI, returnsAPI } from '../lib/api';
import { toast } from 'sonner';
import { Package, Truck, CheckCircle, Clock, ChevronLeft, MapPin, Phone, FileText, Printer, X, RefreshCw, Upload } from 'lucide-react';

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [returnData, setReturnData] = useState({
    returnType: '',
    reason: '',
    refundMethod: 'original'
  });
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [cancellationEligibility, setCancellationEligibility] = useState(null);
  const [returnEligibility, setReturnEligibility] = useState(null);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await ordersAPI.getOne(id);
      setOrder(response.data);
    } catch (error) {
      toast.error('Order not found');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const checkCancellationEligibility = async () => {
    try {
      const response = await ordersAPI.checkCancellationEligibility(id);
      setCancellationEligibility(response.data);
    } catch (error) {
      console.error('Failed to check cancellation eligibility:', error);
    }
  };

  const checkReturnEligibility = async () => {
    try {
      const response = await ordersAPI.checkReturnEligibility(id);
      setReturnEligibility(response.data);
    } catch (error) {
      console.error('Failed to check return eligibility:', error);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      const response = await ordersAPI.cancelOrder(id, {
        order_id: id,
        reason: cancelReason,
        cancellation_type: 'customer'
      });
      
      toast.success(response.data.message);
      setShowCancelDialog(false);
      fetchOrder(); // Refresh order data
    } catch (error) {
      toast.error('Failed to cancel order');
    }
  };

  const handleCreateReturn = async () => {
    if (!returnData.returnType || !returnData.reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const returnPayload = {
        order_id: id,
        items: order.items, // Return all items for now
        reason: returnData.reason,
        return_type: returnData.returnType,
        refund_method: returnData.refundMethod,
        description: returnData.reason
      };

      const response = await ordersAPI.createReturn(id, returnPayload);
      
      // Upload evidence files if any
      if (evidenceFiles.length > 0) {
        const formData = new FormData();
        evidenceFiles.forEach(file => {
          formData.append('files', file);
        });
        
        try {
          await returnsAPI.uploadEvidence(response.data.return_id, formData);
          toast.success('Return request submitted with evidence');
        } catch (evidenceError) {
          toast.success('Return request submitted (evidence upload failed)');
        }
      } else {
        toast.success(response.data.message);
      }
      
      setShowReturnDialog(false);
      setReturnData({ returnType: '', reason: '', refundMethod: 'original' });
      setEvidenceFiles([]);
    } catch (error) {
      toast.error('Failed to create return request');
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    setEvidenceFiles(files);
  };

  const handleDownloadInvoice = async () => {
    try {
      const response = await ordersAPI.getInvoice(id);

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${order.order_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-40 bg-muted rounded" />
          <div className="h-60 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!order) return null;

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'status-pending',
      processing: 'status-processing',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled',
    };
    return classes[status] || 'status-pending';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="order-detail-page">
      <button
        onClick={() => navigate('/orders')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Orders
      </button>

      {/* Order Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.order_number}</h1>
          <p className="text-muted-foreground">
            Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <Badge className={`status-badge ${getStatusBadgeClass(order.status)}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </Badge>
      </div>

      {/* Order Tracking */}
      {order.status !== 'cancelled' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-0 right-0 h-1 bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
                />
              </div>

              {statusSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="relative flex flex-col items-center z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span className={`mt-2 text-xs font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {order.tracking_number && (
              <div className="mt-6 p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">Tracking Number</p>
                <p className="font-mono font-semibold">{order.tracking_number}</p>
                {order.courier_provider && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Courier: {order.courier_provider}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Items ({order.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm">Qty: {item.quantity}</span>
                    <span className="font-semibold">₹{item.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span>₹{order.gst_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="price-tag text-primary">₹{order.grand_total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery & Payment */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{order.shipping_address.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {order.shipping_address.line1}
                {order.shipping_address.line2 && `, ${order.shipping_address.line2}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
              </p>
              {order.shipping_address.phone && (
                <p className="text-sm flex items-center gap-1 mt-2">
                  <Phone className="w-4 h-4" />
                  {order.shipping_address.phone}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="capitalize">{order.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {order.payment_status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full" onClick={handleDownloadInvoice}>
              <FileText className="w-4 h-4 mr-2" />
              Download Invoice
            </Button>
            
            {/* Cancellation Button */}
            {order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'returned' && (
              <Button 
                variant="outline" 
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" 
                onClick={() => {
                  checkCancellationEligibility();
                  setShowCancelDialog(true);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Order
              </Button>
            )}
            
            {/* Return Button */}
            {order.status === 'delivered' && (
              <Button 
                variant="outline" 
                className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                onClick={() => {
                  checkReturnEligibility();
                  setShowReturnDialog(true);
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Request Return
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cancellationEligibility && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Refund Amount:</strong> ₹{cancellationEligibility.refund_amount?.toLocaleString()}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Refund Timeline:</strong> {cancellationEligibility.refund_timeline}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="cancelReason">Reason for Cancellation</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Changed my mind">Changed my mind</SelectItem>
                  <SelectItem value="Found better price elsewhere">Found better price elsewhere</SelectItem>
                  <SelectItem value="No longer needed">No longer needed</SelectItem>
                  <SelectItem value="Ordered by mistake">Ordered by mistake</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Keep Order
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelOrder}
                disabled={!cancelReason}
              >
                Cancel Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Request Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {returnEligibility && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Return Window:</strong> {returnEligibility.return_window_remaining}
                </p>
                <p className="text-sm text-green-800">
                  <strong>Refund Timeline:</strong> {returnEligibility.refund_timeline}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="returnType">Return Type</Label>
              <Select 
                value={returnData.returnType} 
                onValueChange={(value) => setReturnData({...returnData, returnType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select return type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defective">Product is defective/damaged</SelectItem>
                  <SelectItem value="wrong_item">Wrong item received</SelectItem>
                  <SelectItem value="not_satisfied">Not satisfied with product</SelectItem>
                  <SelectItem value="damaged">Package was damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="returnReason">Detailed Reason</Label>
              <Textarea
                id="returnReason"
                placeholder="Please describe the issue in detail..."
                value={returnData.reason}
                onChange={(e) => setReturnData({...returnData, reason: e.target.value})}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="refundMethod">Refund Method</Label>
              <Select 
                value={returnData.refundMethod} 
                onValueChange={(value) => setReturnData({...returnData, refundMethod: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original payment method</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="store_credit">Store credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="evidence">Upload Evidence (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  type="file"
                  id="evidence"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="evidence" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Click to upload photos or videos (Max 5 files)
                  </p>
                </label>
                {evidenceFiles.length > 0 && (
                  <div className="mt-2 text-sm text-green-600">
                    {evidenceFiles.length} file(s) selected
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateReturn}
                disabled={!returnData.returnType || !returnData.reason.trim()}
              >
                Submit Return Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
