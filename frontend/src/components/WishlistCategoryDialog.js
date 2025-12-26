import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import {
  Heart,
  Plus,
  FolderPlus,
  Star,
  Tag,
  Gift,
  Home,
  Laptop,
  Book,
  Music,
  Plane,
  Check
} from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { toast } from 'sonner';

const iconMap = {
  'heart': Heart,
  'star': Star,
  'tag': Tag,
  'gift': Gift,
  'home': Home,
  'tech': Laptop,
  'book': Book,
  'music': Music,
  'travel': Plane
};

const iconOptions = [
  { value: 'heart', label: '❤️ Heart', icon: Heart },
  { value: 'star', label: '⭐ Star', icon: Star },
  { value: 'tag', label: '🏷️ Tag', icon: Tag },
  { value: 'gift', label: '🎁 Gift', icon: Gift },
  { value: 'home', label: '🏠 Home', icon: Home },
  { value: 'fashion', label: '👗 Fashion', icon: Tag },
  { value: 'tech', label: '💻 Tech', icon: Laptop },
  { value: 'book', label: '📚 Books', icon: Book },
  { value: 'music', label: '🎵 Music', icon: Music },
  { value: 'travel', label: '✈️ Travel', icon: Plane }
];

const priorityOptions = [
  { value: 1, label: 'Low Priority', color: 'bg-gray-100 text-gray-800' },
  { value: 2, label: 'Medium Priority', color: 'bg-yellow-100 text-yellow-800' },
  { value: 3, label: 'High Priority', color: 'bg-red-100 text-red-800' }
];

export default function WishlistCategoryDialog({
  open,
  onClose,
  product,
  onAddToWishlist
}) {
  const { wishlistCategories, createCategory } = useWishlist();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [priority, setPriority] = useState(1);
  const [notes, setNotes] = useState('');

  // New category form
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'heart'
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCategory('');
      setShowCreateForm(false);
      setPriority(1);
      setNotes('');
      setNewCategoryData({
        name: '',
        description: '',
        color: '#3B82F6',
        icon: 'heart'
      });

      // If no categories exist, show create form immediately
      if (wishlistCategories.length === 0) {
        setShowCreateForm(true);
      }
    }
  }, [open, wishlistCategories.length]);

  const handleAddToWishlist = async () => {
    let categoryId = selectedCategory;

    // If creating new category, create it first
    if (showCreateForm) {
      if (!newCategoryData.name.trim()) {
        toast.error('Category name is required');
        return;
      }

      // Check if category with this name already exists
      const existingCategory = wishlistCategories.find(
        c => c.name.toLowerCase() === newCategoryData.name.trim().toLowerCase()
      );

      if (existingCategory) {
        categoryId = existingCategory.id;
        // Proceed to use this existing category
      } else {
        const newCategory = await createCategory(newCategoryData);
        if (!newCategory) {
          return; // Error already shown by createCategory
        }
        categoryId = newCategory.id;
      }
    }

    // Add to wishlist with selected/created category
    await onAddToWishlist(product, categoryId, notes, priority);
    onClose();
  };

  const getIconEmoji = (iconName) => {
    const option = iconOptions.find(opt => opt.value === iconName);
    return option ? option.label.split(' ')[0] : '❤️';
  };

  const getCategoryIcon = (category) => {
    const IconComponent = iconMap[category.icon] || Heart;
    return <IconComponent className="w-4 h-4" style={{ color: category.color }} />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Add to Wishlist
          </DialogTitle>
        </DialogHeader>

        {product && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <img
                src={product.images?.[0] || 'https://images.unsplash.com/photo-1624927637280-f033784c1279?w=100'}
                alt={product.name}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{product.name}</h4>
                <p className="text-sm text-gray-600">₹{product.selling_price?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Category Selection */}
          {!showCreateForm && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Choose Category {wishlistCategories.length === 0 && '(No categories yet)'}
              </label>

              {wishlistCategories.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {wishlistCategories.map(category => (
                    <Card
                      key={category.id}
                      className={`cursor-pointer transition-all ${selectedCategory === category.id
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                        }`}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(category)}
                            <div>
                              <span className="font-medium text-sm">{category.name}</span>
                              {category.description && (
                                <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {category.item_count || 0} items
                            </Badge>
                            {selectedCategory === category.id && (
                              <Check className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <FolderPlus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No categories yet. Create your first category!</p>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setShowCreateForm(true)}
                className="w-full mt-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Category
              </Button>
            </div>
          )}

          {/* Create New Category Form */}
          {showCreateForm && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Create New Category</h4>
                {wishlistCategories.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Category Name</label>
                <Input
                  value={newCategoryData.name}
                  onChange={(e) => setNewCategoryData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Electronics, Fashion, Books"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  value={newCategoryData.description}
                  onChange={(e) => setNewCategoryData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Icon</label>
                  <Select
                    value={newCategoryData.icon}
                    onValueChange={(value) => setNewCategoryData(prev => ({ ...prev, icon: value }))}
                  >
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
                      value={newCategoryData.color}
                      onChange={(e) => setNewCategoryData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-8 h-8 rounded border"
                    />
                    <Input
                      value={newCategoryData.color}
                      onChange={(e) => setNewCategoryData(prev => ({ ...prev, color: e.target.value }))}
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Priority Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Priority Level</label>
            <div className="grid grid-cols-3 gap-2">
              {priorityOptions.map(option => (
                <Button
                  key={option.value}
                  variant={priority === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPriority(option.value)}
                  className={priority === option.value ? '' : 'hover:bg-gray-50'}
                >
                  <Star className="w-3 h-3 mr-1" />
                  {option.label.split(' ')[0]}
                </Button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium">Personal Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why do you want this item? Any specific details to remember..."
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleAddToWishlist}
              className="flex-1"
              disabled={!showCreateForm && !selectedCategory && wishlistCategories.length > 0}
            >
              <Heart className="w-4 h-4 mr-2" />
              Add to Wishlist
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}