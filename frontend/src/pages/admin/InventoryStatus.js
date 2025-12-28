import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { reportsAPI } from '../../lib/api';
import { Search, Package, AlertTriangle, CheckCircle, XCircle, TrendingDown, BarChart3 } from 'lucide-react';

export default function InventoryStatus() {
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchInventoryStatus();
  }, []);

  const fetchInventoryStatus = async () => {
    try {
      const response = await reportsAPI.getInventoryStatus();
      setInventoryData(response.data);
    } catch (error) {
      console.error('Failed to fetch inventory status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      out_of_stock: {
        label: 'Out of Stock',
        className: 'bg-red-500/20 text-red-400',
        icon: XCircle
      },
      low_stock: {
        label: 'Low Stock',
        className: 'bg-yellow-500/20 text-yellow-400',
        icon: AlertTriangle
      },
      reserved_low: {
        label: 'Reserved Low',
        className: 'bg-orange-500/20 text-orange-400',
        icon: TrendingDown
      },
      in_stock: {
        label: 'In Stock',
        className: 'bg-green-500/20 text-green-400',
        icon: CheckCircle
      }
    };

    const config = statusConfig[status] || statusConfig.in_stock;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const filteredProducts = inventoryData?.products?.filter(product => {
    const matchesSearch =
      product.product_name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      product.category_name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || product.stock_status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="inventory-status">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory Status Report</h1>
          <p className="text-slate-400">
            Complete view of stock levels, blocked quantities, and availability
          </p>
        </div>
        <Button onClick={fetchInventoryStatus} variant="outline" className="bg-slate-800 border-slate-600">
          <BarChart3 className="w-4 h-4 mr-2" />
          Refresh Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Products</p>
                <p className="text-2xl font-bold">{inventoryData?.summary?.total_products || 0}</p>
              </div>
              <Package className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Stock Value</p>
                <p className="text-2xl font-bold">₹{inventoryData?.summary?.total_stock_value?.toLocaleString() || 0}</p>
                <p className="text-xs text-slate-500">Available: ₹{inventoryData?.summary?.total_available_value?.toLocaleString() || 0}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Blocked Value</p>
                <p className="text-2xl font-bold">₹{inventoryData?.summary?.total_blocked_value?.toLocaleString() || 0}</p>
                <p className="text-xs text-slate-500">In pending orders</p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Stock Issues</p>
                <p className="text-2xl font-bold text-red-400">
                  {(inventoryData?.summary?.out_of_stock_count || 0) + (inventoryData?.summary?.low_stock_count || 0)}
                </p>
                <p className="text-xs text-slate-500">Need attention</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="all">All Products</TabsTrigger>
            <TabsTrigger value="out_of_stock">Out of Stock</TabsTrigger>
            <TabsTrigger value="low_stock">Low Stock</TabsTrigger>
            <TabsTrigger value="reserved_low">Reserved Low</TabsTrigger>
            <TabsTrigger value="in_stock">In Stock</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by product name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 input-admin"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-400">Product</TableHead>
                <TableHead className="text-slate-400">SKU</TableHead>
                <TableHead className="text-slate-400">Category</TableHead>
                <TableHead className="text-slate-400 text-center">Original Stock</TableHead>
                <TableHead className="text-slate-400 text-center">Sold Qty</TableHead>
                <TableHead className="text-slate-400 text-center">Current Stock</TableHead>
                <TableHead className="text-slate-400 text-center">Blocked</TableHead>
                <TableHead className="text-slate-400 text-center">Available</TableHead>
                <TableHead className="text-slate-400 text-center">Threshold</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">Stock Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.product_id} className="border-slate-700">
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.product_name}</p>
                        <p className="text-sm text-slate-400">₹{product.selling_price.toLocaleString()}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell className="text-slate-400">{product.category_name}</TableCell>
                    <TableCell className="text-center font-semibold text-slate-300">{product.original_stock || 0}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-blue-400 font-medium">
                        {product.sold_qty || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{product.total_stock}</TableCell>
                    <TableCell className="text-center">
                      <span className={product.blocked_qty > 0 ? 'text-orange-400 font-medium' : 'text-slate-500'}>
                        {product.blocked_qty}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={product.available_qty <= product.low_stock_threshold ? 'text-red-400 font-medium' : 'text-green-400 font-medium'}>
                        {product.available_qty}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-slate-400">{product.low_stock_threshold}</TableCell>
                    <TableCell>{getStatusBadge(product.stock_status)}</TableCell>
                    <TableCell className="text-right">
                      <div>
                        <p className="font-semibold">₹{product.stock_value.toLocaleString()}</p>
                        <p className="text-sm text-slate-400">Avail: ₹{product.available_value.toLocaleString()}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Status Legend */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <div>
                <p className="font-medium text-red-400">Out of Stock</p>
                <p className="text-sm text-slate-400">No inventory available</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <div>
                <p className="font-medium text-yellow-400">Low Stock</p>
                <p className="text-sm text-slate-400">Below threshold level</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-orange-400" />
              <div>
                <p className="font-medium text-orange-400">Reserved Low</p>
                <p className="text-sm text-slate-400">Available qty below threshold</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <div>
                <p className="font-medium text-green-400">In Stock</p>
                <p className="text-sm text-slate-400">Adequate inventory available</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}