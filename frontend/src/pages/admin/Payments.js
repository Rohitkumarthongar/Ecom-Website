import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { paymentGatewaysAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { usePopup } from '../../contexts/PopupContext';

export default function AdminPayments() {
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGateway, setEditingGateway] = useState(null);
  const { showPopup } = usePopup();

  const [formData, setFormData] = useState({
    name: 'phonepe',
    merchant_id: '',
    api_key: '',
    api_secret: '',
    is_test_mode: true,
    is_active: true,
  });

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      const response = await paymentGatewaysAPI.getAll();
      setGateways(response.data || []);
    } catch (error) {
      console.error('Failed to fetch gateways:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: 'phonepe',
      merchant_id: '',
      api_key: '',
      api_secret: '',
      is_test_mode: true,
      is_active: true,
    });
    setEditingGateway(null);
  };

  const handleEdit = (gateway) => {
    setEditingGateway(gateway);
    setFormData({
      name: gateway.name,
      merchant_id: gateway.merchant_id || '',
      api_key: gateway.api_key || '',
      api_secret: gateway.api_secret || '',
      is_test_mode: gateway.is_test_mode,
      is_active: gateway.is_active,
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingGateway) {
        await paymentGatewaysAPI.update(editingGateway.id, formData);
        toast.success('Payment gateway updated');
      } else {
        await paymentGatewaysAPI.create(formData);
        toast.success('Payment gateway added');
      }
      setShowDialog(false);
      resetForm();
      fetchGateways();
    } catch (error) {
      toast.error('Failed to save gateway');
    }
  };

  const handleDelete = async (id) => {
    showPopup({
      title: "Delete Payment Gateway",
      message: "Are you sure you want to delete this payment gateway?",
      type: "error",
      onConfirm: async () => {
        try {
          await paymentGatewaysAPI.delete(id);
          toast.success('Gateway deleted');
          fetchGateways();
        } catch (error) {
          toast.error('Failed to delete gateway');
        }
      }
    });
  };

  const gatewayOptions = [
    { value: 'phonepe', label: 'PhonePe' },
    { value: 'paytm', label: 'Paytm' },
    { value: 'razorpay', label: 'Razorpay' },
    { value: 'upi', label: 'UPI' },
    { value: 'stripe', label: 'Stripe' },
  ];

  return (
    <div className="space-y-6" data-testid="admin-payments">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payment Gateways</h1>
          <p className="text-slate-400">Configure payment methods for your store</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-admin bg-primary hover:bg-primary/90" data-testid="add-gateway-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Gateway
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle>{editingGateway ? 'Edit Payment Gateway' : 'Add Payment Gateway'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Gateway Provider *</Label>
                <Select value={formData.name} onValueChange={(v) => setFormData({ ...formData, name: v })}>
                  <SelectTrigger className="input-admin">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gatewayOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Merchant ID</Label>
                <Input
                  value={formData.merchant_id}
                  onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                  placeholder="Enter Merchant ID"
                  className="input-admin"
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="Enter API Key"
                  className="input-admin"
                  type="password"
                />
              </div>
              <div className="space-y-2">
                <Label>API Secret</Label>
                <Input
                  value={formData.api_secret}
                  onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                  placeholder="Enter API Secret"
                  className="input-admin"
                  type="password"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_test_mode}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_test_mode: checked })}
                  />
                  <Label>Test Mode</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  {editingGateway ? 'Update' : 'Add'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-400">Gateway</TableHead>
                <TableHead className="text-slate-400">Merchant ID</TableHead>
                <TableHead className="text-slate-400">Mode</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : gateways.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No payment gateways configured
                  </TableCell>
                </TableRow>
              ) : (
                gateways.map((gateway) => (
                  <TableRow key={gateway.id} className="border-slate-700">
                    <TableCell className="font-medium capitalize">{gateway.name}</TableCell>
                    <TableCell className="font-mono text-sm">{gateway.merchant_id || '-'}</TableCell>
                    <TableCell>
                      <Badge className={gateway.is_test_mode ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}>
                        {gateway.is_test_mode ? 'Test' : 'Live'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={gateway.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}>
                        {gateway.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(gateway)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-400" onClick={() => handleDelete(gateway.id)}>
                          <Trash2 className="w-4 h-4" />
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

      {/* Instructions Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Integration Instructions</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-400">
            <div>
              <h4 className="font-medium text-white mb-2">PhonePe</h4>
              <p>Get credentials from PhonePe Business dashboard at business.phonepe.com</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Paytm</h4>
              <p>Get credentials from Paytm Business dashboard at business.paytm.com</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Razorpay</h4>
              <p>Get credentials from Razorpay dashboard at dashboard.razorpay.com</p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Stripe</h4>
              <p>Get credentials from Stripe dashboard at dashboard.stripe.com</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
