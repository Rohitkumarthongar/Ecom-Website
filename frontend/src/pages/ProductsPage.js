import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Checkbox } from '../components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Star, Filter, Grid3X3, LayoutGrid, ChevronLeft, ChevronRight, X, Heart } from 'lucide-react';
import { productsAPI, categoriesAPI } from '../lib/api';
import { getImageUrl } from '../lib/utils';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import WishlistButton from '../components/WishlistButton';

const ProductCard = ({ product, view }) => {
  const { addItem } = useCart();
  const { isWholesale } = useAuth();
  const navigate = useNavigate();

  const discount = Math.round(((product.mrp - product.selling_price) / product.mrp) * 100);
  const showWholesale = isWholesale && product.wholesale_price;

  if (view === 'list') {
    return (
      <Card
        className="flex gap-4 p-4 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => navigate(`/products/${product.id}`)}
        data-testid={`product-card-${product.id}`}
      >
        <img
          src={getImageUrl(product.images?.[0]) || 'https://images.unsplash.com/photo-1624927637280-f033784c1279?w=500'}
          alt={product.name}
          className="w-32 h-32 object-cover rounded-lg"
        />
        <div className="flex-1">
          <h3 className="font-semibold hover:text-primary transition-colors">{product.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
          <div className="flex items-center gap-1 mt-2">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm">4.5 (120 reviews)</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold price-tag text-primary">
              ₹{(showWholesale ? product.wholesale_price : product.selling_price).toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground line-through">₹{product.mrp.toLocaleString()}</span>
            {discount > 0 && <Badge className="discount-badge">{discount}% OFF</Badge>}
          </div>
        </div>
        <Button
          className="self-center btn-primary"
          onClick={(e) => { e.stopPropagation(); addItem(product); }}
        >
          Add to Cart
        </Button>
      </Card>
    );
  }

  return (
    <Card
      className="card-product group cursor-pointer"
      onClick={() => navigate(`/products/${product.id}`)}
      data-testid={`product-card-${product.id}`}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={getImageUrl(product.images?.[0]) || 'https://images.unsplash.com/photo-1624927637280-f033784c1279?w=500'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <Badge className="absolute top-2 left-2 discount-badge">{discount}% OFF</Badge>
        )}
        {showWholesale && (
          <Badge className="absolute top-2 right-2 wholesale-badge">Wholesale</Badge>
        )}
        {/* Wishlist Button */}
        <WishlistButton
          product={product}
          className={`absolute top-2 ${showWholesale ? 'right-20' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity`}
        />
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs text-muted-foreground">4.5 (120)</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold price-tag text-primary">
            ₹{(showWholesale ? product.wholesale_price : product.selling_price).toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground line-through">₹{product.mrp.toLocaleString()}</span>
        </div>
        <Button
          className="w-full mt-3 btn-primary opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); addItem(product); }}
        >
          Add to Cart
        </Button>
      </div>
    </Card>
  );
};

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [view, setView] = useState('grid');
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [maxPrice, setMaxPrice] = useState(50000);

  const page = parseInt(searchParams.get('page') || '1');
  const categoryId = searchParams.get('category');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sort') || 'created_at-desc';
  const minPrice = parseInt(searchParams.get('min_price') || '0');
  const maxPriceParam = parseInt(searchParams.get('max_price') || '50000');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, categoryId, search, sortBy, minPrice, maxPriceParam]);

  useEffect(() => {
    setPriceRange([minPrice, maxPriceParam]);
  }, [minPrice, maxPriceParam]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await productsAPI.getAll({
        page,
        category_id: categoryId,
        search,
        sort_by: sortBy.split('-')[0],
        sort_order: sortBy.includes('asc') ? 'asc' : 'desc',
        min_price: minPrice,
        max_price: maxPriceParam,
        limit: 20,
      });
      setProducts(response.data.products || []);
      setTotalPages(response.data.pages || 1);

      // Update max price based on available products
      if (response.data.products && response.data.products.length > 0) {
        const prices = response.data.products.map(p => p.selling_price);
        const calculatedMaxPrice = Math.max(...prices, 50000);
        setMaxPrice(calculatedMaxPrice);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getFlat();
      setCategories(response.data || []);
    } catch (error) {
      // Failed to fetch categories
    }
  };

  const updateFilters = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const updatePriceRange = (range) => {
    const params = new URLSearchParams(searchParams);
    params.set('min_price', range[0]);
    params.set('max_price', range[1]);
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
    setPriceRange([0, maxPrice]);
  };

  const activeFiltersCount = () => {
    let count = 0;
    if (categoryId) count++;
    if (search) count++;
    if (minPrice > 0 || maxPriceParam < maxPrice) count++;
    return count;
  };

  // Helper to build category tree from flat list
  const buildCategoryTree = (cats) => {
    const tree = [];
    const map = {};

    // First pass: create nodes
    cats.forEach(cat => {
      map[cat.id] = { ...cat, children: [] };
    });

    // Second pass: link parents and children
    cats.forEach(cat => {
      if (cat.parent_id && map[cat.parent_id]) {
        map[cat.parent_id].children.push(map[cat.id]);
      } else {
        tree.push(map[cat.id]);
      }
    });

    return tree;
  };

  const CategoryTreeItem = ({ category, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    // Expand if active category is this or a child
    const isActive = categoryId === category.id;
    const hasActiveChild = (cat) => {
      if (cat.id === categoryId) return true;
      return cat.children?.some(child => hasActiveChild(child));
    };

    useEffect(() => {
      if (hasActiveChild(category)) {
        setIsExpanded(true);
      }
    }, [categoryId]);

    const hasChildren = category.children && category.children.length > 0;

    return (
      <div className="select-none">
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer text-sm mb-1 ${isActive
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={(e) => {
            e.stopPropagation();
            updateFilters('category', category.id);
          }}
        >
          <span className="truncate">{category.name}</span>
          {hasChildren && (
            <div
              className="p-1 hover:bg-background rounded-md transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronRight className="w-3 h-3 transform rotate-90 transition-transform" />
              ) : (
                <ChevronRight className="w-3 h-3 transition-transform" />
              )}
            </div>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="animate-in slide-in-from-top-1 duration-200">
            {category.children.map(child => (
              <CategoryTreeItem key={child.id} category={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const FilterSidebar = () => {
    const categoryTree = buildCategoryTree(categories);

    return (
      <div className="space-y-6">
        {/* Active Filters */}
        {activeFiltersCount() > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Active Filters ({activeFiltersCount()})</h4>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                <X className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categoryId && (
                <Badge variant="secondary" className="flex items-center gap-1 rounded-md px-2 py-1">
                  {categories.find(c => c.id === categoryId)?.name}
                  <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => updateFilters('category', '')} />
                </Badge>
              )}
              {search && (
                <Badge variant="secondary" className="flex items-center gap-1 rounded-md px-2 py-1">
                  "{search}"
                  <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => updateFilters('search', '')} />
                </Badge>
              )}
              {(minPrice > 0 || maxPriceParam < maxPrice) && (
                <Badge variant="secondary" className="flex items-center gap-1 rounded-md px-2 py-1">
                  ₹{minPrice} - ₹{maxPriceParam}
                  <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => updatePriceRange([0, maxPrice])} />
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="pb-4 border-b">
          <h4 className="font-semibold mb-3 text-sm">Categories</h4>
          <div className="space-y-0.5">
            <div
              className={`cursor-pointer px-3 py-2 rounded-lg transition-colors text-sm mb-1 ${!categoryId
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              onClick={() => updateFilters('category', '')}
            >
              All Products
            </div>
            {categoryTree.map((cat) => (
              <CategoryTreeItem key={cat.id} category={cat} />
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="pb-4 border-b">
          <h4 className="font-semibold mb-3 text-sm">Price Range</h4>
          <div className="space-y-4 px-1">
            <div>
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                onValueCommit={updatePriceRange}
                max={maxPrice}
                step={100}
                className="w-full my-4"
              />
              <div className="flex items-center gap-4">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Min</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setPriceRange([value, priceRange[1]]);
                      }}
                      onBlur={() => updatePriceRange(priceRange)}
                      className="h-8 pl-5 text-xs"
                    />
                  </div>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Max</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || maxPrice;
                        setPriceRange([priceRange[0], value]);
                      }}
                      onBlur={() => updatePriceRange(priceRange)}
                      className="h-8 pl-5 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Price Filters */}
        <div>
          <h4 className="font-semibold mb-3 text-sm">Quick Filters</h4>
          <div className="space-y-1">
            {[
              { label: 'Under ₹500', min: 0, max: 500 },
              { label: '₹500 - ₹1,000', min: 500, max: 1000 },
              { label: '₹1,000 - ₹5,000', min: 1000, max: 5000 },
              { label: '₹5,000 - ₹10,000', min: 5000, max: 10000 },
              { label: 'Above ₹10,000', min: 10000, max: maxPrice },
            ].map((range) => (
              <div
                key={range.label}
                className={`cursor-pointer px-3 py-1.5 rounded-md transition-colors text-sm ${minPrice === range.min && maxPriceParam === range.max
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                onClick={() => updatePriceRange([range.min, range.max])}
              >
                {range.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" data-testid="products-page">
      <div className="flex gap-8">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <FilterSidebar />
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {search ? `Search: "${search}"` : categoryId ? categories.find(c => c.id === categoryId)?.name || 'Products' : 'All Products'}
              </h1>
              <p className="text-muted-foreground">{products.length} products found</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile Filter */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterSidebar />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(value) => updateFilters('sort', value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Newest First</SelectItem>
                  <SelectItem value="created_at-asc">Oldest First</SelectItem>
                  <SelectItem value="selling_price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="selling_price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="name-asc">Name: A-Z</SelectItem>
                  <SelectItem value="name-desc">Name: Z-A</SelectItem>
                  <SelectItem value="mrp-desc">MRP: High to Low</SelectItem>
                  <SelectItem value="stock_qty-desc">Stock: High to Low</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="hidden sm:flex border rounded-lg">
                <Button
                  variant={view === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setView('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={view === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setView('list')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className={`grid ${view === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`${view === 'grid' ? 'aspect-square' : 'h-40'} bg-muted rounded-2xl animate-pulse`} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            <div className={`grid ${view === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} view={view} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => updateFilters('page', String(page - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-4">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => updateFilters('page', String(page + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
