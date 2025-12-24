# BharatBazaar (Mesho Replica) - Requirements & Architecture

## Original Problem Statement
Create a replica of Mesho with admin portal and delivery tracking as well as stock maintaining. Features include:
- Online and offline sales (POS)
- Admin can define normal pricing and wholesale price on some minimum qty
- Reports for inventory and products sell and purchase
- Return facility and courier service integration
- Payment gateway linking with PhonePe, Paytm, and other options (placeholder pages)
- Notification system with banners and offers
- Login, logout, registration with OTP system
- GST and non-GST user registration (wholesale prices for GST users)
- Privacy policy, contact us pages
- Product management with bulk upload
- Discounts and admin dashboard
- Dual theme (dark/light)
- Order tracking, invoice generation, label printing

## Architecture Completed

### Backend (FastAPI + MongoDB)
- **Authentication**: JWT-based auth with OTP verification (Twilio placeholder)
- **Users**: GST/Non-GST registration, wholesale pricing eligibility
- **Products**: CRUD, bulk upload, categories, variants
- **Inventory**: Stock tracking, low stock alerts, adjustments
- **Orders**: Online + offline sales, status tracking
- **Returns**: Return requests with refund processing
- **Banners & Offers**: Promotional content management
- **Couriers**: Multiple courier provider configuration
- **Payment Gateways**: PhonePe, Paytm, Razorpay, UPI placeholders
- **Reports**: Sales, inventory, profit/loss analytics
- **Settings**: Business config, GST settings, invoice prefixes

### Frontend (React + TailwindCSS + Shadcn)
#### Store Pages
- Homepage with hero banner, categories, trending products
- Products listing with filters, search, sorting
- Product detail with wholesale pricing display
- Cart with quantity management
- Checkout with multiple payment options
- Order tracking with status timeline
- User orders history
- Privacy Policy & Contact Us

#### Admin Pages
- Dashboard with KPIs, recent orders, low stock alerts
- Products management (add, edit, delete, bulk upload)
- Categories management
- Inventory management with stock adjustments
- Orders management with status updates
- Offline Sales POS system
- Returns management
- Banners management
- Offers & Coupons
- Courier providers configuration
- Payment gateways configuration
- Reports & Analytics (Sales, Inventory, P&L)
- Settings (Business, GST, Invoice)
- Static pages editor

### Key Features Implemented
- ✅ Dual theme (Light for store, Dark for admin)
- ✅ GST/Non-GST user types with wholesale pricing
- ✅ OTP-based registration (Twilio placeholder)
- ✅ Multiple payment gateway placeholders
- ✅ Multiple courier provider support
- ✅ Invoice & Label generation endpoints
- ✅ Comprehensive reports
- ✅ Sample data seeding

## Admin Credentials
- Phone: 9999999999
- Password: admin123

## Next Action Items
1. Integrate real Twilio SMS for OTP
2. Implement actual payment gateway integrations when keys are provided
3. Connect to real courier APIs (Shiprocket, Delhivery)
4. Add GST API verification
5. Implement email notifications
6. Add product image upload (currently URL-based)
7. Implement actual invoice PDF generation
8. Add shipping label barcode generation
