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
  getInvoice: (id) => api.get(`/admin/orders/${id}/invoice`),
  getLabel: (id) => api.get(`/admin/orders/${id}/label`),
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
  update: (id, data) => api.put(`/admin/returns/${id}`, data),
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
};

// Reports API
export const reportsAPI = {
  getSales: (params) => api.get('/admin/reports/sales', { params }),
  getInventory: () => api.get('/admin/reports/inventory'),
  getProfitLoss: (params) => api.get('/admin/reports/profit-loss', { params }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/admin/dashboard'),
  seedData: () => api.post('/admin/seed-data'),
};

// Pages API
export const pagesAPI = {
  getPrivacyPolicy: () => api.get('/pages/privacy-policy'),
  getContact: () => api.get('/pages/contact'),
  submitContact: (data) => api.post('/contact', data),
  updatePage: (slug, data) => api.put(`/admin/pages/${slug}`, data),
};

export default api;
