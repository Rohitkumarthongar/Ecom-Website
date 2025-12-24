import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '../components/ui/carousel';
import { Star, ChevronRight, Truck, Shield, RefreshCcw, Headphones } from 'lucide-react';
import { productsAPI, categoriesAPI, bannersAPI } from '../lib/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const ProductCard = ({ product }) => {
  const { addItem } = useCart();
  const { isWholesale } = useAuth();
  const navigate = useNavigate();

  const discount = Math.round(((product.mrp - product.selling_price) / product.mrp) * 100);
  const showWholesale = isWholesale && product.wholesale_price;

  return (
    <Card 
      className="card-product group cursor-pointer"
      onClick={() => navigate(`/products/${product.id}`)}
      data-testid={`product-card-${product.id}`}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.images?.[0] || 'https://images.unsplash.com/photo-1624927637280-f033784c1279?w=500'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <Badge className="absolute top-2 left-2 discount-badge">
            {discount}% OFF
          </Badge>
        )}
        {showWholesale && (
          <Badge className="absolute top-2 right-2 wholesale-badge">
            Wholesale
          </Badge>
        )}
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
          <span className="text-sm text-muted-foreground line-through">
            ₹{product.mrp.toLocaleString()}
          </span>
        </div>
        {showWholesale && (
          <p className="text-xs text-[#5b21b6] font-medium mt-1">
            Min. {product.wholesale_min_qty} pcs for wholesale price
          </p>
        )}
      </div>
    </Card>
  );
};

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, bannersRes] = await Promise.all([
        productsAPI.getAll({ limit: 12 }),
        categoriesAPI.getAll(),
        bannersAPI.getAll(),
      ]);
      setProducts(productsRes.data.products || []);
      setCategories(categoriesRes.data || []);
      setBanners(bannersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Truck, title: 'Free Delivery', desc: 'On orders above ₹499' },
    { icon: Shield, title: 'Secure Payment', desc: '100% secure checkout' },
    { icon: RefreshCcw, title: 'Easy Returns', desc: '7 days return policy' },
    { icon: Headphones, title: '24/7 Support', desc: 'Dedicated customer care' },
  ];

  return (
    <div className="animate-fade-in" data-testid="home-page">
      {/* Hero Banner Carousel */}
      <section className="relative">
        {banners.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent>
              {banners.map((banner, index) => (
                <CarouselItem key={banner.id || index}>
                  <div className="relative aspect-[21/9] md:aspect-[3/1]">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
                      <div className="max-w-7xl mx-auto px-4 w-full">
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white max-w-lg">
                          {banner.title}
                        </h1>
                        <Button 
                          onClick={() => navigate(banner.link || '/products')}
                          className="mt-6 btn-primary"
                        >
                          Shop Now
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        ) : (
          <div className="gradient-hero aspect-[21/9] md:aspect-[3/1] flex items-center">
            <div className="max-w-7xl mx-auto px-4 w-full">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white max-w-lg">
                Discover Amazing Deals on Fashion & More
              </h1>
              <p className="text-white/80 mt-4 text-lg max-w-md">
                Shop from thousands of products at wholesale prices
              </p>
              <Button 
                onClick={() => navigate('/products')}
                className="mt-6 bg-white text-primary hover:bg-white/90 rounded-full px-8 py-3 font-bold"
              >
                Shop Now
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="py-8 border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">Shop by Category</h2>
            <Link to="/products" className="text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.id}`}
                className="group relative aspect-square rounded-2xl overflow-hidden"
                data-testid={`category-${category.id}`}
              >
                <img
                  src={category.image_url || 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500'}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                  <h3 className="text-white font-bold text-lg">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">Trending Products</h2>
            <Link to="/products" className="text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Wholesale Banner */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] rounded-3xl p-8 md:p-12 text-white">
            <div className="max-w-xl">
              <Badge className="bg-white/20 text-white mb-4">For Business</Badge>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                Get Wholesale Prices with GST Registration
              </h2>
              <p className="text-white/80 mb-6">
                Register with your GST number and unlock exclusive wholesale prices on bulk orders. Save up to 40% on every purchase!
              </p>
              <Button 
                onClick={() => navigate('/register')}
                className="bg-white text-[#5b21b6] hover:bg-white/90 rounded-full px-8 py-3 font-bold"
              >
                Register as Wholesaler
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-xl font-bold mb-8">Trusted by 10 Lakh+ Customers</h3>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
            <div className="text-2xl font-bold">PhonePe</div>
            <div className="text-2xl font-bold">Paytm</div>
            <div className="text-2xl font-bold">UPI</div>
            <div className="text-2xl font-bold">COD</div>
          </div>
        </div>
      </section>
    </div>
  );
}
