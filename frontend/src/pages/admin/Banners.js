import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { SingleImageUpload } from '../../components/ui/image-upload';
import { bannersAPI } from '../../lib/api';
import { getImageUrl } from '../../lib/utils';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Image as ImageIcon, Eye } from 'lucide-react';

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    link: '',
    position: '1',
    is_active: true,
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await bannersAPI.getAll();
      setBanners(response.data || []);
    } catch (error) {
      console.error('Failed to fetch banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', image_url: '', link: '', position: '1', is_active: true });
    setEditingBanner(null);
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      image_url: banner.image_url,
      link: banner.link || '',
      position: String(banner.position),
      is_active: banner.is_active,
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, position: parseInt(formData.position) };

    try {
      if (editingBanner) {
        await bannersAPI.update(editingBanner.id, payload);
        toast.success('Banner updated');
      } else {
        await bannersAPI.create(payload);
        toast.success('Banner created');
      }
      setShowDialog(false);
      resetForm();
      fetchBanners();
    } catch (error) {
      toast.error('Failed to save banner');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await bannersAPI.delete(id);
      toast.success('Banner deleted');
      fetchBanners();
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  };

  const handleToggle = async (banner) => {
    try {
      await bannersAPI.update(banner.id, { is_active: !banner.is_active });
      fetchBanners();
    } catch (error) {
      toast.error('Failed to update banner');
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-banners">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Banners</h1>
          <p className="text-slate-400">Manage homepage banners</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-admin bg-primary hover:bg-primary/90" data-testid="add-banner-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle>{editingBanner ? 'Edit Banner' : 'Add New Banner'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Banner title"
                  className="input-admin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Banner Image *</Label>
                <SingleImageUpload
                  value={formData.image_url}
                  onChange={(imageUrl) => setFormData({ ...formData, image_url: imageUrl })}
                  folder="banners"
                  label=""
                  description="Upload banner image (recommended: 1200x400px)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link (Optional)</Label>
                  <Input
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="/products"
                    className="input-admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input
                    type="number"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="input-admin"
                  />
                </div>
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
                  {editingBanner ? 'Update' : 'Create'}
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
                <TableHead className="text-slate-400">Banner</TableHead>
                <TableHead className="text-slate-400">Title</TableHead>
                <TableHead className="text-slate-400">Position</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : banners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No banners found
                  </TableCell>
                </TableRow>
              ) : (
                banners.map((banner) => (
                  <TableRow key={banner.id} className="border-slate-700">
                    <TableCell>
                      <img src={getImageUrl(banner.image_url)} alt="" className="w-32 h-16 object-cover rounded" />
                    </TableCell>
                    <TableCell className="font-medium">{banner.title}</TableCell>
                    <TableCell>{banner.position}</TableCell>
                    <TableCell>
                      <Switch checked={banner.is_active} onCheckedChange={() => handleToggle(banner)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(banner)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-400" onClick={() => handleDelete(banner.id)}>
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
