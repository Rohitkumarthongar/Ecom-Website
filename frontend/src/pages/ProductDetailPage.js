import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Star, Minus, Plus, ShoppingCart, Heart, Share2, Truck, Shield, RefreshCcw, ChevronLeft } from 'lucide-react';
import { productsAPI } from '../lib/api';
import { getImageUrl } from '../lib/utils';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isWholesale, user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await productsAPI.getOne(id);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-muted rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
            <div className="h-12 bg-muted rounded w-1/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const discount = Math.round(((product.mrp - product.selling_price) / product.mrp) * 100);
  const showWholesale = isWholesale && product.wholesale_price;
  const qualifiesForWholesale = quantity >= (product.wholesale_min_qty || 10);
  const currentPrice = showWholesale && qualifiesForWholesale ? product.wholesale_price : product.selling_price;

  const handleAddToCart = () => {
    addItem(product, quantity);
    toast.success('Added to cart!');
  };

  const handleBuyNow = () => {
    addItem(product, quantity);
    if (user) {
      navigate('/checkout');
    } else {
      navigate('/login?redirect=/checkout');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" data-testid="product-detail-page">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Products
      </button>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
            <img
              src={getImageUrl(product.images?.[selectedImage]) || 'https://images.unsplash.com/photo-1624927637280-f033784c1279?w=800'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-invisible pb-2">
              {product.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${selectedImage === index ? 'border-primary' : 'border-transparent'
                    }`}
                >
                  <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {discount > 0 && <Badge className="discount-badge">{discount}% OFF</Badge>}
            {showWholesale && <Badge className="wholesale-badge">Wholesale Available</Badge>}
            {product.stock_qty <= product.low_stock_threshold && product.stock_qty > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">Low Stock</Badge>
            )}
            {product.stock_qty === 0 && (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < 4 ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">(120 reviews)</span>
          </div>

          {/* Price */}
          <div className="mt-6 p-4 bg-muted/50 rounded-xl">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold price-tag text-primary">
                ₹{currentPrice.toLocaleString()}
              </span>
              <span className="text-lg text-muted-foreground line-through">
                ₹{product.mrp.toLocaleString()}
              </span>
              {discount > 0 && (
                <span className="text-emerald-600 font-semibold">Save ₹{(product.mrp - currentPrice).toLocaleString()}</span>
              )}
            </div>
            {showWholesale && (
              <div className="mt-2 p-3 bg-[#5b21b6]/10 rounded-lg border border-[#5b21b6]/20">
                <p className="text-sm font-medium text-[#5b21b6]">
                  {qualifiesForWholesale
                    ? '✓ Wholesale price applied!'
                    : `Add ${product.wholesale_min_qty - quantity} more for wholesale price of ₹${product.wholesale_price.toLocaleString()}`
                  }
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Inclusive of all taxes | GST: {product.gst_rate}%
            </p>
          </div>

          {/* Quantity */}
          <div className="mt-6">
            <label className="text-sm font-medium mb-2 block">Quantity</label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.min(product.stock_qty, quantity + 1))}
                disabled={quantity >= product.stock_qty}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {product.stock_qty} available
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 btn-primary"
              onClick={handleAddToCart}
              disabled={product.stock_qty === 0}
              data-testid="add-to-cart-btn"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Add to Cart
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-bold"
              onClick={handleBuyNow}
              disabled={product.stock_qty === 0}
              data-testid="buy-now-btn"
            >
              Buy Now
            </Button>
          </div>

          <div className="flex gap-4 mt-4">
            <Button variant="ghost" size="sm">
              <Heart className="w-4 h-4 mr-2" />
              Add to Wishlist
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-xl">
              <Truck className="w-6 h-6 mx-auto text-primary mb-2" />
              <p className="text-xs font-medium">Free Delivery</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-xl">
              <Shield className="w-6 h-6 mx-auto text-primary mb-2" />
              <p className="text-xs font-medium">Secure Payment</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-xl">
              <RefreshCcw className="w-6 h-6 mx-auto text-primary mb-2" />
              <p className="text-xs font-medium">Easy Returns</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="description" className="mt-12">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
          <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Description
          </TabsTrigger>
          <TabsTrigger value="specifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Specifications
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Reviews
          </TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="mt-6">
          <Card className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              {product.description || 'No description available for this product.'}
            </p>
          </Card>
        </TabsContent>
        <TabsContent value="specifications" className="mt-6">
          <Card className="p-6">
            <dl className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <dt className="text-muted-foreground">SKU</dt>
                <dd className="font-mono">{product.sku}</dd>
              </div>
              {product.hsn_code && (
                <div className="flex justify-between py-2 border-b">
                  <dt className="text-muted-foreground">HSN Code</dt>
                  <dd className="font-mono">{product.hsn_code}</dd>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <dt className="text-muted-foreground">GST Rate</dt>
                <dd>{product.gst_rate}%</dd>
              </div>
              {product.weight && (
                <div className="flex justify-between py-2 border-b">
                  <dt className="text-muted-foreground">Weight</dt>
                  <dd>{product.weight} kg</dd>
                </div>
              )}
            </dl>
          </Card>
        </TabsContent>
        <TabsContent value="reviews" className="mt-6">
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
