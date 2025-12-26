import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { returnsAPI } from '../lib/api';
import { toast } from 'sonner';
import { RefreshCw, Eye, Package, Clock, CheckCircle, X, Truck } from 'lucide-react';

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState(null);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await returnsAPI.getUserReturns();
      setReturns(response.data || []);
    } catch (error) {
      console.error('Failed to fetch returns:', error);
      toast.error('Failed to fetch returns');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReturn = async (returnItem) => {
    setSelectedReturn(returnItem);
    setShowDialog(true);
    
    // Fetch tracking info if return is approved
    if (returnItem.status === 'approved' && returnItem.return_awb) {
      try {
        const trackingResponse = await returnsAPI.trackReturn(returnItem.id);
        setTrackingInfo(trackingResponse.data);
      } catch (error) {
        console.error('Failed to fetch tracking info:', error);
      }
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pickup_scheduled: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-purple-100 text-purple-800',
      received: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-emerald-100 text-emerald-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: X,
      pickup_scheduled: Truck,
      picked_up: Package,
      received: Package,
      completed: CheckCircle,
    };
    return icons[status] || Clock;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="returns-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Returns</h1>
          <p className="text-muted-foreground">Track and manage your return requests</p>
        </div>
        <Button variant="outline" onClick={fetchReturns}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {returns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No Returns Found</h3>
            <p className="text-muted-foreground">
              You haven't made any return requests yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {returns.map((returnItem) => {
            const StatusIcon = getStatusIcon(returnItem.status);
            
            return (
              <Card key={returnItem.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusIcon className="w-5 h-5 text-muted-foreground" />
                        <h3 className="font-semibold">
                          Return Request #{returnItem.id.slice(0, 8)}...
                        </h3>
                        <Badge className={getStatusBadgeClass(returnItem.status)}>
                          {returnItem.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <p><strong>Order:</strong> #{returnItem.order_number}</p>
                          <p><strong>Date:</strong> {new Date(returnItem.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <p><strong>Type:</strong> {returnItem.return_type?.replace('_', ' ')}</p>
                          {returnItem.refund_amount && (
                            <p><strong>Refund:</strong> ₹{returnItem.refund_amount.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                        {returnItem.reason}
                      </p>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewReturn(returnItem)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Return Details Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Return Request Details</DialogTitle>
          </DialogHeader>
          
          {selectedReturn && (
            <div className="space-y-6">
              {/* Status and Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Return Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Return ID:</strong> {selectedReturn.id}</p>
                    <p><strong>Order:</strong> #{selectedReturn.order_number}</p>
                    <p><strong>Date:</strong> {new Date(selectedReturn.created_at).toLocaleDateString('en-IN')}</p>
                    <p><strong>Type:</strong> {selectedReturn.return_type?.replace('_', ' ')}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <strong>Status:</strong>
                      <Badge className={getStatusBadgeClass(selectedReturn.status)}>
                        {selectedReturn.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Refund Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Method:</strong> {selectedReturn.refund_method?.replace('_', ' ')}</p>
                    {selectedReturn.refund_amount && (
                      <p><strong>Amount:</strong> ₹{selectedReturn.refund_amount.toLocaleString()}</p>
                    )}
                    {selectedReturn.return_awb && (
                      <p><strong>Return AWB:</strong> {selectedReturn.return_awb}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <h4 className="font-semibold mb-2">Reason for Return</h4>
                <p className="text-sm bg-muted p-3 rounded-lg">
                  {selectedReturn.reason}
                </p>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-2">Items to Return</h4>
                <div className="space-y-2">
                  {selectedReturn.items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium">{item.product_name || `Product ${index + 1}`}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      {item.total && (
                        <p className="font-semibold">₹{item.total.toLocaleString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking Information */}
              {trackingInfo && (
                <div>
                  <h4 className="font-semibold mb-2">Return Tracking</h4>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm"><strong>AWB:</strong> {trackingInfo.return_awb}</p>
                    <p className="text-sm"><strong>Status:</strong> {trackingInfo.current_status}</p>
                    {trackingInfo.current_location && (
                      <p className="text-sm"><strong>Location:</strong> {trackingInfo.current_location}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedReturn.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {selectedReturn.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}