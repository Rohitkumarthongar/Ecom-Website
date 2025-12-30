import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  register: (data) => api.post('/auth/register', data),
  login: (phone, password) => api.post('/auth/login', { phone, password }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/admin/products', data),
  update: (id, data) => api.put(`/admin/products/${id}`, data),
  delete: (id) => api.delete(`/admin/products/${id}`),
  bulkUpload: (products) => api.post('/admin/products/bulk-upload', products),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getOne: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/admin/categories', data),
  update: (id, data) => api.put(`/admin/categories/${id}`, data),
  delete: (id) => api.delete(`/admin/categories/${id}`),
};

// Inventory API
export const inventoryAPI = {
  getAll: (params) => api.get('/admin/inventory', { params }),
  update: (productId, data) => api.put(`/admin/inventory/${productId}`, data),
};

// Orders API
export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  getUserOrders: () => api.get('/orders'),
  getOne: (id) => api.get(`/orders/${id}`),
  getAll: (params) => api.get('/admin/orders', { params }),
  updateStatus: (id, data) => api.put(`/admin/orders/${id}/status`, data),
  getInvoice: (id) => api.get(`/admin/orders/${id}/invoice`, { responseType: 'blob' }),
  getShippingLabel: (id) => api.get(`/admin/orders/${id}/shipping-label`, { responseType: 'blob' }),
  getLabel: (id) => api.get(`/courier/label/${id}`, { responseType: 'blob' }),
  // Cancellation endpoints
  checkCancellationEligibility: (id) => api.get(`/orders/${id}/can-cancel`),
  cancelOrder: (id, data) => api.post(`/orders/${id}/cancel`, data),
  // Return endpoints
  checkReturnEligibility: (id) => api.get(`/orders/${id}/can-return`),
  createReturn: (id, data) => api.post(`/orders/${id}/return`, data),
  getOrderReturns: (id) => api.get(`/orders/${id}/returns`),
};

// POS API
export const posAPI = {
  createSale: (data) => api.post('/admin/pos/sale', data),
  searchCustomer: (phone) => api.get('/admin/pos/search-customer', { params: { phone } }),
};

// Returns API
export const returnsAPI = {
  create: (data) => api.post('/returns', data),
  getAll: (params) => api.get('/admin/returns', { params }),
  getUserReturns: () => api.get('/returns'),
  update: (id, data) => api.put(`/admin/returns/${id}`, data),
  getById: (id) => api.get(`/returns/${id}`),
  uploadEvidence: (id, formData) => api.post(`/returns/${id}/evidence`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  trackReturn: (id) => api.get(`/returns/${id}/tracking`),
};

// Banners API
export const bannersAPI = {
  getAll: () => api.get('/banners'),
  create: (data) => api.post('/admin/banners', data),
  update: (id, data) => api.put(`/admin/banners/${id}`, data),
  delete: (id) => api.delete(`/admin/banners/${id}`),
};

// Offers API
export const offersAPI = {
  getAll: () => api.get('/offers'),
  create: (data) => api.post('/admin/offers', data),
  update: (id, data) => api.put(`/admin/offers/${id}`, data),
  delete: (id) => api.delete(`/admin/offers/${id}`),
};

// Couriers API
export const couriersAPI = {
  getAll: () => api.get('/admin/couriers'),
  create: (data) => api.post('/admin/couriers', data),
  update: (id, data) => api.put(`/admin/couriers/${id}`, data),
  delete: (id) => api.delete(`/admin/couriers/${id}`),
};

// Payment Gateways API
export const paymentGatewaysAPI = {
  getAll: () => api.get('/admin/payment-gateways'),
  create: (data) => api.post('/admin/payment-gateways', data),
  update: (id, data) => api.put(`/admin/payment-gateways/${id}`, data),
  delete: (id) => api.delete(`/admin/payment-gateways/${id}`),
};

// Settings API
export const settingsAPI = {
  get: () => api.get('/admin/settings'),
  update: (data) => api.put('/admin/settings', data),
  getPublic: () => api.get('/settings/public'),
  getEmailSettings: () => api.get('/admin/settings/email'),
  testEmail: (data) => api.post('/admin/settings/email/test', data),
  getSmsSettings: () => api.get('/admin/settings/sms'),
  updateSmsSettings: (data) => api.put('/admin/settings/sms', data),
  updateEmailSettings: (data) => api.put('/admin/settings/email', data),
};

// Reports API
export const reportsAPI = {
  getSales: (params) => api.get('/admin/reports/sales', { params }),
  getInventory: () => api.get('/admin/reports/inventory'),
  getInventoryStatus: () => api.get('/admin/reports/inventory-status'),
  getProfitLoss: (params) => api.get('/admin/reports/profit-loss', { params }),
};

// Courier API
export const courierAPI = {
  checkPincode: (pincode) => api.get('/courier/pincode', { params: { pincode } }),
  validateAddress: (addressData) => api.post('/courier/validate-address', addressData),
  shipOrder: (orderId) => api.post(`/courier/ship/${orderId}`),
  trackOrder: (orderId) => api.get(`/courier/track/${orderId}`),
  trackByAwb: (awb) => api.get(`/courier/track-by-awb/${awb}`),
  getLabel: (orderId) => api.get(`/courier/label/${orderId}`),
  getInvoice: (orderId) => api.get(`/courier/invoice/${orderId}`),
  cancelShipment: (orderId) => api.post(`/courier/cancel/${orderId}`),
  createReturn: (orderId, returnData) => api.post(`/admin/couriers/create-return/${orderId}`, returnData),
  getPicklist: (date) => api.get('/admin/picklist', { params: { date } }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/admin/dashboard'),
  seedData: () => api.post('/admin/seed-data'),
  clearData: () => api.post('/admin/reset-data'),
};

// Pages API
export const pagesAPI = {
  getPrivacyPolicy: () => api.get('/pages/privacy-policy'),
  getTerms: () => api.get('/pages/terms'),
  getReturnPolicy: () => api.get('/pages/return-policy'),
  getContact: () => api.get('/pages/contact'),
  submitContact: (data) => api.post('/contact', data),
  updatePage: (slug, data) => api.put(`/admin/pages/${slug}`, data),
};

// Notifications API
export const notificationsAPI = {
  getUser: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
  getAdmin: () => api.get('/admin/notifications'),
  markAdminRead: (id) => api.put(`/admin/notifications/${id}/read`),
};

// Seller Requests API
export const sellerRequestsAPI = {
  request: (data) => api.post('/auth/request-seller', data),
  getAll: (params) => api.get('/admin/seller-requests', { params }),
  update: (id, data) => api.put(`/admin/seller-requests/${id}`, data),
};

// Customers API
export const customersAPI = {
  getAll: (params) => api.get('/admin/customers', { params }),
  getOne: (id) => api.get(`/admin/customers/${id}`),
  update: (id, data) => api.put(`/admin/customers/${id}`, data),
};

// Pincode API
export const pincodeAPI = {
  verify: (pincode) => api.post('/verify-pincode', { pincode }),
};

// Packing Slip & Labels API
export const printAPI = {
  getPackingSlip: (orderId) => api.get(`/admin/orders/${orderId}/packing-slip`),
  getLabel: (orderId) => api.get(`/admin/orders/${orderId}/label`),
  getBulkLabels: (date) => api.get('/admin/orders/bulk-labels', { params: { date } }),
};

// Payment QR API
export const paymentAPI = {
  getQR: (amount, customerName = 'Customer', orderNumber = '') =>
    api.post('/generate-qr', {
      amount,
      customer_name: customerName,
      order_number: orderNumber
    }),
};

// Product Lookup API
export const productLookupAPI = {
  bySku: (sku) => api.get('/products/lookup', { params: { sku } }),
  byBarcode: (barcode) => api.get('/products/lookup', { params: { barcode } }),
};

// Upload API
export const uploadAPI = {
  uploadImage: (file, folder = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadMultiple: (files, folder = 'general') => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('folder', folder);
    return api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteImage: (fileUrl) => api.delete('/upload/delete', { params: { file_url: fileUrl } }),
};

export default api;
