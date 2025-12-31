import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Carousel, CarouselContent, CarouselItem } from '../components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { Star, ChevronRight, Truck, Shield, RefreshCcw, Headphones, Tag, Copy } from 'lucide-react';
import { productsAPI, categoriesAPI, bannersAPI, offersAPI } from '../lib/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../lib/utils';

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
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, bannersRes, offersRes] = await Promise.all([
        productsAPI.getAll({ limit: 12 }),
        categoriesAPI.getTree(),
        bannersAPI.getAll(),
        offersAPI.getAll(),
      ]);
      setProducts(productsRes.data.products || []);
      setCategories(categoriesRes.data || []);
      setBanners(bannersRes.data || []);
      setOffers(offersRes.data || []);
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
          <Carousel
            className="w-full"
            plugins={[
              Autoplay({
                delay: 3000,
              }),
            ]}
          >
            <CarouselContent>
              {banners.map((banner, index) => (
                <CarouselItem key={banner.id || index}>
                  <div className="relative aspect-[21/9] md:aspect-[3/1]">
                    <img
                      src={getImageUrl(banner.image_url)}
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

      {/* Offers Section */}
      {
        offers.length > 0 && (
          <section className="py-8 bg-primary/5">
            <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Tag className="w-6 h-6 text-primary" />
                Exciting Offers
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offers.filter(offer => offer.is_active).map((offer, index) => (
                  <Card key={offer.id || index} className="overflow-hidden border-primary/20">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{offer.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                        </div>
                        <Badge className="bg-primary text-primary-foreground text-lg px-3 py-1">
                          {offer.discount_type === 'percentage' ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} OFF`}
                        </Badge>
                      </div>

                      {offer.coupon_code && (
                        <div className="bg-muted p-3 rounded-lg flex items-center justify-between mt-4 border border-dashed border-primary/30">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Use Code:</span>
                            <span className="font-mono font-bold ml-2 text-primary">{offer.coupon_code}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              navigator.clipboard.writeText(offer.coupon_code);
                              // Toast notification would be good here
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </Button>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted-foreground semi-bold">
                        <span>Min. Order: ₹{offer.min_order_value}</span>
                        {offer.end_date && <span>Valid till: {new Date(offer.end_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )
      }

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
                  src={getImageUrl(category.image_url) || 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500'}
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
    </div >
  );
}
