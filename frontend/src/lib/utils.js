// Utility functions
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine class names with Tailwind CSS merge
 * @param {...any} inputs - Class names to combine
 * @returns {string} - Combined class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Get full image URL by prepending backend URL to relative paths
 * @param {string} imageUrl - The image URL (can be relative or absolute)
 * @returns {string} - Full image URL
 */
export function getImageUrl(imageUrl) {
  if (!imageUrl) return '';
  
  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's a relative URL starting with /uploads, prepend backend URL
  if (imageUrl.startsWith('/uploads/')) {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    return `${backendUrl}${imageUrl}`;
  }
  
  // If it's just a filename or other relative path, assume it's in uploads
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
  return `${backendUrl}/uploads/general/${imageUrl}`;
}

/**
 * Format currency value
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted date string
 */
export function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Format date and time
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted date and time string
 */
export function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Truncate text to specified length
 * @param {string} text - The text to truncate
 * @param {number} length - Maximum length
 * @returns {string} - Truncated text
 */
export function truncateText(text, length = 100) {
  if (!text || text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Generate a random ID
 * @returns {string} - Random ID
 */
export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check if a string is a valid email
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether email is valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a string is a valid phone number (Indian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Whether phone number is valid
 */
export function isValidPhone(phone) {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} - Initials
 */
export function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
}

/**
 * Calculate discount percentage
 * @param {number} mrp - Maximum Retail Price
 * @param {number} sellingPrice - Selling Price
 * @returns {number} - Discount percentage
 */
export function calculateDiscount(mrp, sellingPrice) {
  if (!mrp || !sellingPrice || mrp <= sellingPrice) return 0;
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

/**
 * Get status color class
 * @param {string} status - Status string
 * @returns {string} - CSS class for status color
 */
export function getStatusColor(status) {
  const statusColors = {
    active: 'text-green-500',
    inactive: 'text-gray-500',
    pending: 'text-yellow-500',
    approved: 'text-green-500',
    rejected: 'text-red-500',
    processing: 'text-blue-500',
    shipped: 'text-purple-500',
    delivered: 'text-green-500',
    cancelled: 'text-red-500',
    returned: 'text-orange-500',
  };
  
  return statusColors[status?.toLowerCase()] || 'text-gray-500';
}