import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { SingleImageUpload } from '../../components/ui/image-upload';
import { categoriesAPI } from '../../lib/api';
import { getImageUrl } from '../../lib/utils';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FolderTree, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { usePopup } from '../../contexts/PopupContext';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'flat'
  const { showPopup } = usePopup();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    parent_id: '',
    is_active: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const [treeResponse, flatResponse] = await Promise.all([
        categoriesAPI.getTree(),
        categoriesAPI.getFlat()
      ]);
      setCategories(treeResponse.data || []);
      setFlatCategories(flatResponse.data || []);
    } catch (error) {
      // Failed to fetch categories
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      parent_id: '',
      is_active: true,
    });
    setEditingCategory(null);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      image_url: category.image_url || '',
      parent_id: category.parent_id || '',
      is_active: category.is_active,
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const submitData = {
        ...formData,
        parent_id: formData.parent_id || null
      };

      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, submitData);
        toast.success('Category updated successfully!');
      } else {
        await categoriesAPI.create(submitData);
        toast.success('Category created successfully!');
      }
      setShowDialog(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    }
  };

  const handleDelete = async (id, hasChildren = false, productsCount = 0) => {
    const warningMessage = hasChildren || productsCount > 0 
      ? `This category has ${hasChildren ? 'subcategories' : ''} ${hasChildren && productsCount > 0 ? 'and' : ''} ${productsCount > 0 ? `${productsCount} products` : ''}. This will delete everything permanently.`
      : "Are you sure you want to delete this category?";

    showPopup({
      title: "Delete Category",
      message: warningMessage,
      type: "error",
      onConfirm: async () => {
        try {
          await categoriesAPI.delete(id, hasChildren || productsCount > 0);
          toast.success('Category deleted');
          fetchCategories();
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Failed to delete category');
        }
      }
    });
  };

  const renderCategoryTree = (categories, level = 0) => {
    return categories.map((category) => (
      <div key={category.id}>
        <TableRow className="border-slate-700">
          <TableCell>
            <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 24}px` }}>
              {level > 0 && <ChevronRight className="w-4 h-4 text-slate-500" />}
              {category.children && category.children.length > 0 ? (
                <FolderOpen className="w-4 h-4 text-blue-400" />
              ) : (
                <Folder className="w-4 h-4 text-slate-400" />
              )}
              <div className="w-8 h-8 bg-slate-700 rounded-lg overflow-hidden">
                {category.image_url && (
                  <img src={getImageUrl(category.image_url)} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <span className="font-medium">{category.name}</span>
                {level > 0 && (
                  <div className="text-xs text-slate-500">
                    Level {category.level} • {category.full_path}
                  </div>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className="text-slate-400 max-w-[300px] truncate">
            {category.description || '-'}
          </TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Badge className={category.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}>
                {category.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {category.children && category.children.length > 0 && (
                <Badge variant="outline" className="text-blue-400 border-blue-400/30">
                  {category.children.length} sub
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button size="icon" variant="ghost" onClick={() => handleEdit(category)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="text-red-400 hover:text-red-300" 
                onClick={() => handleDelete(
                  category.id, 
                  category.children && category.children.length > 0,
                  category.products_count || 0
                )}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {category.children && category.children.length > 0 && renderCategoryTree(category.children, level + 1)}
      </div>
    ));
  };

  const renderFlatTable = () => {
    return flatCategories.map((category) => (
      <TableRow key={category.id} className="border-slate-700">
        <TableCell>
          <div className="flex items-center gap-3" style={{ paddingLeft: `${category.level * 20}px` }}>
            {category.level > 0 && <ChevronRight className="w-4 h-4 text-slate-500" />}
            <div className="w-8 h-8 bg-slate-700 rounded-lg overflow-hidden">
              {category.image_url && (
                <img src={getImageUrl(category.image_url)} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <span className="font-medium">{category.name}</span>
              <div className="text-xs text-slate-500">
                {category.full_path}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-slate-400 max-w-[300px] truncate">
          {category.description || '-'}
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Badge className={category.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}>
              {category.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline" className="text-slate-400">
              L{category.level}
            </Badge>
            {category.has_children && (
              <Badge variant="outline" className="text-blue-400 border-blue-400/30">
                Has children
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(category)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="text-red-400 hover:text-red-300" 
              onClick={() => handleDelete(category.id, category.has_children, category.products_count || 0)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="space-y-6" data-testid="admin-categories">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-slate-400">{flatCategories.length} categories</p>
        </div>
        <div className="flex gap-3">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tree">Tree View</SelectItem>
              <SelectItem value="flat">Flat View</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-admin bg-primary hover:bg-primary/90" data-testid="add-category-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Category Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter category name"
                    className="input-admin"
                    required
                    data-testid="category-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Parent Category</Label>
                  <Select 
                    value={formData.parent_id} 
                    onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
                  >
                    <SelectTrigger className="input-admin">
                      <SelectValue placeholder="Select parent category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Parent (Root Category)</SelectItem>
                      {flatCategories
                        .filter(cat => cat.id !== editingCategory?.id) // Don't allow self as parent
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {'  '.repeat(category.level)}
                            {category.full_path}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Category description"
                    className="input-admin min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category Image</Label>
                  <SingleImageUpload
                    value={formData.image_url}
                    onChange={(imageUrl) => setFormData({ ...formData, image_url: imageUrl })}
                    folder="categories"
                    label=""
                    description="Upload category image (max 5MB)"
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
                  <Button type="button" variant="ghost" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="save-category-btn">
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Categories Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-400">Category</TableHead>
                <TableHead className="text-slate-400">Description</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : flatCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                    <FolderTree className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No categories found
                  </TableCell>
                </TableRow>
              ) : viewMode === 'tree' ? (
                renderCategoryTree(categories)
              ) : (
                renderFlatTable()
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
