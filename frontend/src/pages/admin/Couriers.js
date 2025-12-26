import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { couriersAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { usePopup } from '../../contexts/PopupContext';

export default function AdminCouriers() {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCourier, setEditingCourier] = useState(null);
  const { showPopup } = usePopup();

  const [formData, setFormData] = useState({
    name: '',
    api_key: '',
    api_secret: '',
    webhook_url: '',
    tracking_url_template: '',
    is_active: true,
    priority: '1',
  });

  useEffect(() => {
    fetchCouriers();
  }, []);

  const fetchCouriers = async () => {
    try {
      const response = await couriersAPI.getAll();
      setCouriers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch couriers:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      api_key: '',
      api_secret: '',
      webhook_url: '',
      tracking_url_template: '',
      is_active: true,
      priority: '1',
    });
    setEditingCourier(null);
  };

  const handleEdit = (courier) => {
    setEditingCourier(courier);
    setFormData({
      name: courier.name,
      api_key: courier.api_key || '',
      api_secret: courier.api_secret || '',
      webhook_url: courier.webhook_url || '',
      tracking_url_template: courier.tracking_url_template || '',
      is_active: courier.is_active,
      priority: String(courier.priority),
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, priority: parseInt(formData.priority) };

    try {
      if (editingCourier) {
        await couriersAPI.update(editingCourier.id, payload);
        toast.success('Courier updated');
      } else {
        await couriersAPI.create(payload);
        toast.success('Courier added');
      }
      setShowDialog(false);
      resetForm();
      fetchCouriers();
    } catch (error) {
      toast.error('Failed to save courier');
    }
  };

  const handleDelete = async (id) => {
    showPopup({
      title: "Delete Courier",
      message: "Are you sure you want to delete this courier?",
      type: "error",
      onConfirm: async () => {
        try {
          await couriersAPI.delete(id);
          toast.success('Courier deleted');
          fetchCouriers();
        } catch (error) {
          toast.error('Failed to delete courier');
        }
      }
    });
  };

  return (
    <div className="space-y-6" data-testid="admin-couriers">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Courier Providers</h1>
          <p className="text-slate-400">Manage shipping and delivery partners</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-admin bg-primary hover:bg-primary/90" data-testid="add-courier-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Courier
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle>{editingCourier ? 'Edit Courier' : 'Add New Courier'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Courier Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Delhivery, Shiprocket"
                  className="input-admin"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="Enter API key"
                    className="input-admin"
                    type="password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input
                    value={formData.api_secret}
                    onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                    placeholder="Enter API secret"
                    className="input-admin"
                    type="password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  placeholder="https://..."
                  className="input-admin"
                />
              </div>
              <div className="space-y-2">
                <Label>Tracking URL Template</Label>
                <Input
                  value={formData.tracking_url_template}
                  onChange={(e) => setFormData({ ...formData, tracking_url_template: e.target.value })}
                  placeholder="https://track.example.com/{tracking_number}"
                  className="input-admin"
                />
                <p className="text-xs text-slate-400">Use {'{tracking_number}'} as placeholder</p>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  placeholder="1"
                  className="input-admin"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  {editingCourier ? 'Update' : 'Add'}
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
                <TableHead className="text-slate-400">Courier</TableHead>
                <TableHead className="text-slate-400">Priority</TableHead>
                <TableHead className="text-slate-400">API Status</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : couriers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No couriers configured
                  </TableCell>
                </TableRow>
              ) : (
                couriers.map((courier) => (
                  <TableRow key={courier.id} className="border-slate-700">
                    <TableCell className="font-medium">{courier.name}</TableCell>
                    <TableCell>{courier.priority}</TableCell>
                    <TableCell>
                      <Badge className={courier.api_key ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}>
                        {courier.api_key ? 'Configured' : 'Not Configured'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={courier.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}>
                        {courier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(courier)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-400" onClick={() => handleDelete(courier.id)}>
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
    </div>
  );
}
