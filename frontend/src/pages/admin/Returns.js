import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { returnsAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Eye, RefreshCcw } from 'lucide-react';

export default function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [updateData, setUpdateData] = useState({ status: '', refund_amount: '', restore_stock: false });

  useEffect(() => {
    fetchReturns();
  }, [statusFilter]);

  const fetchReturns = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await returnsAPI.getAll(params);
      // Backend returns { returns: [...], total, page, pages }
      setReturns(response.data.returns || []);
    } catch (error) {
      console.error('Failed to fetch returns:', error);
      toast.error('Failed to fetch returns');
      setReturns([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleView = (returnItem) => {
    setSelectedReturn(returnItem);
    setUpdateData({
      status: returnItem.status,
      refund_amount: returnItem.refund_amount || '',
      restore_stock: false,
    });
    setShowDialog(true);
  };

  const handleUpdate = async () => {
    try {
      await returnsAPI.update(selectedReturn.id, updateData);
      toast.success('Return updated successfully');
      setShowDialog(false);
      fetchReturns();
    } catch (error) {
      toast.error('Failed to update return');
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'bg-amber-500/20 text-amber-400',
      approved: 'bg-emerald-500/20 text-emerald-400',
      rejected: 'bg-red-500/20 text-red-400',
      refunded: 'bg-blue-500/20 text-blue-400',
    };
    return classes[status] || 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div className="space-y-6" data-testid="admin-returns">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Returns & Refunds</h1>
          <p className="text-slate-400">{returns.length} returns</p>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="bg-slate-800">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="refunded">Refunded</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-400">Return ID</TableHead>
                <TableHead className="text-slate-400">Order ID</TableHead>
                <TableHead className="text-slate-400">Date</TableHead>
                <TableHead className="text-slate-400">Reason</TableHead>
                <TableHead className="text-slate-400">Refund Method</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    <RefreshCcw className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No returns found
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((returnItem) => (
                  <TableRow key={returnItem.id} className="border-slate-700">
                    <TableCell className="font-mono text-sm">{returnItem.id.slice(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-sm">{returnItem.order_id.slice(0, 8)}...</TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(returnItem.created_at).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{returnItem.reason}</TableCell>
                    <TableCell className="capitalize">{returnItem.refund_method}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(returnItem.status)}>
                        {returnItem.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleView(returnItem)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-400">Reason</p>
                <p className="font-medium">{selectedReturn.reason}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Items</h4>
                {selectedReturn.items?.map((item, index) => (
                  <div key={index} className="p-2 bg-slate-700/50 rounded mb-2">
                    <p className="font-medium">{item.product_name || `Product ${index + 1}`}</p>
                    <p className="text-sm text-slate-400">Qty: {item.quantity}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-700">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={updateData.status} onValueChange={(v) => setUpdateData({ ...updateData, status: v })}>
                    <SelectTrigger className="input-admin">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Refund Amount (₹)</Label>
                  <Input
                    type="number"
                    value={updateData.refund_amount}
                    onChange={(e) => setUpdateData({ ...updateData, refund_amount: e.target.value })}
                    placeholder="Enter refund amount"
                    className="input-admin"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={updateData.restore_stock}
                    onCheckedChange={(checked) => setUpdateData({ ...updateData, restore_stock: checked })}
                  />
                  <Label>Restore stock after approval</Label>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
                  <Button onClick={handleUpdate} className="bg-primary hover:bg-primary/90">
                    Update Return
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
