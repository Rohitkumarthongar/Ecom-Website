import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { dashboardAPI } from '../../lib/api';
import { toast } from 'sonner';
import {
  TrendingUp, Package, ShoppingCart, Users, AlertTriangle,
  RefreshCcw, IndianRupee, ArrowUpRight, ArrowDownRight, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePopup } from '../../contexts/PopupContext';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('all');
  const { showPopup } = usePopup();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    try {
      await dashboardAPI.seedData();
      toast.success('Sample data created successfully!');
      fetchDashboard();
    } catch (error) {
      toast.error('Failed to create sample data');
    }
  };

  const handleClearData = async () => {
    showPopup({
      title: "Clear All Data",
      message: "Are you sure you want to clear ALL data? This will delete orders, products, customers, and more. This action cannot be undone.",
      type: "destructive",
      onConfirm: async () => {
        try {
          setLoading(true);
          await dashboardAPI.clearData();
          toast.success('All data cleared successfully');
          fetchDashboard();
        } catch (error) {
          toast.error('Failed to clear data');
          setLoading(false);
        }
      }
    });
  };

  const statCards = [
    {
      title: "Today's Revenue",
      value: stats?.today?.revenue || 0,
      format: 'currency',
      icon: IndianRupee,
      change: '+12%',
      positive: true,
      color: 'text-emerald-400',
    },
    {
      title: "Today's Orders",
      value: stats?.today?.orders || 0,
      icon: ShoppingCart,
      change: '+8%',
      positive: true,
      color: 'text-blue-400',
    },
    {
      title: 'Total Products',
      value: stats?.totals?.products || 0,
      icon: Package,
      color: 'text-violet-400',
    },
    {
      title: 'Total Customers',
      value: stats?.totals?.customers || 0,
      icon: Users,
      color: 'text-amber-400',
    },
  ];

  const alertCards = [
    {
      title: 'Pending Orders',
      value: stats?.pending?.orders || 0,
      icon: ShoppingCart,
      action: () => navigate('/admin/orders?status=pending'),
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    {
      title: 'Low Stock Items',
      value: stats?.pending?.low_stock || 0,
      icon: AlertTriangle,
      action: () => navigate('/admin/inventory?low_stock=true'),
      color: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
    {
      title: 'Pending Returns',
      value: stats?.pending?.returns || 0,
      icon: RefreshCcw,
      action: () => navigate('/admin/returns'),
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-400">Welcome back! Here's your store overview.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSeedData}
            className="border-slate-600 hover:bg-slate-700"
            data-testid="seed-data-btn"
          >
            Add Sample Data
          </Button>
          <Button
            variant="outline"
            onClick={handleClearData}
            className="border-red-600 text-red-400 hover:bg-red-500/10"
          >
            Clear Data
          </Button>
          <Button onClick={fetchDashboard} variant="outline" className="border-slate-600 hover:bg-slate-700">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="bg-slate-800 border-slate-700">
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg bg-slate-700/50`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {stat.change && (
                <Badge className={`${stat.positive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {stat.positive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {stat.change}
                </Badge>
              )}
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">
                {stat.format === 'currency' ? `₹${stat.value.toLocaleString()}` : stat.value.toLocaleString()}
              </p>
              <p className="text-slate-400 text-sm">{stat.title}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid md:grid-cols-3 gap-4">
        {alertCards.map((alert, index) => (
          <Card
            key={index}
            className={`border cursor-pointer transition-all hover:scale-[1.02] ${alert.color}`}
            onClick={alert.action}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <alert.icon className="w-5 h-5" />
                <div>
                  <p className="font-semibold">{alert.value}</p>
                  <p className="text-sm opacity-80">{alert.title}</p>
                </div>
              </div>
              <Eye className="w-4 h-4 opacity-60" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between mb-3">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')}>
                View All
              </Button>
            </div>
            <Tabs value={orderFilter} onValueChange={setOrderFilter} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="online">Online</TabsTrigger>
                <TabsTrigger value="offline">Offline</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {stats?.recent_orders?.filter(order => {
              if (orderFilter === 'online') return !order.is_offline;
              if (orderFilter === 'offline') return order.is_offline;
              return true;
            }).length > 0 ? (
              <div className="space-y-3">
                {stats.recent_orders.filter(order => {
                  if (orderFilter === 'online') return !order.is_offline;
                  if (orderFilter === 'offline') return order.is_offline;
                  return true;
                }).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => navigate(`/admin/orders?id=${order.id}`)}
                  >
                    <div>
                      <p className="font-medium">#{order.order_number}</p>
                      <p className="text-sm text-slate-400">
                        {new Date(order.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{order.grand_total.toLocaleString()}</p>
                      <Badge className={`status-badge status-${order.status}`}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8">No recent orders</p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Low Stock Alerts</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/inventory')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.low_stock_products?.length > 0 ? (
              <div className="space-y-3">
                {stats.low_stock_products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-600 rounded-lg" />
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{product.name}</p>
                        <p className="text-sm text-slate-400">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      {product.stock_qty} left
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8">No low stock items</p>
            )}
          </CardContent>
        </Card>

        {/* Offline Sales */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Offline Sales (POS)</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/pos')}>
              New Sale
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.recent_orders?.filter(order => order.is_offline).length > 0 ? (
              <div className="space-y-3">
                {stats.recent_orders.filter(order => order.is_offline).slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => navigate(`/admin/orders?id=${order.id}`)}
                  >
                    <div>
                      <p className="font-medium">#{order.order_number}</p>
                      <p className="text-sm text-slate-400">
                        {new Date(order.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{order.grand_total.toLocaleString()}</p>
                      <Badge className="bg-violet-500/20 text-violet-400">
                        POS
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8">No offline sales</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col border-slate-600 hover:bg-slate-700"
              onClick={() => navigate('/admin/products')}
            >
              <Package className="w-6 h-6 mb-2" />
              Add Product
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col border-slate-600 hover:bg-slate-700"
              onClick={() => navigate('/admin/pos')}
            >
              <ShoppingCart className="w-6 h-6 mb-2" />
              New Sale (POS)
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col border-slate-600 hover:bg-slate-700"
              onClick={() => navigate('/admin/orders')}
            >
              <TrendingUp className="w-6 h-6 mb-2" />
              View Orders
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col border-slate-600 hover:bg-slate-700"
              onClick={() => navigate('/admin/reports')}
            >
              <TrendingUp className="w-6 h-6 mb-2" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
