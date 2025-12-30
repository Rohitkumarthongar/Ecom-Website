import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { MultipleImageUpload } from '../../components/ui/image-upload';
import { productsAPI, categoriesAPI, settingsAPI } from '../../lib/api';
import { getImageUrl } from '../../lib/utils';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Package, Eye, Upload, Download, FileSpreadsheet, Barcode } from 'lucide-react';
import { usePopup } from '../../contexts/PopupContext';
import JsBarcode from 'jsbarcode';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const { showPopup } = usePopup();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    sku: '',
    mrp: '',
    selling_price: '',
    wholesale_price: '',
    wholesale_min_qty: '10',
    cost_price: '',
    stock_qty: '0',
    low_stock_threshold: '10',
    gst_rate: '18',
    hsn_code: '',
    images: [],
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch categories first independently
      try {
        const categoriesRes = await categoriesAPI.getAll();
        console.log('Categories fetched:', categoriesRes.data);
        setCategories(categoriesRes.data || []);
      } catch (catError) {
        console.error('Failed to fetch categories:', catError);
        toast.error('Failed to load categories');
      }

      // Fetch settings
      try {
        const settingsRes = await settingsAPI.get();
        setSettings(settingsRes.data);
      } catch (settingsError) {
        console.error('Failed to fetch settings:', settingsError);
      }

      // Then fetch products with include_inactive=true for admin panel
      const productsRes = await productsAPI.getAll({ limit: 100, include_inactive: true });
      setProducts(productsRes.data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category_id: '',
      sku: '',
      mrp: '',
      selling_price: '',
      wholesale_price: '',
      wholesale_min_qty: '10',
      cost_price: '',
      stock_qty: '0',
      low_stock_threshold: '10',
      gst_rate: '18',
      hsn_code: '',
      color: '',
      material: '',
      origin: '',
      images: [],
      is_active: true,
    });
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category_id: product.category_id,
      sku: product.sku,
      mrp: String(product.mrp),
      selling_price: String(product.selling_price),
      wholesale_price: String(product.wholesale_price || ''),
      wholesale_min_qty: String(product.wholesale_min_qty || 10),
      cost_price: String(product.cost_price),
      stock_qty: String(product.stock_qty),
      low_stock_threshold: String(product.low_stock_threshold || 10),
      gst_rate: String(product.gst_rate || 18),
      hsn_code: product.hsn_code || '',
      color: product.color || '',
      material: product.material || '',
      origin: product.origin || '',
      images: product.images || [],
      is_active: product.is_active,
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      mrp: parseFloat(formData.mrp),
      selling_price: parseFloat(formData.selling_price),
      wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : null,
      wholesale_min_qty: parseInt(formData.wholesale_min_qty),
      cost_price: parseFloat(formData.cost_price),
      stock_qty: parseInt(formData.stock_qty),
      low_stock_threshold: parseInt(formData.low_stock_threshold),
      gst_rate: parseFloat(formData.gst_rate),
    };

    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, payload);
        toast.success('Product updated successfully!');
      } else {
        await productsAPI.create(payload);
        toast.success('Product created successfully!');
      }
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    showPopup({
      title: "Delete Product",
      message: "Are you sure you want to delete this product?",
      type: "error",
      onConfirm: async () => {
        try {
          await productsAPI.delete(id);
          toast.success('Product deleted');
          fetchData();
        } catch (error) {
          toast.error('Failed to delete product');
        }
      }
    });
  };

  const generateBarcode = (product) => {
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');

      // Generate barcode using SKU
      JsBarcode(canvas, product.sku, {
        format: 'CODE128',
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 14,
        margin: 10
      });

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `barcode-${product.sku}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Barcode generated for ${product.name}`);
      });
    } catch (error) {
      console.error('Barcode generation error:', error);
      toast.error('Failed to generate barcode');
    }
  };

  const downloadTemplate = () => {
    // Create a more comprehensive template with examples
    const csvHeaders = [
      'name', 'sku', 'description', 'category_id', 'mrp', 'selling_price', 'cost_price',
      'wholesale_price', 'wholesale_min_qty', 'stock_qty', 'low_stock_threshold', 'gst_rate',
      'hsn_code', 'color', 'material', 'origin', 'is_active'
    ];

    const sampleData = [
      [
        'Sample T-Shirt',
        'TSH001',
        'Comfortable cotton t-shirt for daily wear',
        categories.length > 0 ? categories[0].id : 'category-id-here',
        '800',
        '650',
        '400',
        '500',
        '10',
        '100',
        '10',
        '12',
        'HSN6109',
        'Blue',
        'Cotton',
        'India',
        'true'
      ],
      [
        'Premium Jeans',
        'JNS001',
        'High-quality denim jeans with perfect fit',
        categories.length > 1 ? categories[1].id : 'category-id-here',
        '2000',
        '1600',
        '1200',
        '1400',
        '5',
        '50',
        '5',
        '12',
        'HSN6203',
        'Black',
        'Denim',
        'USA',
        'true'
      ]
    ];

    const csvContent = [
      csvHeaders.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_bulk_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded with sample data');
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setBulkUploading(true);
    setUploadProgress({ current: 0, total: 0 });

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast.error('CSV file must contain at least a header and one data row');
        return;
      }

      setUploadProgress({ current: 1, total: 4 }); // Step 1: File read

      // Simple CSV parser that handles quoted fields
      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
      const products = [];
      let skippedRows = 0;

      setUploadProgress({ current: 2, total: 4 }); // Step 2: Parsing

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]).map(v => v.replace(/"/g, '').trim());
        if (values.length !== headers.length) {
          skippedRows++;
          continue;
        }

        const product = {};
        headers.forEach((header, index) => {
          const value = values[index];

          // Convert data types
          if (['mrp', 'selling_price', 'cost_price', 'wholesale_price', 'gst_rate'].includes(header)) {
            product[header] = value && value !== '' ? parseFloat(value) : null;
          } else if (['wholesale_min_qty', 'stock_qty', 'low_stock_threshold'].includes(header)) {
            product[header] = value && value !== '' ? parseInt(value) : (header === 'wholesale_min_qty' ? 10 : header === 'low_stock_threshold' ? 10 : 0);
          } else if (['color', 'material', 'origin'].includes(header)) {
            product[header] = value || null;
          } else if (header === 'is_active') {
            product[header] = value.toLowerCase() === 'true' || value === '1';
          } else {
            product[header] = value || (header === 'gst_rate' ? 18 : null);
          }
        });

        // Validate required fields
        if (product.name && product.sku && product.mrp && product.selling_price && product.cost_price) {
          // Set default values for optional fields
          if (!product.gst_rate) product.gst_rate = 18;
          if (!product.wholesale_min_qty) product.wholesale_min_qty = 10;
          if (!product.low_stock_threshold) product.low_stock_threshold = 10;
          if (product.stock_qty === null) product.stock_qty = 0;
          if (product.is_active === undefined) product.is_active = true;

          products.push(product);
        } else {
          skippedRows++;
        }
      }

      if (products.length === 0) {
        toast.error('No valid products found in CSV file. Please check required fields: name, sku, mrp, selling_price, cost_price');
        return;
      }

      setUploadProgress({ current: 3, total: 4 }); // Step 3: Validation complete

      const response = await productsAPI.bulkUpload(products);

      setUploadProgress({ current: 4, total: 4 }); // Step 4: Upload complete

      let message = `Successfully processed ${products.length} products`;
      if (response.data?.created) message += ` (${response.data.created} created`;
      if (response.data?.updated) message += `, ${response.data.updated} updated)`;
      else if (response.data?.created) message += ')';

      if (skippedRows > 0) {
        message += ` • ${skippedRows} rows skipped due to missing required fields`;
      }

      if (response.data?.errors && response.data.errors.length > 0) {
        message += ` • ${response.data.errors.length} errors occurred`;
        console.warn('Bulk upload errors:', response.data.errors);
      }

      toast.success(message);
      setShowBulkDialog(false);
      fetchData();

      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload products. Please check your CSV format.');
    } finally {
      setBulkUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const [selectedProducts, setSelectedProducts] = useState(new Set());

  const toggleProductSelection = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleToggleStatus = async (productId, currentStatus) => {
    try {
      // Optimistically update UI
      setProducts(products.map(p =>
        p.id === productId ? { ...p, is_active: currentStatus } : p
      ));

      await productsAPI.update(productId, { is_active: currentStatus });
      toast.success(`Product ${currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      // Revert on failure
      setProducts(products.map(p =>
        p.id === productId ? { ...p, is_active: !currentStatus } : p
      ));
      toast.error('Failed to update status');
    }
  };

  const generateCatalog = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Please select products to generate catalog');
      return;
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Config
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 2;

    // --- Cover Page ---
    // Helper to get image data URI
    const getDataUri = async (url) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Failed to load image for PDF:', error);
        return null;
      }
    };

    // --- Cover Page ---
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    const companyName = settings?.business_name || settings?.company_name || "Amorlias Mart";
    doc.text(companyName, pageWidth / 2, 60, { align: "center" });

    // Logo
    if (settings?.logo_url) {
      try {
        const logoUrl = getImageUrl(settings.logo_url);
        const logoDataUri = await getDataUri(logoUrl);

        if (logoDataUri) {
          // Draw logo centered
          // Detect format from Data URI
          let format = 'PNG';
          if (logoDataUri.startsWith('data:image/jpeg')) format = 'JPEG';
          else if (logoDataUri.startsWith('data:image/png')) format = 'PNG';
          else if (logoDataUri.startsWith('data:image/webp')) format = 'WEBP';

          doc.addImage(logoDataUri, format, (pageWidth / 2) - 30, 80, 60, 60, undefined, 'FAST');
        } else {
          throw new Error("Could not load logo data URI");
        }
      } catch (e) {
        // Fallback to circle if image fails
        doc.setDrawColor(0, 150, 255);
        doc.setLineWidth(2);
        doc.circle(pageWidth / 2, 110, 25, 'S');
      }
    } else {
      // Fallback circle
      doc.setDrawColor(0, 150, 255);
      doc.setLineWidth(2);
      doc.circle(pageWidth / 2, 110, 25, 'S');
    }

    doc.setFontSize(16);
    doc.text(companyName, pageWidth / 2, 150, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("wholesale", pageWidth / 2, 155, { align: "center" });

    // Contact Info Box
    doc.setDrawColor(200);
    doc.rect(margin + 20, 180, pageWidth - (margin * 2) - 40, 40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");

    // Dynamic Description/Tagline
    const descLine1 = `Wholesaler of Home And Kitchen & Home`;
    const descLine2 = `Products by ${companyName}, ${settings?.address?.city || 'Surat'}`;

    doc.text(descLine1, pageWidth / 2, 190, { align: "center" });
    doc.text(descLine2, pageWidth / 2, 196, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    // Address components for description
    const city = settings?.address?.city || 'Surat';
    const state = settings?.address?.state || 'Gujarat';

    doc.text("Wholesaler of Home And Kitchen, Home Products &", pageWidth / 2, 204, { align: "center" });
    doc.text(`Household Products from ${city}, ${state}, India`, pageWidth / 2, 209, { align: "center" });

    // Footer Contact
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const phone = settings?.phone || settings?.whatsapp_number || "";
    if (phone) {
      doc.text(`MOBILE - ${phone}`, pageWidth / 2, 240, { align: "center" });
    }

    // Address
    doc.setFontSize(14);
    if (settings?.address) {
      let yPos = 255;
      const { line1, line2, city, state, pincode } = settings.address;

      const addressLines = [
        line1,
        line2,
        city && state ? `${city}, ${state}` : city || state,
        pincode ? `, ${pincode}` : ''
      ].filter(Boolean);

      addressLines.forEach(line => {
        doc.text(line.toUpperCase(), pageWidth / 2, yPos, { align: "center" });
        yPos += 7;
      });
    } else {
      doc.text("DOM NO 7, OPP. SUMAN", pageWidth / 2, 255, { align: "center" });
      doc.text("PRATIK AWAS , NEAR BY", pageWidth / 2, 262, { align: "center" });
      doc.text("RIDDHI GRANITE", pageWidth / 2, 269, { align: "center" });
      doc.text("VRINDAVAN FARM ,", pageWidth / 2, 276, { align: "center" });
      doc.text("HARIDARSHAN NO KHADO", pageWidth / 2, 283, { align: "center" });
      doc.text(", KATARGAM - 395004", pageWidth / 2, 290, { align: "center" });
    }

    // --- Product Pages ---
    doc.addPage();

    const items = products.filter(p => selectedProducts.has(p.id));
    const colCount = 4;
    const itemWidth = (pageWidth - (margin * 2)) / colCount;
    const itemHeight = 68; // Height per product cell - Optimized to fit 4 rows comfortably

    let x = margin;
    let y = margin;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check if we need a new page
      if (y + itemHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        x = margin;
      }

      // Product Container
      // doc.rect(x, y, itemWidth, itemHeight); // Optional border

      // Image
      if (item.images && item.images.length > 0) {
        try {
          const imgUrl = getImageUrl(item.images[0]);
          // Draw image (Adjusted size for smaller cell)
          doc.addImage(imgUrl, 'JPEG', x + 5, y + 2, itemWidth - 10, itemWidth - 10, undefined, 'FAST');
        } catch (e) {
          // Fallback placeholder
          doc.setFillColor(240);
          doc.rect(x + 5, y + 2, itemWidth - 10, itemWidth - 10, 'F');
        }
      } else {
        doc.setFillColor(240);
        doc.rect(x + 5, y + 2, itemWidth - 10, itemWidth - 10, 'F');
      }

      // Text Content
      const textY = y + itemWidth - 5; // Start text after image square - Shifted up

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");

      // Name (Wrap text)
      const nameLines = doc.splitTextToSize(item.name, itemWidth - 4);
      doc.text(nameLines, x + itemWidth / 2, textY + 5, { align: "center" });

      // SKU
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(item.sku, x + itemWidth / 2, textY + 15, { align: "center" });

      // Price
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(200, 0, 200); // Magenta/Purple color
      // Showing Wholesale Price as per request logic, fallback to Selling Price
      const price = item.wholesale_price || item.selling_price;
      doc.text(`${price}/-`, x + itemWidth / 2, textY + 20, { align: "center" });

      doc.setTextColor(0); // Reset color

      // Move to next cell
      x += itemWidth;

      // Check if row is full
      if ((i + 1) % colCount === 0) {
        x = margin;
        y += itemHeight;
      }
    }

    // --- Policy Page ---
    try {
      // Get the current URL to construct absolute path for public folder image
      const origin = window.location.origin;
      const policyParams = await getDataUri(`${origin}/exchange_policy.png`);

      if (policyParams) {
        doc.addPage();
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (imgWidth * 3) / 4; // Assume 4:3 aspect ratio, or fit to page

        // Center vertically on the page
        const yPos = (pageHeight - imgHeight) / 2;

        doc.addImage(policyParams, 'PNG', margin, yPos, imgWidth, imgHeight, undefined, 'FAST');

        // Optional: Title for the policy page
        // doc.setFontSize(20);
        // doc.text("Exchange Policy", pageWidth / 2, margin + 20, { align: "center" });
      }
    } catch (error) {
      console.error("Failed to add policy image", error);
    }

    // Use company name for filename
    const filename = `${(settings?.business_name || "catalog").replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    doc.save(filename);
    toast.success("Catalog downloaded");
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="admin-products">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-slate-400">
            {products.length} products
            {selectedProducts.size > 0 && ` • ${selectedProducts.size} selected`}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedProducts.size > 0 && (
            <Button variant="secondary" onClick={generateCatalog} className="bg-purple-600 hover:bg-purple-700 text-white border-none">
              <Download className="w-4 h-4 mr-2" />
              Download Catalog ({selectedProducts.size})
            </Button>
          )}
          <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="btn-admin">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Bulk Upload Products
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="text-sm text-slate-400">
                  Upload multiple products at once using a CSV file. Follow these steps:
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</div>
                    <div>
                      <p className="font-medium text-sm">Download Template</p>
                      <p className="text-xs text-slate-400">Get the CSV template with sample data and correct format</p>
                      <Button
                        onClick={downloadTemplate}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Template
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Fill Your Data</p>
                      <p className="text-xs text-slate-400">Edit the template with your product information</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">3</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Upload CSV File</p>
                      <p className="text-xs text-slate-400">Select your completed CSV file to upload</p>
                      <div className="mt-2">
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={handleBulkUpload}
                          disabled={bulkUploading}
                          className="input-admin"
                        />
                      </div>
                    </div>
                  </div>

                  {bulkUploading && (
                    <div className="space-y-3 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-blue-300">
                          {uploadProgress.current === 1 && "Reading CSV file..."}
                          {uploadProgress.current === 2 && "Parsing product data..."}
                          {uploadProgress.current === 3 && "Validating products..."}
                          {uploadProgress.current === 4 && "Uploading to server..."}
                        </span>
                      </div>
                      {uploadProgress.total > 0 && (
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-xs text-slate-500 bg-slate-700/20 p-3 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-400 mb-1">Required Fields:</p>
                    <p>name, sku, mrp, selling_price, cost_price</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-400 mb-1">Optional Fields:</p>
                    <p>description, category_id, wholesale_price, wholesale_min_qty, stock_qty, low_stock_threshold, gst_rate, hsn_code, color, material, origin, is_active</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-400 mb-1">Tips:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Use the "View Category IDs" button to get valid category IDs</li>
                      <li>Set is_active to 'true' or 'false'</li>
                      <li>GST rate defaults to 18% if not specified</li>
                      <li>Stock quantity defaults to 0 if not specified</li>
                    </ul>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-admin bg-primary hover:bg-primary/90" data-testid="add-product-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-invisible bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Product Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter product name"
                      className="input-admin"
                      required
                      data-testid="product-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SKU *</Label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                      placeholder="e.g., PRD001"
                      className="input-admin"
                      required
                      disabled={!!editingProduct}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description"
                    className="input-admin min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger className="input-admin">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-slate-800 border-slate-700">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>GST Rate (%)</Label>
                    <Select
                      value={formData.gst_rate}
                      onValueChange={(value) => setFormData({ ...formData, gst_rate: value })}
                    >
                      <SelectTrigger className="input-admin">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                        <SelectItem value="28">28%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="e.g. Red"
                      className="input-admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Material</Label>
                    <Input
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      placeholder="e.g. Cotton"
                      className="input-admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Origin</Label>
                    <Input
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      placeholder="e.g. India"
                      className="input-admin"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>MRP (₹) *</Label>
                    <Input
                      type="number"
                      value={formData.mrp}
                      onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                      placeholder="0"
                      className="input-admin"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Selling Price (₹) *</Label>
                    <Input
                      type="number"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      placeholder="0"
                      className="input-admin"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Price (₹) *</Label>
                    <Input
                      type="number"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      placeholder="0"
                      className="input-admin"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Wholesale Price (₹)</Label>
                    <Input
                      type="number"
                      value={formData.wholesale_price}
                      onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                      placeholder="Optional"
                      className="input-admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Qty for Wholesale</Label>
                    <Input
                      type="number"
                      value={formData.wholesale_min_qty}
                      onChange={(e) => setFormData({ ...formData, wholesale_min_qty: e.target.value })}
                      placeholder="10"
                      className="input-admin"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stock Quantity</Label>
                    <Input
                      type="number"
                      value={formData.stock_qty}
                      onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                      placeholder="0"
                      className="input-admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Low Stock Threshold</Label>
                    <Input
                      type="number"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                      placeholder="10"
                      className="input-admin"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Product Images</Label>
                  <MultipleImageUpload
                    value={formData.images}
                    onChange={(images) => setFormData({ ...formData, images })}
                    folder="products"
                    maxFiles={5}
                    label=""
                    description="Upload product images (max 5 images, 5MB each)"
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
                  <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="save-product-btn">
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 input-admin"
            data-testid="product-search"
          />
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              View Category IDs
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle>Category IDs Reference</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <p className="text-sm text-slate-400 mb-3">Use these IDs in your CSV file:</p>
              {categories.map((category) => (
                <div key={category.id} className="flex justify-between items-center p-2 bg-slate-700/50 rounded text-sm">
                  <span>{category.name}</span>
                  <code className="bg-slate-600 px-2 py-1 rounded text-xs">{category.id}</code>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-slate-500">No categories found. Create categories first.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length}
                    onChange={toggleAllSelection}
                    className="rounded border-slate-600 bg-slate-700 text-primary focus:ring-primary h-4 w-4"
                  />
                </TableHead>
                <TableHead className="text-slate-400">Product</TableHead>
                <TableHead className="text-slate-400">SKU</TableHead>
                <TableHead className="text-slate-400">Price</TableHead>
                <TableHead className="text-slate-400">Stock</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="border-slate-700">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="rounded border-slate-600 bg-slate-700 text-primary focus:ring-primary h-4 w-4"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-lg overflow-hidden">
                          {product.images?.[0] && (
                            <img src={getImageUrl(product.images[0])} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="font-medium truncate max-w-[200px]">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-semibold">₹{product.selling_price}</span>
                        <span className="text-slate-400 text-sm ml-2 line-through">₹{product.mrp}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={product.stock_qty <= product.low_stock_threshold ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}>
                        {product.stock_qty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={product.is_active}
                          onCheckedChange={(checked) => handleToggleStatus(product.id, checked)}
                          className="data-[state=checked]:bg-green-500"
                        />
                        <span className={`text-xs ${product.is_active ? 'text-green-400' : 'text-slate-500'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => generateBarcode(product)}
                          title="Generate Barcode"
                        >
                          <Barcode className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(product)} data-testid={`edit-product-${product.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(product.id)}>
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
