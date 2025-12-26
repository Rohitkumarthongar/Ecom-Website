import { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Separator } from '../../components/ui/separator';
import { productsAPI, posAPI, paymentAPI, productLookupAPI } from '../../lib/api';
import { toast } from 'sonner';
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, User, CreditCard, Banknote, 
  Printer, QrCode, Scan, Receipt, Percent, UserPlus, X
} from 'lucide-react';

export default function AdminPOS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customer, setCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [applyGST, setApplyGST] = useState(true);
  const [discountType, setDiscountType] = useState('none'); // none, percentage, flat
  const [discountValue, setDiscountValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  
  const scanInputRef = useRef(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 200 });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const searchCustomer = async () => {
    if (!customerPhone || customerPhone.length < 10) return;
    try {
      const response = await posAPI.searchCustomer(customerPhone);
      setCustomer(response.data);
      if (response.data) {
        toast.success(`Customer found: ${response.data.name}`);
      } else {
        toast.info('Customer not found. You can add them.');
        setShowAddCustomer(true);
        setNewCustomer({ ...newCustomer, phone: customerPhone });
      }
    } catch (error) {
      setCustomer(null);
      setShowAddCustomer(true);
      setNewCustomer({ ...newCustomer, phone: customerPhone });
    }
  };

  const handleScanInput = async (e) => {
    if (e.key === 'Enter' && scanInput) {
      try {
        const response = await productLookupAPI.bySku(scanInput);
        if (response.data) {
          addToCart(response.data);
          toast.success(`Added: ${response.data.name}`);
        }
      } catch (error) {
        toast.error('Product not found');
      }
      setScanInput('');
    }
  };

  const addToCart = (product) => {
    if (product.stock_qty <= 0) {
      toast.error('Product out of stock');
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_qty) {
          toast.error('Not enough stock');
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const getSubtotal = () => cart.reduce((sum, item) => {
    const price = customer?.is_seller && item.product.wholesale_price 
      ? item.product.wholesale_price 
      : item.product.selling_price;
    return sum + price * item.quantity;
  }, 0);

  const getGST = () => applyGST ? getSubtotal() * 0.18 : 0;
  
  const getDiscount = () => {
    if (discountType === 'percentage' && discountValue) {
      return getSubtotal() * (parseFloat(discountValue) / 100);
    } else if (discountType === 'flat' && discountValue) {
      return parseFloat(discountValue);
    }
    return 0;
  };
  
  const getTotal = () => getSubtotal() + getGST() - getDiscount();

  const generateQR = async () => {
    try {
      const orderNumber = `POS${Date.now()}`;
      const customerName = customer?.name || customerPhone || 'Customer';
      const response = await paymentAPI.getQR(getTotal(), customerName, orderNumber);
      setQrData(response.data);
      setShowQRDialog(true);
    } catch (error) {
      console.error('QR Generation Error:', error);
      toast.error('Failed to generate QR');
    }
  };

  const handleCheckout = async (paymentConfirmed = false) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        shipping_address: {
          name: customer?.name || newCustomer.name || 'Walk-in Customer',
          phone: customerPhone || newCustomer.phone || 'N/A',
          line1: 'In-Store Purchase',
          city: 'Local',
          state: 'Local',
          pincode: '000000',
        },
        payment_method: paymentMethod,
        is_offline: true,
        customer_phone: customerPhone || newCustomer.phone || null,
        apply_gst: applyGST,
        discount_amount: discountType === 'flat' ? parseFloat(discountValue || 0) : 0,
        discount_percentage: discountType === 'percentage' ? parseFloat(discountValue || 0) : 0,
      };

      const response = await posAPI.createSale(orderData);
      setLastOrder(response.data);
      toast.success(`Sale completed! Order #${response.data.order_number}`);
      
      // Show invoice dialog
      setShowInvoiceDialog(true);
      setShowQRDialog(false);
      
      // Reset
      setCart([]);
      setDiscountValue('');
      setDiscountType('none');
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  const printInvoice = () => {
    if (!lastOrder) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${lastOrder.order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 5px; text-align: left; border-bottom: 1px dashed #ccc; }
          .total { font-weight: bold; font-size: 14px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Amorlias Mart</h1>
          <p>Invoice #${lastOrder.order_number}</p>
          <p>${new Date(lastOrder.created_at).toLocaleString('en-IN')}</p>
        </div>
        <table>
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${lastOrder.items.map(item => `
              <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.price}</td>
                <td>₹${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <table style="margin-top: 10px;">
          <tr><td>Subtotal</td><td style="text-align: right;">₹${lastOrder.subtotal.toFixed(2)}</td></tr>
          ${lastOrder.gst_applied ? `<tr><td>GST (18%)</td><td style="text-align: right;">₹${lastOrder.gst_total.toFixed(2)}</td></tr>` : ''}
          ${lastOrder.discount_amount > 0 ? `<tr><td>Discount</td><td style="text-align: right;">-₹${lastOrder.discount_amount.toFixed(2)}</td></tr>` : ''}
          <tr class="total"><td>Grand Total</td><td style="text-align: right;">₹${lastOrder.grand_total.toFixed(2)}</td></tr>
        </table>
        <p style="margin-top: 10px; font-size: 12px;">Payment: ${lastOrder.payment_method.toUpperCase()}</p>
        <div class="footer">
          <p>Thank you for shopping with us!</p>
          <p>Visit again</p>
        </div>
        <script>window.print(); window.close();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6" data-testid="admin-pos">
      {/* Products Section */}
      <div className="flex-1 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Point of Sale</h1>
          <p className="text-slate-400">Create offline sales</p>
        </div>

        {/* Scan Input */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              ref={scanInputRef}
              placeholder="Scan barcode or enter SKU..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value.toUpperCase())}
              onKeyDown={handleScanInput}
              className="pl-10 input-admin"
              data-testid="scan-input"
            />
          </div>
          <Button variant="outline" className="border-slate-600" onClick={() => scanInputRef.current?.focus()}>
            <QrCode className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 input-admin"
            data-testid="pos-search"
          />
        </div>

        <div className="flex-1 overflow-auto scrollbar-invisible">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className={`bg-slate-800 border-slate-700 cursor-pointer transition-all hover:border-primary ${
                  product.stock_qty <= 0 ? 'opacity-50' : ''
                }`}
                onClick={() => addToCart(product)}
                data-testid={`pos-product-${product.id}`}
              >
                <CardContent className="p-3">
                  <div className="aspect-square bg-slate-700 rounded-lg mb-2 overflow-hidden">
                    {product.images?.[0] && (
                      <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <h4 className="font-medium text-sm truncate">{product.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">{product.sku}</p>
                  <div className="flex justify-between items-center mt-2">
                    <div>
                      <span className="font-bold text-primary">₹{product.selling_price}</span>
                      {product.wholesale_price && (
                        <span className="text-xs text-violet-400 block">WS: ₹{product.wholesale_price}</span>
                      )}
                    </div>
                    <Badge className={product.stock_qty > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}>
                      {product.stock_qty}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <Card className="w-[420px] bg-slate-800 border-slate-700 flex flex-col">
        <CardHeader className="border-b border-slate-700 py-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="w-5 h-5" />
            Current Sale
            {cart.length > 0 && <Badge className="ml-2">{cart.reduce((s, i) => s + i.quantity, 0)}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Customer Search */}
          <div className="mb-4">
            <Label className="text-xs text-slate-400 mb-1 block">Customer (Optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="input-admin"
              />
              <Button variant="outline" className="border-slate-600" onClick={searchCustomer}>
                <User className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="border-slate-600" onClick={() => setShowAddCustomer(true)}>
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
            {customer && (
              <div className="mt-2 p-2 bg-slate-700/50 rounded text-sm flex justify-between items-center">
                <div>
                  <p className="font-medium">{customer.name}</p>
                  {customer.is_seller && (
                    <Badge className="mt-1 bg-violet-500/20 text-violet-400 text-xs">Seller - Wholesale Prices</Badge>
                  )}
                </div>
                <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => setCustomer(null)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto scrollbar-invisible space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Cart is empty</p>
                <p className="text-sm">Scan or click products to add</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400 text-xs">Item</TableHead>
                    <TableHead className="text-slate-400 text-xs text-center">Qty</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Price</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item) => {
                    const price = customer?.is_seller && item.product.wholesale_price 
                      ? item.product.wholesale_price 
                      : item.product.selling_price;
                    return (
                      <TableRow key={item.product.id} className="border-slate-700">
                        <TableCell className="py-2">
                          <p className="font-medium text-sm truncate max-w-[120px]">{item.product.name}</p>
                          <p className="text-xs text-slate-400">{item.product.sku}</p>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                            <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <span className="font-medium">₹{(price * item.quantity).toFixed(0)}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <Button size="icon" variant="ghost" className="w-6 h-6 text-red-400" onClick={() => removeFromCart(item.product.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Billing Options */}
          {cart.length > 0 && (
            <div className="border-t border-slate-700 pt-4 mt-4 space-y-3">
              {/* GST Toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-sm">Apply GST (18%)</Label>
                <Switch checked={applyGST} onCheckedChange={setApplyGST} />
              </div>

              {/* Discount */}
              <div className="flex gap-2">
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger className="w-32 input-admin h-9">
                    <SelectValue placeholder="Discount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Discount</SelectItem>
                    <SelectItem value="percentage">% Discount</SelectItem>
                    <SelectItem value="flat">Flat ₹</SelectItem>
                  </SelectContent>
                </Select>
                {discountType !== 'none' && (
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? '%' : '₹'}
                    className="input-admin h-9"
                  />
                )}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-sm bg-slate-700/50 p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subtotal</span>
                  <span>₹{getSubtotal().toFixed(2)}</span>
                </div>
                {applyGST && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">GST (18%)</span>
                    <span>₹{getGST().toFixed(2)}</span>
                  </div>
                )}
                {getDiscount() > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span>-₹{getDiscount().toFixed(2)}</span>
                  </div>
                )}
                <Separator className="my-2 bg-slate-600" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">₹{getTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="input-admin">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Cash
                    </div>
                  </SelectItem>
                  <SelectItem value="upi">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      UPI / QR
                    </div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Card
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {paymentMethod === 'upi' && (
                  <Button
                    variant="outline"
                    className="border-slate-600"
                    onClick={generateQR}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Show QR
                  </Button>
                )}
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 h-11"
                  onClick={() => handleCheckout()}
                  disabled={loading}
                  data-testid="pos-checkout-btn"
                >
                  {loading ? 'Processing...' : `Complete Sale`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan to Pay</DialogTitle>
          </DialogHeader>
          {qrData && (
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                {qrData.qr_code ? (
                  <img 
                    src={qrData.qr_code} 
                    alt="Payment QR Code" 
                    className="w-48 h-48"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-gray-400" />
                  </div>
                )}
              </div>
              <p className="text-xl font-bold text-primary mb-2">₹{qrData.amount.toFixed(2)}</p>
              <p className="text-sm text-slate-400 mb-4">UPI ID: {qrData.upi_id}</p>
              <Button onClick={() => handleCheckout(true)} className="w-full bg-emerald-500 hover:bg-emerald-600">
                Payment Received - Complete Sale
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Sale Complete!
            </DialogTitle>
          </DialogHeader>
          {lastOrder && (
            <div>
              <div className="bg-slate-700/50 p-4 rounded-lg mb-4">
                <p className="text-sm text-slate-400">Order Number</p>
                <p className="text-xl font-bold">{lastOrder.order_number}</p>
                <p className="text-2xl font-bold text-emerald-400 mt-2">₹{lastOrder.grand_total.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={printInvoice} className="flex-1" variant="outline">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Invoice
                </Button>
                <Button onClick={() => setShowInvoiceDialog(false)} className="flex-1 bg-primary">
                  New Sale
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer name"
                className="input-admin"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="Phone number"
                className="input-admin"
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="email@example.com"
                className="input-admin"
              />
            </div>
            <Button 
              onClick={() => {
                setCustomerPhone(newCustomer.phone);
                setShowAddCustomer(false);
                toast.success('Customer info added');
              }} 
              className="w-full bg-primary"
            >
              Add Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
