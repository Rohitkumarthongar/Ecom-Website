import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { inventoryAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Search, Package, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

export default function AdminInventory() {
  const [inventory, setInventory] = useState({ products: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustment, setAdjustment] = useState({ quantity: '', type: 'add', notes: '' });

  useEffect(() => {
    fetchInventory();
  }, [lowStockOnly]);

  const fetchInventory = async () => {
    try {
      const response = await inventoryAPI.getAll({ low_stock_only: lowStockOnly });
      setInventory(response.data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = (product) => {
    setSelectedProduct(product);
    setAdjustment({ quantity: '', type: 'add', notes: '' });
    setShowDialog(true);
  };

  const handleSubmitAdjustment = async () => {
    if (!adjustment.quantity) {
      toast.error('Please enter quantity');
      return;
    }

    const qty = parseInt(adjustment.quantity);
    const adjustmentValue = adjustment.type === 'add' ? qty : -qty;

    try {
      await inventoryAPI.update(selectedProduct.id, {
        adjustment: adjustmentValue,
        type: adjustment.type,
        notes: adjustment.notes,
      });
      toast.success('Inventory updated');
      setShowDialog(false);
      fetchInventory();
    } catch (error) {
      toast.error('Failed to update inventory');
    }
  };

  const filteredProducts = inventory.products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const stats = [
    { label: 'Total Products', value: inventory.stats?.total_products || 0, icon: Package, color: 'text-blue-400' },
    { label: 'Inventory Value', value: `₹${(inventory.stats?.total_inventory_value || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Low Stock Items', value: inventory.stats?.low_stock_count || 0, icon: AlertTriangle, color: 'text-amber-400' },
    { label: 'Out of Stock', value: inventory.stats?.out_of_stock || 0, icon: TrendingDown, color: 'text-red-400' },
  ];

  return (
    <div className="space-y-6" data-testid="admin-inventory">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-slate-400">Track and manage your stock levels</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-slate-800 border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 input-admin"
          />
        </div>
        <Button
          variant={lowStockOnly ? 'default' : 'outline'}
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={lowStockOnly ? 'bg-amber-500 hover:bg-amber-600' : 'border-slate-600'}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Low Stock Only
        </Button>
      </div>

      {/* Inventory Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-400">Product</TableHead>
                <TableHead className="text-slate-400">SKU</TableHead>
                <TableHead className="text-slate-400">Current Stock</TableHead>
                <TableHead className="text-slate-400">Threshold</TableHead>
                <TableHead className="text-slate-400">Stock Value</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const isLow = product.stock_qty <= product.low_stock_threshold;
                  const isOut = product.stock_qty === 0;
                  return (
                    <TableRow key={product.id} className="border-slate-700">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-700 rounded-lg overflow-hidden">
                            {product.images?.[0] && (
                              <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <span className="font-medium truncate max-w-[200px]">{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell className="font-semibold">{product.stock_qty}</TableCell>
                      <TableCell>{product.low_stock_threshold}</TableCell>
                      <TableCell>₹{(product.stock_qty * product.cost_price).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={
                          isOut ? 'bg-red-500/20 text-red-400' :
                            isLow ? 'bg-amber-500/20 text-amber-400' :
                              'bg-emerald-500/20 text-emerald-400'
                        }>
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="border-slate-600" onClick={() => handleAdjust(product)}>
                          Adjust Stock
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Adjustment Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-400">Current Stock</p>
              <p className="text-2xl font-bold">{selectedProduct?.stock_qty} units</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={adjustment.type === 'add' ? 'default' : 'outline'}
                onClick={() => setAdjustment({ ...adjustment, type: 'add' })}
                className={adjustment.type === 'add' ? 'bg-emerald-500 hover:bg-emerald-600' : 'border-slate-600'}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Add Stock
              </Button>
              <Button
                variant={adjustment.type === 'remove' ? 'default' : 'outline'}
                onClick={() => setAdjustment({ ...adjustment, type: 'remove' })}
                className={adjustment.type === 'remove' ? 'bg-red-500 hover:bg-red-600' : 'border-slate-600'}
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Remove Stock
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={adjustment.quantity}
                onChange={(e) => setAdjustment({ ...adjustment, quantity: e.target.value })}
                placeholder="Enter quantity"
                className="input-admin"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input
                value={adjustment.notes}
                onChange={(e) => setAdjustment({ ...adjustment, notes: e.target.value })}
                placeholder="Reason for adjustment"
                className="input-admin"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmitAdjustment} className="bg-primary hover:bg-primary/90">
                Update Stock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
