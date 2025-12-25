import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ordersAPI } from '../lib/api';
import { Package, ChevronRight, Clock, Truck, CheckCircle, X } from 'lucide-react';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getUserOrders();
      setOrders(response.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      processing: Package,
      shipped: Truck,
      delivered: CheckCircle,
      cancelled: X,
    };
    return icons[status] || Clock;
  };

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
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="orders-page">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">My Orders</h1>

      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-muted-foreground/50" />
          <h2 className="text-xl font-semibold mt-4">No orders found</h2>
          <p className="text-muted-foreground mt-1">
            {filter === 'all' ? "You haven't placed any orders yet" : `No ${filter} orders`}
          </p>
          <Button onClick={() => navigate('/products')} className="mt-4 btn-primary">
            Start Shopping
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            return (
              <Card
                key={order.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/orders/${order.id}`)}
                data-testid={`order-card-${order.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold">#{order.order_number}</span>
                        <Badge className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-sm text-muted-foreground">
                          {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </span>
                        <span className="text-lg font-bold price-tag text-primary">
                          ₹{order.grand_total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* Item Previews */}
                  <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-invisible pb-2">
                    {order.items.slice(0, 4).map((item, index) => (
                      <div key={index} className="w-12 h-12 bg-muted rounded-lg flex-shrink-0" />
                    ))}
                    {order.items.length > 4 && (
                      <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-medium">
                        +{order.items.length - 4}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
