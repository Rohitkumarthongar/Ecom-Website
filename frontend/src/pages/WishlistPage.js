import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';
import { getImageUrl } from '../lib/utils';
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowLeft,
  Loader2,
  Plus,
  Edit,
  FolderPlus,
  Star,
  AlertTriangle,
  Settings,
  Tag,
  StickyNote,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { usePopup } from '../contexts/PopupContext';

const priorityColors = {
  1: 'bg-gray-100 text-gray-800',
  2: 'bg-yellow-100 text-yellow-800',
  3: 'bg-red-100 text-red-800'
};

const priorityLabels = {
  1: 'Low',
  2: 'Medium',
  3: 'High'
};

const CategoryDialog = ({ category = null, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    color: category?.color || '#3B82F6',
    icon: category?.icon || 'heart'
  });

  const iconOptions = [
    { value: 'heart', label: '❤️ Heart' },
    { value: 'star', label: '⭐ Star' },
    { value: 'tag', label: '🏷️ Tag' },
    { value: 'gift', label: '🎁 Gift' },
    { value: 'home', label: '🏠 Home' },
    { value: 'fashion', label: '👗 Fashion' },
    { value: 'tech', label: '💻 Tech' },
    { value: 'book', label: '📚 Books' },
    { value: 'music', label: '🎵 Music' },
    { value: 'travel', label: '✈️ Travel' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    onSave(formData);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {category ? 'Edit Category' : 'Create New Category'}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Category Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Electronics, Fashion, Books"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Description (Optional)</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of this category"
            className="mt-1"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Icon</label>
            <Select value={formData.icon} onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Color</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-10 h-10 rounded border"
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {category ? 'Update' : 'Create'} Category
          </Button>
        </div>
      </form>
    </DialogContent>
  );
};

export default function WishlistPage() {
  const navigate = useNavigate();
  const {
    wishlistItems,
    wishlistCategories,
    removeFromWishlist,
    clearWishlist,
    createCategory,
    updateCategory,
    deleteCategory,
    updateWishlistItem,
    loading
  } = useWishlist();
  const { addToCart } = useCart();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const { showPopup } = usePopup();


  const handleAddToCart = (product) => {
    addToCart(product, 1);
    toast.success('Added to cart');
  };

  const handleRemoveFromWishlist = (productId) => {
    removeFromWishlist(productId);
  };

  const handleClearWishlist = () => {
    showPopup({
      title: "Clear Wishlist",
      message: "Are you sure you want to clear your entire wishlist? This action cannot be undone.",
      type: "warning",
      onConfirm: clearWishlist
    });
  };


  const handleClearCategory = (categoryId) => {
    const category = wishlistCategories.find(c => c.id === categoryId);
    showPopup({
      title: "Clear Category",
      message: `Are you sure you want to clear all items from "${category?.name}"?`,
      type: "warning",
      onConfirm: () => clearWishlist(categoryId)
    });
  };


  const handleCreateCategory = async (categoryData) => {
    const result = await createCategory(categoryData);
    if (result) {
      setCategoryDialogOpen(false);
    }
  };

  const handleUpdateCategory = async (categoryData) => {
    await updateCategory(editingCategory.id, categoryData);
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (categoryId) => {
    const category = wishlistCategories.find(c => c.id === categoryId);
    showPopup({
      title: "Delete Category",
      message: `Are you sure you want to delete "${category?.name}"? All items will be moved to the default category.`,
      type: "error",
      onConfirm: async () => {
        await deleteCategory(categoryId);
        if (selectedCategory === categoryId) {
          setSelectedCategory('all');
        }
      }
    });
  };


  const handleUpdatePriority = async (wishlistId, priority) => {
    await updateWishlistItem(wishlistId, { priority });
  };

  const handleUpdateNotes = async (wishlistId, notes) => {
    await updateWishlistItem(wishlistId, { notes });
  };

  const calculateDiscount = (mrp, sellingPrice) => {
    if (!mrp || !sellingPrice || mrp <= sellingPrice) return 0;
    return Math.round(((mrp - sellingPrice) / mrp) * 100);
  };

  // Filter items by selected category
  const filteredItems = selectedCategory === 'all'
    ? wishlistItems
    : wishlistItems.filter(item => item.category_id === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-400">Loading your wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">My Wishlist</h1>
              <p className="text-slate-400">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
                {wishlistCategories.length > 0 && ` in ${wishlistCategories.length} ${wishlistCategories.length === 1 ? 'category' : 'categories'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Category
                </Button>
              </DialogTrigger>
              <CategoryDialog
                onSave={handleCreateCategory}
                onClose={() => setCategoryDialogOpen(false)}
              />
            </Dialog>

            {wishlistItems.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearWishlist}
                className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary">
              All Items ({wishlistItems.length})
            </TabsTrigger>
            {wishlistCategories.map(category => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="data-[state=active]:bg-primary relative group"
              >
                <span style={{ color: category.color }} className="mr-2">
                  {category.icon === 'heart' ? '❤️' :
                    category.icon === 'star' ? '⭐' :
                      category.icon === 'tag' ? '🏷️' :
                        category.icon === 'gift' ? '🎁' :
                          category.icon === 'home' ? '🏠' :
                            category.icon === 'fashion' ? '👗' :
                              category.icon === 'tech' ? '💻' :
                                category.icon === 'book' ? '📚' :
                                  category.icon === 'music' ? '🎵' :
                                    category.icon === 'travel' ? '✈️' : '❤️'}
                </span>
                {category.name} ({category.item_count || 0})

                {!category.is_default && (
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategory(category);
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            {/* Category Actions */}
            {selectedCategory !== 'all' && (
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  {(() => {
                    const category = wishlistCategories.find(c => c.id === selectedCategory);
                    return category ? (
                      <>
                        <span style={{ color: category.color }} className="text-2xl">
                          {category.icon === 'heart' ? '❤️' :
                            category.icon === 'star' ? '⭐' :
                              category.icon === 'tag' ? '🏷️' :
                                category.icon === 'gift' ? '🎁' :
                                  category.icon === 'home' ? '🏠' :
                                    category.icon === 'fashion' ? '👗' :
                                      category.icon === 'tech' ? '💻' :
                                        category.icon === 'book' ? '📚' :
                                          category.icon === 'music' ? '🎵' :
                                            category.icon === 'travel' ? '✈️' : '❤️'}
                        </span>
                        <div>
                          <h2 className="text-xl font-semibold text-white">{category.name}</h2>
                          {category.description && (
                            <p className="text-slate-400 text-sm">{category.description}</p>
                          )}
                        </div>
                      </>
                    ) : null;
                  })()}
                </div>

                <div className="flex items-center gap-2">
                  {(() => {
                    const category = wishlistCategories.find(c => c.id === selectedCategory);
                    return category && !category.is_default ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCategory(category)}
                          className="text-slate-300 border-slate-600 hover:bg-slate-700"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClearCategory(selectedCategory)}
                          className="text-orange-400 border-orange-400 hover:bg-orange-400 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Clear Category
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCategory(selectedCategory)}
                          className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Category
                        </Button>
                      </>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            {/* Wishlist Items */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <Heart className="w-24 h-24 mx-auto text-slate-600 mb-6" />
                <h2 className="text-2xl font-semibold text-white mb-4">
                  {selectedCategory === 'all' ? 'Your wishlist is empty' : 'No items in this category'}
                </h2>
                <p className="text-slate-400 mb-8">
                  Save items you love by clicking the heart icon on any product
                </p>
                <Button
                  onClick={() => navigate('/products')}
                  className="bg-primary hover:bg-primary/90"
                >
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((product) => (
                  <Card key={product.id} className="bg-slate-800 border-slate-700 overflow-hidden group hover:shadow-xl transition-all duration-300">
                    <div className="relative">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={getImageUrl(product.images?.[0]) || 'https://images.unsplash.com/photo-1624927637280-f033784c1279?w=500'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => navigate(`/products/${product.id}`)}
                        />
                      </div>

                      {/* Discount Badge */}
                      {calculateDiscount(product.mrp, product.selling_price) > 0 && (
                        <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-500">
                          {calculateDiscount(product.mrp, product.selling_price)}% OFF
                        </Badge>
                      )}

                      {/* Priority Badge */}
                      {product.priority && product.priority > 1 && (
                        <Badge className={`absolute top-3 right-3 ${priorityColors[product.priority]}`}>
                          <Star className="w-3 h-3 mr-1" />
                          {priorityLabels[product.priority]}
                        </Badge>
                      )}

                      {/* Remove from Wishlist */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveFromWishlist(product.id)}
                        className="absolute bottom-3 right-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </Button>
                    </div>

                    <CardContent className="p-4">
                      <h3
                        className="font-semibold text-white mb-2 line-clamp-2 cursor-pointer hover:text-primary"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        {product.name}
                      </h3>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl font-bold text-primary">
                          ₹{product.selling_price?.toLocaleString()}
                        </span>
                        {product.mrp && product.mrp > product.selling_price && (
                          <span className="text-sm text-slate-400 line-through">
                            ₹{product.mrp.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {product.notes && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-400 bg-slate-700/50 p-2 rounded">
                            <StickyNote className="w-3 h-3 inline mr-1" />
                            {product.notes}
                          </p>
                        </div>
                      )}

                      {/* Stock Status */}
                      <div className="mb-3">
                        {product.stock_qty > 0 ? (
                          <Badge variant="outline" className="text-green-400 border-green-400">
                            In Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-400 border-red-400">
                            Out of Stock
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock_qty <= 0}
                          className="flex-1 bg-primary hover:bg-primary/90"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add to Cart
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/products/${product.id}`)}
                          className="border-slate-600 hover:bg-slate-700"
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Category Dialog */}
        {editingCategory && (
          <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
            <CategoryDialog
              category={editingCategory}
              onSave={handleUpdateCategory}
              onClose={() => setEditingCategory(null)}
            />
          </Dialog>
        )}
      </div>
    </div>
  );
}